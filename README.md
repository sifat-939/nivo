# Nivo — নিভো

<img src="src/assets/brand/nivo-logo.png" alt="Nivo" width="120" />

অফলাইনে ব্যবসার হিসাব রাখার ডেস্কটপ অ্যাপ। Frappe Books-এর Electron/Vue সংস্করণের ওপর তৈরি; নিজস্ব Nivo পরিচয়, মিনিমাল ইন্টারফেস এবং হালকা/গাঢ় থিম।

## Windows-এ ডাউনলোড ও ইনস্টল

এই repository-এর **Releases** পেজ খুলুন। Windows 10/11, 64-bit কম্পিউটারের জন্য:

- `Nivo-v<version>-windows-x64-setup.exe` — সাধারণ ইনস্টলার।
- `Nivo-v<version>-windows-x64-portable.exe` — ইনস্টল ছাড়া চালানোর সংস্করণ। এর কোম্পানি ডেটাও user profile-এ থাকে; exe-এর মধ্যে থাকে না।
- `SHA256SUMS.txt` — ডাউনলোড যাচাইয়ের checksum।

Release এখনো না থাকলে repository owner নিচের release নিয়মে build প্রকাশ করবেন। Installer unsigned হলে Windows unknown-publisher সতর্কতা দেখাতে পারে। নিজের যাচাইকৃত repository-এর release-ই ব্যবহার করুন।

## বাংলা ব্যবহার নির্দেশিকা

[স্ক্রিনশটসহ পূর্ণ বাংলা PDF টিউটোরিয়াল](output/pdf/Nivo-Bangla-Guide.pdf) - ৫৭ পৃষ্ঠা, ৫১টি অংশের বাস্তব নমুনা স্ক্রিনশট, দৈনন্দিন checklist ও backup নির্দেশনা।

## ফিচার

- বিক্রয়/ক্রয় চালান, পেমেন্ট, পার্টি, আইটেম ও হিসাবের রিপোর্ট।
- Accounts: Expense এবং Bank & Cash।
- HR: Employees এবং Salary Payments।
- Settings → Features থেকে প্রয়োজনীয় অতিরিক্ত সুবিধা চালু/বন্ধ।
- মিনিমাল transparent N লোগো, গোলাকার ইন্টারফেস এবং হালকা/গাঢ় থিম।
- কোম্পানিভিত্তিক SQLite ডেটা, স্বয়ংক্রিয় ব্যাকআপ এবং বিদ্যমান ডেটার সামঞ্জস্য।

## ডেভেলপমেন্ট

Node.js **22** এবং Yarn Classic **1.22.22** ব্যবহার করুন।

```bash
corepack enable
yarn install --frozen-lockfile
yarn dev
```

```bash
yarn typecheck
yarn test:nivo
python3 scripts/check-repository.py
```

Linux-এ packaged UI test চালাতে display বা `xvfb-run` প্রয়োজন। Windows build Windows কম্পিউটার বা GitHub Actions-এর Windows runner-এ করুন:

```bash
yarn build:windows
```

Linux AppImage:

```bash
yarn build --linux AppImage --x64 --nosign --publish never
```

## GitHub-এ নিজের repository

শুধু এই `frappe-books/` প্রকল্পটি আপলোড করুন। পাশের archived project বা ব্যক্তিগত data folder আপলোড করবেন না। Clean source ZIP তৈরি করতে:

```bash
python3 scripts/check-repository.py --zip release-source.zip
```

ZIP খুলে `nivo/`-এর ফাইলগুলো নতুন repository-এর root-এ রাখুন; `.github/` ও অন্যান্য hidden source files-ও রাখবেন। তারপর commit/push করুন। বিদ্যমান checkout-এর `origin` upstream Frappe Books হতে পারে—নিজের repository URL ছাড়া সেখানে push করবেন না।

নতুন repository-তে **Actions** চালু রাখুন। **Build Nivo → Run workflow** করলে Windows/Linux build downloadable artifact পাওয়া যাবে। স্থায়ী Releases download দিতে `package.json`-এর version-এর সঙ্গে মিলিয়ে tag push করুন, যেমন বর্তমান সংস্করণের জন্য:

```bash
git tag v0.40.1
git push origin v0.40.1
```

পরীক্ষা, Linux packaged regression এবং Windows startup smoke পাস হলে **Release Nivo** workflow এই repository-তেই setup, portable ও AppImage প্রকাশ করে। Custom token প্রয়োজন নেই; workflow-এর সীমিত `GITHUB_TOKEN` ব্যবহৃত হয়। প্রথম Windows build ও ইনস্টল Windows-এ যাচাই না হওয়া পর্যন্ত সেটিকে পরীক্ষিত release বলবেন না। [বিস্তারিত release নিয়ম](docs/release-process.md)।

## ফোল্ডার গঠন ও ব্যক্তিগত ডেটা

| ফোল্ডার | কাজ |
|---|---|
| `src/` | Vue ইন্টারফেস, পেজ, থিম, আইকন |
| `models/`, `schemas/`, `fyo/` | ডকুমেন্ট ও হিসাবের মূল নিয়ম |
| `backend/`, `main/` | SQLite, Electron, নিরাপদ ফাইল কাজ |
| `reports/`, `templates/` | রিপোর্ট ও প্রিন্ট |
| `tests/`, `uitest/` | regression ও packaged UI পরীক্ষা |
| `build/`, `.github/workflows/` | platform icon ও build/release ব্যবস্থা |
| `scripts/` | পরীক্ষা, Linux install ও source যাচাই |
| `docs/` | প্রকাশযোগ্য ব্যবহার/ডেভেলপমেন্ট তথ্য |

`node_modules/`, `dist_electron/`, `.env`, credentials, company databases, installers এবং `.local-private/` Git-এ অন্তর্ভুক্ত হয় না। ব্যবসার একবারের migration/correction script-ও স্থানীয়ভাবে বাদ রাখা হয়েছে। Source checker পরিচিত private file/secret ধরতে সাহায্য করে; প্রকাশের আগে নতুন document/screenshot নিজেও পর্যালোচনা করুন।

Linux data: `~/.local/share/nivo/data/`। Windows data: Electron-এর user profile-এর `data/` directory। আগে অন্য জায়গা থেকে খোলা database তার পুরোনো path-এই থাকে। Source বা exe আপলোড করলে ব্যবসার database স্থানান্তর হয় না। [ইনস্টল ও ডেটা সংরক্ষণ](docs/installation.md)।

## সামঞ্জস্য ও সীমাবদ্ধতা

অভ্যন্তরীণ `frappe-books` identity পুরোনো profile ও data-এর সামঞ্জস্যের জন্য রাখা হয়েছে। Upstream automatic update বন্ধ। পুরোনো আমদানির opening/adjustment, receipt allocation ও stock reconciliation প্রমাণ ছাড়া স্বয়ংক্রিয়ভাবে বদলানো হয় না। [Migration status](docs/karbar-import-run-2026-10-28.md)।

## লাইসেন্স ও মূল প্রকল্প

মূল প্রকল্প Frappe Technologies-এর Frappe Books। **AGPL-3.0-only** [লাইসেন্স](LICENSE), copyright এবং [upstream README](docs/upstream-readme.md) সংরক্ষিত। মূল Electron/Vue সংস্করণ end-of-life; runtime upgrade-এর compatibility কাজ [release process](docs/release-process.md)-এ নথিভুক্ত আছে।

[সর্বশেষ কোড অডিট, সংশোধন ও পরীক্ষার ফল](docs/final-audit-2026-10-29.md)।
