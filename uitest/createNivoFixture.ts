// Creates an expendable company only under the OS temporary directory.
import fs from 'fs';
import os from 'os';
import path from 'path';
import setupInstance from 'src/setup/setupInstance';
import { getTestFyo, getTestSetupWizardOptions } from 'tests/helpers';

async function main() {
  const target = path.resolve(process.argv[2] || '');
  if (
    !target.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    fs.existsSync(target)
  ) {
    throw new Error(
      'Fixture requires a new path under the OS temporary directory'
    );
  }
  const fyo = getTestFyo();
  try {
    await setupInstance(target, getTestSetupWizardOptions(), fyo);
    await fyo.singles.SystemSettings!.setAndSync('hideGetStarted', true);
  } finally {
    await fyo.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
