import fs from 'fs-extra';
import path from 'path';

/**
 * Removes leading slash from all renderer files
 * electron uses a custom registered protocol to load the
 * files: "app://"
 *
 * @param {string} dir
 * @param {string} base
 */
export function removeBaseLeadingSlash(dir, base) {
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      removeBaseLeadingSlash(filePath, base);
      continue;
    }

    // PNGs and fonts must remain byte-for-byte intact. Only rewrite text assets.
    if (!/\.(?:js|css|html|json|map|svg)$/i.test(filePath)) {
      continue;
    }

    const contents = fs.readFileSync(filePath).toString('utf-8');
    fs.writeFileSync(filePath, contents.replaceAll('/' + base, base));
  }
}
