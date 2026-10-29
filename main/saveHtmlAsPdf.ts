import { App, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export async function saveHtmlAsPdf(
  html: string,
  savePath: string,
  app: App,
  width: number, // centimeters
  height: number // centimeters
): Promise<boolean> {
  const tempDirectory = await fs.mkdtemp(
    path.join(app.getPath('temp'), 'nivo-pdf-')
  );
  const htmlPath = path.join(tempDirectory, 'document.html');
  let printWindow: BrowserWindow | undefined;
  try {
    await fs.writeFile(htmlPath, html, { encoding: 'utf-8' });
    printWindow = await getInitializedPrintWindow(htmlPath, width, height);
    const data = await printWindow.webContents.printToPDF({
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: {
        height: height / 2.54,
        width: width / 2.54,
      },
      printBackground: true,
    });
    await fs.writeFile(savePath, data);
    return true;
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.destroy();
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function getInitializedPrintWindow(
  printFilePath: string,
  width: number,
  height: number
) {
  const printWindow = new BrowserWindow({
    width: Math.floor(width * 28.333333), // pixels
    height: Math.floor(height * 28.333333), // pixels
    show: false,
  });

  try {
    await printWindow.loadFile(printFilePath);
    await printWindow.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
  })()`);
    return printWindow;
  } catch (error) {
    if (!printWindow.isDestroyed()) printWindow.destroy();
    throw error;
  }
}
