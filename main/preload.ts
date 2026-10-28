import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron';
import { contextBridge, ipcRenderer } from 'electron';
import type { ConfigMap } from 'fyo/core/types';
import config from 'utils/config';
import type { DatabaseMethod } from 'utils/db/types';
import type { BackendResponse } from 'utils/ipc/types';
import { IPC_ACTIONS, IPC_CHANNELS, IPC_MESSAGES } from 'utils/messages';
import type {
  ConfigFilesWithModified,
  Creds,
  LanguageMap,
  SelectFileOptions,
  SelectFileReturn,
  TemplateFile,
} from 'utils/types';

type IPCRendererListener = Parameters<typeof ipcRenderer.on>[1];
const ipc = {
  desktop: true,

  reloadWindow() {
    return ipcRenderer.send(IPC_MESSAGES.RELOAD_MAIN_WINDOW);
  },

  minimizeWindow() {
    return ipcRenderer.send(IPC_MESSAGES.MINIMIZE_MAIN_WINDOW);
  },

  toggleMaximize() {
    return ipcRenderer.send(IPC_MESSAGES.MAXIMIZE_MAIN_WINDOW);
  },

  isMaximized() {
    return new Promise((resolve) => {
      ipcRenderer.send(IPC_MESSAGES.ISMAXIMIZED_MAIN_WINDOW);
      ipcRenderer.once(
        IPC_MESSAGES.ISMAXIMIZED_RESULT,
        (_event, isMaximized) => {
          resolve(isMaximized);
        }
      );
    });
  },

  isFullscreen() {
    return new Promise((resolve) => {
      ipcRenderer.send(IPC_MESSAGES.ISFULLSCREEN_MAIN_WINDOW);
      ipcRenderer.once(
        IPC_MESSAGES.ISFULLSCREEN_RESULT,
        (_event, isFullscreen) => {
          resolve(isFullscreen);
        }
      );
    });
  },

  closeWindow() {
    return ipcRenderer.send(IPC_MESSAGES.CLOSE_MAIN_WINDOW);
  },

  async getCreds() {
    return (await ipcRenderer.invoke(IPC_ACTIONS.GET_CREDS)) as Creds;
  },

  async getLanguageMap(code: string) {
    return (await ipcRenderer.invoke(IPC_ACTIONS.GET_LANGUAGE_MAP, code)) as {
      languageMap: LanguageMap;
      success: boolean;
      message: string;
    };
  },

  async getTemplates(posTemplateWidth?: number): Promise<TemplateFile[]> {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.GET_TEMPLATES,
      posTemplateWidth
    )) as TemplateFile[];
  },

  async initScheduler(time: string) {
    await ipcRenderer.invoke(IPC_ACTIONS.INIT_SHEDULER, time);
  },

  async selectFile(options: SelectFileOptions): Promise<SelectFileReturn> {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.SELECT_FILE,
      options
    )) as SelectFileReturn;
  },

  async getSaveFilePath(options: SaveDialogOptions) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.GET_SAVE_FILEPATH,
      options
    )) as SaveDialogReturnValue;
  },

  async getOpenFilePath(options: OpenDialogOptions) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.GET_OPEN_FILEPATH,
      options
    )) as OpenDialogReturnValue;
  },

  async checkDbAccess(filePath: string) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.CHECK_DB_ACCESS,
      filePath
    )) as boolean;
  },

  async checkForUpdates() {
    await ipcRenderer.invoke(IPC_ACTIONS.CHECK_FOR_UPDATES);
  },

  openLink(link: string) {
    ipcRenderer.send(IPC_MESSAGES.OPEN_EXTERNAL, link);
  },

  async deleteFile(filePath: string) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.DELETE_FILE,
      filePath
    )) as BackendResponse;
  },

  async saveData(data: string, savePath: string) {
    await ipcRenderer.invoke(IPC_ACTIONS.SAVE_DATA, data, savePath);
  },

  showItemInFolder(filePath: string) {
    ipcRenderer.send(IPC_MESSAGES.SHOW_ITEM_IN_FOLDER, filePath);
  },

  async makePDF(
    html: string,
    savePath: string,
    width: number,
    height: number
  ): Promise<boolean> {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.SAVE_HTML_AS_PDF,
      html,
      savePath,
      width,
      height
    )) as boolean;
  },

  async printDocument(
    html: string,
    width: number,
    height: number
  ): Promise<boolean> {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.PRINT_HTML_DOCUMENT,
      html,
      width,
      height
    )) as boolean;
  },

  async getDbList() {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.GET_DB_LIST
    )) as ConfigFilesWithModified[];
  },

  async dataToolsListBackups() {
    return ipcRenderer.invoke(IPC_ACTIONS.DATA_TOOLS_BACKUPS) as Promise<{
      backups: {
        name: string;
        modified: string;
        size: number;
        verified: boolean;
      }[];
      externalFolder: string | null;
      backupNotice: string | null;
    }>;
  },
  async dataToolsCreateBackup(otherFolder = false) {
    return ipcRenderer.invoke(
      IPC_ACTIONS.DATA_TOOLS_CREATE_BACKUP,
      otherFolder
    ) as Promise<{ canceled?: boolean; name?: string; modified?: string }>;
  },
  async dataToolsSetBackupFolder() {
    return ipcRenderer.invoke(
      IPC_ACTIONS.DATA_TOOLS_SET_BACKUP_FOLDER
    ) as Promise<string | null>;
  },
  async dataToolsSelectBackup() {
    return ipcRenderer.invoke(
      IPC_ACTIONS.DATA_TOOLS_SELECT_BACKUP
    ) as Promise<null | {
      token: string;
      name: string;
      size: number;
      valid: boolean;
      integrity: string[];
      companyName: string | null;
      countryCode: string | null;
      currentCompanyName: string | null;
      currentCountryCode: string | null;
      companyMatches: boolean;
      countryMatches: boolean;
    }>;
  },
  async dataToolsRestore(token: string) {
    return ipcRenderer.invoke(
      IPC_ACTIONS.DATA_TOOLS_RESTORE,
      token
    ) as Promise<{ restored: boolean; snapshot: string }>;
  },
  async dataToolsImportHealth() {
    return ipcRenderer.invoke(IPC_ACTIONS.DATA_TOOLS_IMPORT_HEALTH) as Promise<{
      paymentCount: number;
      allocatedPaymentCount: number;
      unallocated: {
        name: string;
        party: string;
        paymentType: string;
        amount: number;
        amountPaid: number;
        unallocated: number;
      }[];
      invoices: Record<string, unknown>[];
      parties: Record<string, unknown>[];
      statements: {
        party: string;
        role: string;
        openingBalance: null;
        entries: Record<string, unknown>[];
        debit: number;
        credit: number;
        closingNet: number;
      }[];
      sourceArchiveTables: string[];
      reconciliation: {
        available: boolean;
        sourceSet?: string;
        partyComparisons: {
          party: string;
          status: string;
          sourceBalance?: number;
          nativeBalance?: number;
          difference?: number;
          evidenceStatus: string;
        }[];
        openingAdjustments?: {
          party: string;
          sourceId: string;
          type: string;
          amount?: number;
          evidenceStatus: string;
        }[];
        notes: string[];
      };
      note: string;
    }>;
  },
  async dataToolsHistory() {
    return ipcRenderer.invoke(IPC_ACTIONS.DATA_TOOLS_HISTORY) as Promise<
      Record<string, unknown>[]
    >;
  },

  async getDbDefaultPath(companyName: string) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.GET_DB_DEFAULT_PATH,
      companyName
    )) as string;
  },

  async getEnv() {
    return (await ipcRenderer.invoke(IPC_ACTIONS.GET_ENV)) as {
      isDevelopment: boolean;
      platform: string;
      version: string;
    };
  },

  openExternalUrl(url: string) {
    ipcRenderer.send(IPC_MESSAGES.OPEN_EXTERNAL, url);
  },

  async showError(title: string, content: string) {
    await ipcRenderer.invoke(IPC_ACTIONS.SHOW_ERROR, { title, content });
  },

  async sendError(body: string) {
    await ipcRenderer.invoke(IPC_ACTIONS.SEND_ERROR, body);
  },

  async sendAPIRequest(endpoint: string, options: RequestInit | undefined) {
    return (await ipcRenderer.invoke(
      IPC_ACTIONS.SEND_API_REQUEST,
      endpoint,
      options
    )) as Promise<
      {
        [key: string]: string | number | boolean | Date | object | object[];
      }[]
    >;
  },

  registerMainProcessErrorListener(listener: IPCRendererListener) {
    ipcRenderer.on(IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR, listener);
  },

  registerTriggerFrontendActionListener(listener: IPCRendererListener) {
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_ERPNEXT_SYNC, listener);
  },

  registerConsoleLogListener(listener: IPCRendererListener) {
    ipcRenderer.on(IPC_CHANNELS.CONSOLE_LOG, listener);
  },

  db: {
    async getSchema() {
      return (await ipcRenderer.invoke(
        IPC_ACTIONS.DB_SCHEMA
      )) as BackendResponse;
    },

    async create(dbPath: string, countryCode?: string) {
      return (await ipcRenderer.invoke(
        IPC_ACTIONS.DB_CREATE,
        dbPath,
        countryCode
      )) as BackendResponse;
    },

    async connect(dbPath: string, countryCode?: string) {
      return (await ipcRenderer.invoke(
        IPC_ACTIONS.DB_CONNECT,
        dbPath,
        countryCode
      )) as BackendResponse;
    },

    async call(method: DatabaseMethod, ...args: unknown[]) {
      return (await ipcRenderer.invoke(
        IPC_ACTIONS.DB_CALL,
        method,
        ...args
      )) as BackendResponse;
    },

    async bespoke(method: string, ...args: unknown[]) {
      return (await ipcRenderer.invoke(
        IPC_ACTIONS.DB_BESPOKE,
        method,
        ...args
      )) as BackendResponse;
    },
  },

  store: {
    get<K extends keyof ConfigMap>(key: K) {
      return config.get(key);
    },

    set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]) {
      return config.set(key, value);
    },

    delete(key: keyof ConfigMap) {
      return config.delete(key);
    },
  },
} as const;

contextBridge.exposeInMainWorld('ipc', ipc);
export type IPC = typeof ipc;
