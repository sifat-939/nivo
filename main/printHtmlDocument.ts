import { App, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { getInitializedPrintWindow } from './saveHtmlAsPdf';

export async function printHtmlDocument(
  html: string,
  app: App,
  width: number,
  height: number
): Promise<boolean> {
  const tempDirectory = await fs.mkdtemp(
    path.join(app.getPath('temp'), 'nivo-print-')
  );
  const tempFile = path.join(tempDirectory, 'document.html');
  let printWindow: BrowserWindow | undefined;
  try {
    await fs.writeFile(tempFile, html, { encoding: 'utf-8' });
    printWindow = await getInitializedPrintWindow(tempFile, width, height);
    const window = printWindow;
    return await new Promise<boolean>((resolve) => {
      window.webContents.print(
        { silent: false, printBackground: true },
        (success) => resolve(success)
      );
    });
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.destroy();
    await fs.remove(tempDirectory);
  }
}
