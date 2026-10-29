import {
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
  app,
  dialog,
  ipcMain,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { constants } from 'fs';
import fs from 'fs-extra';
import path from 'path';
import { SelectFileOptions, SelectFileReturn } from 'utils/types';
import databaseManager from '../backend/database/manager';
import { emitMainProcessError } from '../backend/helpers';
import { Main } from '../main';
import { DatabaseMethod } from '../utils/db/types';
import { IPC_ACTIONS } from '../utils/messages';
import { getUrlAndTokenString, sendError } from './contactMothership';
import { getLanguageMap } from './getLanguageMap';
import { getTemplates } from './getPrintTemplates';
import { printHtmlDocument } from './printHtmlDocument';
import {
  getConfigFilesWithModified,
  getErrorHandledReponse,
  isNetworkError,
  setAndGetCleanedConfigFiles,
} from './helpers';
import { saveHtmlAsPdf } from './saveHtmlAsPdf';
import { sendAPIRequest } from './api';
import { initScheduler } from './initSheduler';
import {
  assertExistingDatabase,
  getDatabaseDirectory,
  pathsReferToSameLocation,
} from './databaseFiles';
import {
  createDailyBackupWithRetention,
  createUserBackup,
  createVerifiedSnapshot,
  getDatabaseIdentity,
  inspectDatabase,
} from '../backend/database/backup';
import { promises as nodeFs } from 'fs';
import type { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import config from 'utils/config';
import { summarizePartyControlLedger } from './partyStatement';
import { getImportReconciliation } from './importReconciliation';

const selectedBackupPaths = new Map<
  string,
  {
    path: string;
    companyName: string;
    countryCode: string;
    targetDbPath: string;
  }
>();
const approvedSavePaths = new Map<string, Set<string>>();
const approvedCreatePaths = new Set<string>();
const backupConfig = config as unknown as {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
};
let restoreInProgress = false;
let activeDatabaseCalls = 0;
let dailyBackupInProgress = false;

function assertNoRestoreInProgress() {
  if (restoreInProgress) throw new Error('DatabaseRestoreInProgress');
}
function assertTrustedRenderer(event: Electron.IpcMainInvokeEvent, main: Main) {
  const url = event.senderFrame?.url ?? '';
  const frame = event.senderFrame;
  const trustedUrl =
    url.startsWith('app://') ||
    (process.env.NODE_ENV === 'development' &&
      /^https?:\/\/(localhost|127\.0\.0\.1):/.test(url));
  if (
    event.sender !== main.mainWindow?.webContents ||
    frame !== main.mainWindow?.webContents.mainFrame ||
    !trustedUrl
  ) {
    throw new Error('UntrustedIpcSender');
  }
}

function consumeApprovedSavePath(savePath: string) {
  if (typeof savePath !== 'string' || !path.isAbsolute(savePath))
    throw new Error('InvalidSavePath');
  const resolved = path.resolve(savePath);
  const grant = approvedSavePaths.get(resolved);
  if (!grant) return false;
  for (const candidate of grant) {
    approvedSavePaths.delete(candidate);
    approvedCreatePaths.delete(candidate);
  }
  return true;
}

function consumeApprovedCreatePath(dbPath: string) {
  const resolved = path.resolve(dbPath);
  const saveGrant = approvedSavePaths.get(resolved);
  if (saveGrant) {
    for (const candidate of saveGrant) {
      approvedSavePaths.delete(candidate);
      approvedCreatePaths.delete(candidate);
    }
    return true;
  }
  return approvedCreatePaths.delete(resolved);
}

async function assertNotCompanyDatabasePath(filePath: string) {
  if (
    databaseManager.db?.dbPath &&
    (await pathsReferToSameLocation(filePath, databaseManager.db.dbPath))
  ) {
    throw new Error('CannotOverwriteOpenDatabase');
  }
  const configured = await setAndGetCleanedConfigFiles();
  for (const file of configured) {
    if (await pathsReferToSameLocation(filePath, file.dbPath)) {
      throw new Error('CannotOverwriteCompanyDatabase');
    }
  }
}

async function ensureDailyBackups(dbPath: string) {
  if (dailyBackupInProgress || restoreInProgress || dbPath === ':memory:')
    return;
  dailyBackupInProgress = true;
  try {
    const localFolder = path.join(path.dirname(dbPath), 'backups');
    await fs.ensureDir(localFolder);
    const prefix = `${path.parse(dbPath).name.replace(/\.books$/, '')}_daily_`;
    const createIfDue = async (folder: string) => {
      const files = (await fs.readdir(folder).catch(() => [])).filter(
        (name) => name.startsWith(prefix) && name.endsWith('.books.db')
      );
      const records = await Promise.all(
        files.map(async (name) => ({
          name,
          mtime: (await fs.stat(path.join(folder, name))).mtimeMs,
        }))
      );
      records.sort((a, b) => b.mtime - a.mtime);
      if (
        !records.length ||
        Date.now() - records[0].mtime >= 24 * 60 * 60 * 1000
      ) {
        await createDailyBackupWithRetention(dbPath, folder);
      }
    };
    await createIfDue(localFolder);
    const external = backupConfig.get('dataToolsBackupFolder');
    if (
      typeof external === 'string' &&
      path.resolve(external) !== path.resolve(localFolder)
    ) {
      const stat = await fs.stat(external);
      if (!stat.isDirectory())
        throw new Error('ConfiguredBackupFolderUnavailable');
      await fs.access(external, constants.W_OK | constants.R_OK);
      await createIfDue(external);
    }
  } finally {
    dailyBackupInProgress = false;
  }
}

export default function registerIpcMainActionListeners(main: Main) {
  const dailyBackupTimer = setInterval(() => {
    const dbPath = databaseManager.db?.dbPath;
    if (dbPath && dbPath !== ':memory:' && !restoreInProgress) {
      void ensureDailyBackups(dbPath).catch((error) =>
        emitMainProcessError(error)
      );
    }
  }, 60 * 60 * 1000);
  dailyBackupTimer.unref?.();

  ipcMain.handle(IPC_ACTIONS.DATA_TOOLS_BACKUPS, async (event) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    const dbPath = databaseManager.db?.dbPath;
    if (!dbPath || dbPath === ':memory:') throw new Error('NoCompanyDatabase');
    const folder = path.join(path.dirname(dbPath), 'backups');
    let backupNotice: string | null = null;
    try {
      await ensureDailyBackups(dbPath);
    } catch (error) {
      backupNotice = (error as Error).message;
    }
    const prefix = `${path.parse(dbPath).name.replace(/\.books$/, '')}_`;
    const refreshed = (await fs.readdir(folder)).filter(
      (name) => name.startsWith(prefix) && name.endsWith('.books.db')
    );
    const list = await Promise.all(
      refreshed.map(async (name) => {
        const fullPath = path.join(folder, name);
        const stat = await fs.stat(fullPath);
        let verified = false;
        try {
          verified = (await inspectDatabase(fullPath)).valid;
        } catch {}
        return {
          name,
          path: fullPath,
          modified: stat.mtime.toISOString(),
          size: stat.size,
          verified,
        };
      })
    );
    return {
      backups: list
        .sort((a, b) => b.modified.localeCompare(a.modified))
        .map(({ name, modified, size, verified }) => ({
          name,
          modified,
          size,
          verified,
        })),
      externalFolder: backupConfig.get('dataToolsBackupFolder') ?? null,
      backupNotice,
    };
  });

  ipcMain.handle(
    IPC_ACTIONS.DATA_TOOLS_CREATE_BACKUP,
    async (event, useOtherFolder: boolean) => {
      assertTrustedRenderer(event, main);
      assertNoRestoreInProgress();
      if (typeof useOtherFolder !== 'boolean')
        throw new Error('InvalidArguments');
      const dbPath = databaseManager.db?.dbPath;
      if (!dbPath || dbPath === ':memory:')
        throw new Error('NoCompanyDatabase');
      let folder = path.join(path.dirname(dbPath), 'backups');
      if (useOtherFolder) {
        const picked = await dialog.showOpenDialog(main.mainWindow!, {
          properties: ['openDirectory', 'createDirectory'],
        });
        if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
        folder = picked.filePaths[0];
      }
      activeDatabaseCalls++;
      try {
        const backupPath = await createUserBackup(dbPath, folder);
        return {
          canceled: false,
          name: path.basename(backupPath),
          modified: (await fs.stat(backupPath)).mtime.toISOString(),
        };
      } finally {
        activeDatabaseCalls--;
      }
    }
  );

  ipcMain.handle(IPC_ACTIONS.DATA_TOOLS_SET_BACKUP_FOLDER, async (event) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    const picked = await dialog.showOpenDialog(main.mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const folder = path.resolve(picked.filePaths[0]);
    await fs.ensureDir(folder);
    backupConfig.set('dataToolsBackupFolder', folder);
    return folder;
  });

  ipcMain.handle(IPC_ACTIONS.DATA_TOOLS_SELECT_BACKUP, async (event) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    const picked = await dialog.showOpenDialog(main.mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Nivo backup', extensions: ['db'] }],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const filePath = path.resolve(picked.filePaths[0]);
    const check = await inspectDatabase(filePath);
    const activePath = databaseManager.db?.dbPath;
    if (!activePath || (await pathsReferToSameLocation(activePath, filePath)))
      throw new Error('CannotRestoreActiveDatabaseFile');
    const identity = await getDatabaseIdentity(filePath);
    const activeIdentity = await getDatabaseIdentity(activePath);
    const companyMatches =
      !!identity.companyName &&
      identity.companyName === activeIdentity.companyName;
    const countryMatches =
      !!identity.countryCode &&
      identity.countryCode === activeIdentity.countryCode;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (companyMatches && countryMatches)
      selectedBackupPaths.set(token, {
        path: filePath,
        companyName: identity.companyName!,
        countryCode: identity.countryCode!,
        targetDbPath: path.resolve(activePath),
      });
    return {
      token: companyMatches && countryMatches ? token : '',
      name: path.basename(filePath),
      size: (await fs.stat(filePath)).size,
      ...check,
      companyName: identity.companyName,
      countryCode: identity.countryCode,
      currentCompanyName: activeIdentity.companyName,
      currentCountryCode: activeIdentity.countryCode,
      companyMatches,
      countryMatches,
    };
  });

  ipcMain.handle(
    IPC_ACTIONS.DATA_TOOLS_RESTORE,
    async (event, token: string) => {
      assertTrustedRenderer(event, main);
      if (restoreInProgress) throw new Error('DatabaseRestoreInProgress');
      if (activeDatabaseCalls || dailyBackupInProgress)
        throw new Error('DatabaseBusyTryAgain');
      restoreInProgress = true;
      try {
        if (typeof token !== 'string' || !selectedBackupPaths.has(token))
          throw new Error('BackupNotApproved');
        const approved = selectedBackupPaths.get(token)!;
        const sourcePath = approved.path;
        selectedBackupPaths.delete(token);
        const dbPath = databaseManager.db?.dbPath;
        if (!dbPath || dbPath === ':memory:')
          throw new Error('NoCompanyDatabase');
        if (path.resolve(dbPath) !== approved.targetDbPath)
          throw new Error('RestoreTargetDatabaseChanged');
        const [currentIdentity, sourceIdentity] = await Promise.all([
          getDatabaseIdentity(dbPath),
          getDatabaseIdentity(sourcePath),
        ]);
        if (
          currentIdentity.companyName !== approved.companyName ||
          currentIdentity.countryCode !== approved.countryCode ||
          sourceIdentity.companyName !== approved.companyName ||
          sourceIdentity.countryCode !== approved.countryCode
        )
          throw new Error('RestoreCompanyMismatch');
        const preview = await inspectDatabase(sourcePath);
        if (!preview.valid) throw new Error('InvalidRestoreBackup');
        const snapshotPath = await createUserBackup(
          dbPath,
          path.join(path.dirname(dbPath), 'backups')
        );
        const replacementPath = `${dbPath}.restore-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        await createVerifiedSnapshot(sourcePath, replacementPath);
        if (!(await inspectDatabase(replacementPath)).valid)
          throw new Error('InvalidRestoreBackup');
        const countryRow = (await databaseManager.db
          ?.knex?.('SingleValue')
          .select('value')
          .where({ fieldname: 'countryCode', parent: 'SystemSettings' })
          .first()) as { value?: string } | undefined;
        const countryCode = countryRow?.value;
        await databaseManager.db?.knex?.raw('PRAGMA wal_checkpoint(FULL)');
        await databaseManager.call('close');
        const displacedPath = `${dbPath}.pre-restore-${Date.now()}`;
        let previousDbRestored = false;
        try {
          await nodeFs.rename(dbPath, displacedPath);
          await fs.remove(`${dbPath}-wal`);
          await fs.remove(`${dbPath}-shm`);
          await nodeFs.rename(replacementPath, dbPath);
          await databaseManager.connectToDatabase(dbPath, countryCode);
          if (!(await inspectDatabase(dbPath)).valid)
            throw new Error('RestoredDatabaseIntegrityFailed');
          await fs.remove(displacedPath);
          previousDbRestored = true;
          setTimeout(() => main.mainWindow?.webContents.reload(), 100);
          return { restored: true, snapshot: path.basename(snapshotPath) };
        } catch (error) {
          await databaseManager.call('close').catch(() => undefined);
          await fs.remove(dbPath);
          if (await fs.pathExists(displacedPath))
            await nodeFs.rename(displacedPath, dbPath);
          else await nodeFs.copyFile(snapshotPath, dbPath);
          await databaseManager.connectToDatabase(dbPath, countryCode);
          previousDbRestored = true;
          throw error;
        } finally {
          await fs.remove(replacementPath);
          if (previousDbRestored) await fs.remove(displacedPath);
        }
      } finally {
        restoreInProgress = false;
      }
    }
  );

  ipcMain.handle(IPC_ACTIONS.DATA_TOOLS_IMPORT_HEALTH, async (event) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    const knex = databaseManager.db?.knex;
    if (!knex) throw new Error('NoCompanyDatabase');
    const payments = await knex('Payment')
      .select(
        'name',
        'party',
        'paymentType',
        'amount',
        'writeoff',
        'cancelled',
        'submitted'
      )
      .where({ cancelled: false, submitted: true });
    const allocations = await knex('PaymentFor as allocation')
      .join('Payment as payment', 'payment.name', 'allocation.parent')
      .select('allocation.parent', 'allocation.amount')
      .where({ 'payment.submitted': true, 'payment.cancelled': false });
    const allocated = new Map<string, number>();
    for (const row of allocations as { parent: string; amount: number }[])
      allocated.set(
        row.parent,
        (allocated.get(row.parent) ?? 0) + Number(row.amount || 0)
      );
    const unallocated = (
      payments as {
        name: string;
        party: string;
        paymentType: string;
        amount: number;
        writeoff: number;
        cancelled: boolean;
      }[]
    )
      .map((payment) => ({
        ...payment,
        amountPaid: Number(payment.amount ?? 0) - Number(payment.writeoff ?? 0),
        unallocated: Math.max(
          0,
          Number(payment.amount ?? 0) -
            Number(payment.writeoff ?? 0) -
            (allocated.get(payment.name) ?? 0)
        ),
      }))
      .filter(
        (payment) =>
          payment.paymentType === 'Receive' && payment.unallocated > 0.005
      );
    const invoices: Record<string, unknown>[] = [];
    for (const table of ['SalesInvoice', 'PurchaseInvoice']) {
      const rows = await knex(table)
        .select(
          'name',
          'party',
          'date',
          'grandTotal',
          'outstandingAmount',
          'cancelled',
          'submitted'
        )
        .where({ cancelled: false, submitted: true });
      invoices.push(
        ...(rows as Record<string, unknown>[]).map((row) => ({
          ...row,
          type: table,
        }))
      );
    }
    const parties = await knex('Party').select('name', 'role');
    const ledgerRows = await knex('AccountingLedgerEntry as ledger')
      .join('Account as account', 'account.name', 'ledger.account')
      .select(
        'ledger.name',
        'ledger.party',
        'ledger.date',
        'ledger.account',
        'account.accountType',
        'ledger.debit',
        'ledger.credit',
        'ledger.referenceType',
        'ledger.referenceName',
        'ledger.reverted'
      )
      .whereNotNull('ledger.party')
      .whereIn('account.accountType', ['Receivable', 'Payable'])
      .orderBy('ledger.date', 'asc');
    const groupedStatements = summarizePartyControlLedger(
      ledgerRows as import('./partyStatement').PartyControlEntry[]
    );
    const statementMap = new Map(
      groupedStatements.map((statement) => [statement.party, statement])
    );
    const statements = (parties as { name: string; role: string }[]).map(
      (party) => ({
        ...(statementMap.get(party.name) ?? {
          party: party.name,
          entries: [],
          debit: 0,
          credit: 0,
          closingNet: 0,
        }),
        role: party.role,
        openingBalance: null,
      })
    );
    const schemaNames = await knex('sqlite_master')
      .select('name')
      .where({ type: 'table' })
      .andWhereRaw("(name LIKE '%Archive%' OR name LIKE '%Karbar%')");
    const reconciliation = await getImportReconciliation(knex);
    return {
      paymentCount: payments.length,
      allocatedPaymentCount: allocations.length,
      unallocated,
      invoices,
      parties,
      statements,
      sourceArchiveTables: (schemaNames as { name: string }[]).map(
        ({ name }) => name
      ),
      reconciliation,
      note: 'Native SQLite health only. Posted party-ledger openings remain unknown when no opening journal entry exists.',
    };
  });

  ipcMain.handle(IPC_ACTIONS.DATA_TOOLS_HISTORY, async (event) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    const knex = databaseManager.db?.knex;
    if (!knex) throw new Error('NoCompanyDatabase');
    const entries: Record<string, unknown>[] = [];
    // Some existing companies predate newer doctypes. Only query tables that
    // are present so opening Data Tools remains safe across schema versions.
    const availableTables = new Set(
      (
        (await knex('sqlite_master')
          .select('name')
          .where({ type: 'table' })) as { name: string }[]
      ).map(({ name }) => name)
    );
    for (const table of [
      'SalesInvoice',
      'PurchaseInvoice',
      'Payment',
      'Expense',
      'SalaryPayment',
    ]) {
      if (!availableTables.has(table)) continue;
      const rows = await knex(table)
        .select('name', 'date', 'modified', 'modifiedBy', 'cancelled')
        .orderBy('modified', 'desc')
        .limit(100);
      entries.push(
        ...(rows as Record<string, unknown>[]).map((row) => ({
          ...row,
          type: table,
        }))
      );
    }
    return entries
      .sort((a, b) =>
        String(b.modified ?? '').localeCompare(String(a.modified ?? ''))
      )
      .slice(0, 150);
  });

  ipcMain.handle(IPC_ACTIONS.CHECK_DB_ACCESS, async (_, filePath: string) => {
    try {
      await fs.access(filePath, constants.W_OK | constants.R_OK);
    } catch (err) {
      return false;
    }

    return true;
  });

  ipcMain.handle(
    IPC_ACTIONS.GET_DB_DEFAULT_PATH,
    async (event, companyName: string) => {
      assertTrustedRenderer(event, main);
      if (
        typeof companyName !== 'string' ||
        !companyName.trim() ||
        path.basename(companyName) !== companyName ||
        /[\\/\0]/.test(companyName)
      )
        throw new Error('InvalidCompanyName');
      const dbsPath = main.isDevelopment
        ? path.resolve('dbs')
        : getDatabaseDirectory(
            process.platform,
            app.getPath('home'),
            app.getPath('userData'),
            process.env.XDG_DATA_HOME
          );
      const backupPath = path.join(dbsPath, 'backups');
      await fs.ensureDir(backupPath);

      let dbFilePath = path.join(dbsPath, `${companyName}.books.db`);

      if (await fs.pathExists(dbFilePath)) {
        if (
          databaseManager.db?.dbPath &&
          (await pathsReferToSameLocation(
            databaseManager.db.dbPath,
            dbFilePath
          ))
        ) {
          const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
          dbFilePath = path.join(
            dbsPath,
            `${companyName}_${timestamp}.books.db`
          );
        } else {
          const option = await dialog.showMessageBox({
            type: 'question',
            title: 'File Exists',
            message: `Filename already exists. Do you want to overwrite the existing file or create a new one?`,
            buttons: ['Overwrite', 'New'],
          });

          if (option.response === 1) {
            const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');

            dbFilePath = path.join(
              dbsPath,
              `${companyName}_${timestamp}.books.db`
            );

            await dialog.showMessageBox({
              type: 'info',
              message: `New file: ${path.basename(dbFilePath)}`,
            });
          }
        }
      }

      approvedCreatePaths.add(path.resolve(dbFilePath));
      return dbFilePath;
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.GET_OPEN_FILEPATH,
    async (_, options: OpenDialogOptions) => {
      return await dialog.showOpenDialog(main.mainWindow!, options);
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.GET_SAVE_FILEPATH,
    async (event, options: SaveDialogOptions) => {
      assertTrustedRenderer(event, main);
      if (
        !options ||
        typeof options !== 'object' ||
        (options.defaultPath !== undefined &&
          typeof options.defaultPath !== 'string') ||
        (options.title !== undefined && typeof options.title !== 'string') ||
        (options.filters !== undefined && !Array.isArray(options.filters))
      )
        throw new Error('InvalidSaveDialogOptions');
      const result = await dialog.showSaveDialog(main.mainWindow!, options);
      if (!result.canceled && result.filePath) {
        const selected = path.resolve(result.filePath);
        const grant = new Set<string>([selected]);
        // getSavePath appends the selected extension when a user omits it.
        const ext = path.extname(options.defaultPath ?? '');
        if (ext && !selected.endsWith(ext))
          grant.add(path.resolve(`${selected}${ext}`));
        for (const candidate of grant) approvedSavePaths.set(candidate, grant);
        if (ext.toLowerCase() === '.db')
          for (const candidate of grant) approvedCreatePaths.add(candidate);
      }
      return result;
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.GET_DIALOG_RESPONSE,
    async (_, options: MessageBoxOptions) => {
      if (main.isDevelopment || main.isLinux) {
        Object.assign(options, { icon: main.icon });
      }

      return await dialog.showMessageBox(main.mainWindow!, options);
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.SHOW_ERROR,
    (_, { title, content }: { title: string; content: string }) => {
      return dialog.showErrorBox(title, content);
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.SAVE_HTML_AS_PDF,
    async (
      event,
      html: string,
      savePath: string,
      width: number,
      height: number
    ) => {
      assertTrustedRenderer(event, main);
      if (!consumeApprovedSavePath(savePath))
        throw new Error('SavePathNotApproved');
      await assertNotCompanyDatabasePath(savePath);
      if (
        typeof html !== 'string' ||
        html.length > 50_000_000 ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        width > 20_000 ||
        height > 20_000
      )
        throw new Error('InvalidPdfArguments');
      return await saveHtmlAsPdf(html, savePath, app, width, height);
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.PRINT_HTML_DOCUMENT,
    async (event, html: string, width: number, height: number) => {
      assertTrustedRenderer(event, main);
      if (
        typeof html !== 'string' ||
        html.length > 50_000_000 ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        width > 20_000 ||
        height > 20_000
      )
        throw new Error('InvalidPrintArguments');
      return await printHtmlDocument(html, app, width, height);
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.SAVE_DATA,
    async (event, data: string, savePath: string) => {
      assertTrustedRenderer(event, main);
      if (!consumeApprovedSavePath(savePath))
        throw new Error('SavePathNotApproved');
      await assertNotCompanyDatabasePath(savePath);
      if (typeof data !== 'string' || data.length > 200_000_000)
        throw new Error('InvalidSaveData');
      return await fs.writeFile(savePath, data, { encoding: 'utf-8' });
    }
  );

  ipcMain.handle(IPC_ACTIONS.SEND_ERROR, async (_, bodyJson: string) => {
    await sendError(bodyJson, main);
  });

  ipcMain.handle(IPC_ACTIONS.CHECK_FOR_UPDATES, async () => {
    if (!main.updatesEnabled || main.isDevelopment || main.checkedForUpdate) {
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      if (isNetworkError(error as Error)) {
        return;
      }

      emitMainProcessError(error);
    }
    main.checkedForUpdate = true;
  });

  ipcMain.handle(IPC_ACTIONS.GET_LANGUAGE_MAP, async (_, code: string) => {
    const obj = { languageMap: {}, success: true, message: '' };
    try {
      obj.languageMap = await getLanguageMap(code);
    } catch (err) {
      obj.success = false;
      obj.message = (err as Error).message;
    }

    return obj;
  });

  ipcMain.handle(
    IPC_ACTIONS.SELECT_FILE,
    async (_, options: SelectFileOptions): Promise<SelectFileReturn> => {
      const response: SelectFileReturn = {
        name: '',
        filePath: '',
        success: false,
        data: Buffer.from('', 'utf-8'),
        canceled: false,
      };
      const { filePaths, canceled } = await dialog.showOpenDialog(
        main.mainWindow!,
        { ...options, properties: ['openFile'] }
      );

      response.filePath = filePaths?.[0];
      response.canceled = canceled;

      if (!response.filePath) {
        return response;
      }

      response.success = true;
      if (canceled) {
        return response;
      }

      response.name = path.basename(response.filePath);
      response.data = await fs.readFile(response.filePath);
      return response;
    }
  );

  ipcMain.handle(IPC_ACTIONS.GET_CREDS, () => {
    return getUrlAndTokenString();
  });

  ipcMain.handle(IPC_ACTIONS.DELETE_FILE, async (event, filePath: string) => {
    assertTrustedRenderer(event, main);
    assertNoRestoreInProgress();
    activeDatabaseCalls++;
    try {
      return getErrorHandledReponse(async () => {
        if (typeof filePath !== 'string' || !path.isAbsolute(filePath))
          throw new Error('InvalidDatabasePath');
        const resolved = path.resolve(filePath);
        const configured = await setAndGetCleanedConfigFiles();
        if (!configured.some((file) => path.resolve(file.dbPath) === resolved))
          throw new Error('DatabaseNotRegistered');
        if (
          databaseManager.db?.dbPath &&
          (await pathsReferToSameLocation(databaseManager.db.dbPath, resolved))
        )
          throw new Error('CannotDeleteOpenDatabase');
        const answer = await dialog.showMessageBox(main.mainWindow!, {
          type: 'warning',
          title: 'Delete company database?',
          message:
            'Delete this registered company database? A verified backup will be created first.',
          detail: resolved,
          buttons: ['Cancel', 'Back up and delete'],
          defaultId: 0,
          cancelId: 0,
        });
        if (answer.response !== 1) return false;
        await createUserBackup(
          resolved,
          path.join(path.dirname(resolved), 'backups')
        );
        await fs.unlink(resolved);
        return true;
      });
    } finally {
      activeDatabaseCalls--;
    }
  });

  ipcMain.handle(IPC_ACTIONS.GET_DB_LIST, async () => {
    const files = await setAndGetCleanedConfigFiles();
    return await getConfigFilesWithModified(files);
  });

  ipcMain.handle(IPC_ACTIONS.GET_ENV, async () => {
    let version = app.getVersion();
    if (main.isDevelopment) {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      version = (JSON.parse(packageJson) as { version: string }).version;
    }

    return {
      isDevelopment: main.isDevelopment,
      platform: process.platform,
      version,
    };
  });

  ipcMain.handle(
    IPC_ACTIONS.GET_TEMPLATES,
    async (_, posPrintWidth?: number) => {
      return getTemplates(posPrintWidth);
    }
  );

  ipcMain.handle(IPC_ACTIONS.INIT_SHEDULER, async (_, interval: string) => {
    return initScheduler(interval);
  });

  ipcMain.handle(
    IPC_ACTIONS.SEND_API_REQUEST,
    async (e, endpoint: string, options: NodeFetchRequestInit | undefined) => {
      return sendAPIRequest(endpoint, options);
    }
  );

  /**
   * Database Related Actions
   */

  ipcMain.handle(
    IPC_ACTIONS.DB_CREATE,
    async (event, dbPath: string, countryCode: string) => {
      assertTrustedRenderer(event, main);
      assertNoRestoreInProgress();
      activeDatabaseCalls++;
      try {
        return await getErrorHandledReponse(async () => {
          if (typeof dbPath !== 'string' || !path.isAbsolute(dbPath))
            throw new Error('DatabaseCreatePathNotApproved');
          if (!consumeApprovedCreatePath(dbPath))
            throw new Error('DatabaseCreatePathNotApproved');
          if (
            databaseManager.db?.dbPath &&
            (await pathsReferToSameLocation(databaseManager.db.dbPath, dbPath))
          )
            throw new Error('CannotOverwriteOpenDatabase');
          if (
            typeof countryCode !== 'string' ||
            !/^[a-z]{2}$/i.test(countryCode)
          )
            throw new Error('InvalidCountryCode');
          if (await fs.pathExists(dbPath))
            await createUserBackup(
              dbPath,
              path.join(path.dirname(dbPath), 'backups')
            );
          return await databaseManager.createNewDatabase(dbPath, countryCode);
        });
      } finally {
        activeDatabaseCalls--;
      }
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.DB_CONNECT,
    async (event, dbPath: string, countryCode?: string) => {
      assertTrustedRenderer(event, main);
      assertNoRestoreInProgress();
      activeDatabaseCalls++;
      try {
        return await getErrorHandledReponse(async () => {
          if (
            typeof dbPath !== 'string' ||
            !path.isAbsolute(dbPath) ||
            (countryCode !== undefined &&
              (typeof countryCode !== 'string' ||
                !/^[a-z]{2}$/i.test(countryCode)))
          )
            throw new Error('InvalidDatabaseConnectionArguments');
          await assertExistingDatabase(dbPath);
          const connected = await databaseManager.connectToDatabase(
            dbPath,
            countryCode
          );
          try {
            await ensureDailyBackups(dbPath);
          } catch (error) {
            emitMainProcessError(error);
          }
          return connected;
        });
      } finally {
        activeDatabaseCalls--;
      }
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.DB_CALL,
    async (event, method: DatabaseMethod, ...args: unknown[]) => {
      assertTrustedRenderer(event, main);
      assertNoRestoreInProgress();
      if (typeof method !== 'string' || args.length > 20)
        throw new Error('InvalidDatabaseCall');
      activeDatabaseCalls++;
      try {
        return await getErrorHandledReponse(async () => {
          return await databaseManager.call(method, ...args);
        });
      } finally {
        activeDatabaseCalls--;
      }
    }
  );

  ipcMain.handle(
    IPC_ACTIONS.DB_BESPOKE,
    async (event, method: string, ...args: unknown[]) => {
      assertTrustedRenderer(event, main);
      assertNoRestoreInProgress();
      if (typeof method !== 'string' || args.length > 20)
        throw new Error('InvalidDatabaseCall');
      activeDatabaseCalls++;
      try {
        return await getErrorHandledReponse(async () => {
          return await databaseManager.callBespoke(method, ...args);
        });
      } finally {
        activeDatabaseCalls--;
      }
    }
  );

  ipcMain.handle(IPC_ACTIONS.DB_SCHEMA, async () => {
    return await getErrorHandledReponse(() => {
      return databaseManager.getSchemaMap();
    });
  });
}
