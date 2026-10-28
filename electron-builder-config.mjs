// App is tagged with a .mjs extension to allow
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * electron-builder doesn't look for the APPLE_TEAM_ID environment variable for some reason.
 * This workaround allows an environment variable to be added to the electron-builder.yml config
 * collection. See: https://github.com/electron-userland/electron-builder/issues/7812
 */

const dirname = path.dirname(fileURLToPath(import.meta.url));
// const root = path.join(dirname, '..', '..');
const root = dirname; // redundant, but is meant to keep with the previous line
const buildDirPath = path.join(root, 'dist_electron', 'build');
const packageDirPath = path.join(root, 'dist_electron', 'bundled');

const frappeBooksConfig = {
  productName: 'Nivo',
  // Retain the installation identity for compatibility with existing data.
  appId: 'io.frappe.books',
  artifactName: '${productName}-v${version}-${os}-${arch}.${ext}',
  asarUnpack: '**/*.node',
  extraResources: [
    { from: 'build/icons', to: 'icons' },
    { from: 'translations', to: '../translations' },
    { from: 'templates', to: '../templates' },
  ],
  files: '**',
  extends: null,
  directories: {
    output: packageDirPath,
    app: buildDirPath,
  },
  mac: {
    type: 'distribution',
    artifactName: '${productName}-v${version}-mac-${arch}.${ext}',
    category: 'public.app-category.finance',
    icon: 'build/icon.icns',
    notarize: {
      teamId: process.env.APPLE_TEAM_ID || '',
    },
    hardenedRuntime: true,
    gatekeeperAssess: false,
    darkModeSupport: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    publish: null,
  },
  win: {
    publisherName: 'Frappe Technologies Pvt. Ltd.',
    artifactName: '${productName}-v${version}-windows-${arch}.${ext}',
    signDlls: true,
    icon: 'build/icon.ico',
    publish: null,
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32'],
      },
      {
        target: 'portable',
        arch: ['x64', 'ia32'],
      },
    ],
  },
  nsis: {
    artifactName: '${productName}-v${version}-windows-${arch}-setup.${ext}',
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/installerIcon.ico',
    uninstallerIcon: 'build/uninstallerIcon.ico',
    publish: null,
  },
  portable: {
    artifactName: '${productName}-v${version}-windows-${arch}-portable.${ext}',
  },
  linux: {
    icon: 'build/icons',
    artifactName: '${productName}-v${version}-linux-${arch}.${ext}',
    category: 'Finance',
    publish: null,
    target: [
      {
        target: 'deb',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'rpm',
        arch: ['x64', 'arm64'],
      },
    ],
  },
};

export default frappeBooksConfig;
