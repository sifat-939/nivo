import { Fyo, t } from 'fyo';

type Conn = {
  countryCode: string;
  error?: Error;
  actionSymbol?: typeof dbErrorActionSymbols[keyof typeof dbErrorActionSymbols];
};

export const dbErrorActionSymbols = {
  SelectFile: Symbol('select-file'),
  CancelSelection: Symbol('cancel-selection'),
} as const;

const dbErrors = {
  DatabaseFileMissing: 'DatabaseFileMissing',
  InvalidDatabaseFile: 'InvalidDatabaseFile',
  DirectoryDoesNotExist: 'directory does not exist',
  UnableToAcquireConnection: 'Unable to acquire a connection',
} as const;

export async function connectToDatabase(
  fyo: Fyo,
  dbPath: string,
  countryCode?: string
): Promise<Conn> {
  try {
    return { countryCode: await fyo.db.connectToDatabase(dbPath, countryCode) };
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    return {
      countryCode: '',
      error,
      actionSymbol: await handleDatabaseConnectionError(error, dbPath),
    };
  }
}

export async function handleDatabaseConnectionError(
  error: Error,
  dbPath: string
) {
  const message = error.message;
  if (typeof message !== 'string') {
    throw error;
  }

  if (message.includes(dbErrors.DatabaseFileMissing)) {
    return await showDbErrorDialog(
      t`Database file ${dbPath} was moved or is missing. Select the original database file to continue. Your accounts have not been replaced.`
    );
  }

  if (message.includes(dbErrors.InvalidDatabaseFile)) {
    return await showDbErrorDialog(
      t`File ${dbPath} is not a valid database. Select your original database file or a backup to continue.`
    );
  }

  if (message.includes('EACCES') || message.includes('EPERM')) {
    return await showDbErrorDialog(
      t`Nivo cannot access database file ${dbPath}. Check its permissions or select an accessible copy.`
    );
  }

  if (message.includes(dbErrors.DirectoryDoesNotExist)) {
    return await handleDirectoryDoesNotExist(dbPath);
  }

  if (message.includes(dbErrors.UnableToAcquireConnection)) {
    return await handleUnableToAcquireConnection(dbPath);
  }

  throw error;
}

async function handleUnableToAcquireConnection(dbPath: string) {
  return await showDbErrorDialog(
    t`Could not connect to database file ${dbPath}, please select the file manually`
  );
}

async function handleDirectoryDoesNotExist(dbPath: string) {
  return await showDbErrorDialog(
    t`Directory for database file ${dbPath} does not exist, please select the file manually`
  );
}

async function showDbErrorDialog(detail: string) {
  const { showDialog } = await import('src/utils/interactive');
  const result = await showDialog({
    type: 'error',
    title: t`Cannot Open File`,
    detail,
    buttons: [
      {
        label: t`Select File`,
        action() {
          return dbErrorActionSymbols.SelectFile;
        },
        isPrimary: true,
      },
      {
        label: t`Cancel`,
        action() {
          return dbErrorActionSymbols.CancelSelection;
        },
        isEscape: true,
      },
    ],
  });
  return result === dbErrorActionSymbols.SelectFile ||
    result === dbErrorActionSymbols.CancelSelection
    ? result
    : undefined;
}
