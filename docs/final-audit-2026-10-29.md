# Nivo 0.40.1: চূড়ান্ত পর্যালোচনা ও প্যাক

## কী ঠিক হয়েছে

| সমস্যা | সংশোধন |
|---|---|
| Sales Items-এ অপ্রয়োজনীয় Tax কলাম | Item-এর list configuration থেকে সরানো হয়েছে; Item Group-এর Tax ও HSN কলামও সরেছে। আগের হিসাবের tax data/engine মুছে ফেলা হয়নি। |
| nullable IN filter অন্য শর্ত এড়িয়ে যেতে পারত | `(নির্বাচিত মান OR NULL)` একসঙ্গে group করা হয়েছে। Query, count এবং delete-এ অন্য শর্ত অক্ষত থাকে; শূন্য মানও বাদ পড়ে না। |
| ব্যর্থ posting-এর আগেই তালিকা সাময়িক জমা status পেত | Sync notification transaction commit-এর পরে যায়; rollback হলে notification বাদ পড়ে। Cancel event-ও তালিকা refresh করে। |
| ব্যর্থ Save-এর পরে syncing flag আটকে থাকত | `finally` দিয়ে flag স্বাভাবিক হয়, ফলে formula dependency ও retry আটকে থাকে না। |
| খারাপ saved filter URL-এ পাতা খুলতে ব্যর্থতা | Invalid JSON/অবৈধ top-level মান নিরাপদে বাদ যায়; prototype-সম্পর্কিত key গ্রহণ করা হয় না। |
| Settings খোলা থাকলে নতুন tab-link কাজ করত না | Query tab বদলালে active tab-ও বদলায়। |
| packaged অ্যাপের ভেতরের পাতায় Reload ব্যর্থ হত | পরিচিত Vue route-এ index document পরিবেশন হয়। Asset path অপরিবর্তিত থাকে; app root-এর বাইরে বা malformed request প্রত্যাখ্যাত হয়। |

## পরীক্ষা ও পরিধি

- Regression: **536/536** assertion; asset URL rewrite: **1/1**।
- TypeScript, পরিবর্তিত production module-গুলোর ESLint এবং whitespace check পাস।
- Linux AppImage build পাস। SHA-256: `de788b7b051dfb6967bb25fe5638648f20ee59b09f5237bedf88d92951e436fb`।
- Packaged audit regression পাস: Tax-বিহীন Item/Item Group, deep reload, malformed filter URL, global status filter, লুকানো কলাম, 65-row paging/selection, inactive listener cleanup, summary, backup/restore, report branches ও blocked unapproved writes।
- Accounts/HR packaged regression পাস: আগের schema upgrade-এ ledger/invoice অক্ষত, Employee/Expense/Salary form save/submit, calculation, history, bank drilldown ও cancel reversal।
- আলাদা temporary synthetic company-তে **51টি screenshot** তোলা হয়েছে। মূল sidebar, company/setup, forms, চারটি accounting report, settings tabs, optional inventory/stock reports, quotes, print/import/customization, pricing/coupon/loyalty এবং POS startup পর্দা ঘুরে দেখা হয়েছে; renderer ও handled error log খালি।
- এই UI পর্যালোচনা প্রতিটি advanced feature-এর সব সম্ভাব্য accounting combination-এর end-to-end পরীক্ষা নয়। POS-এর shift-open পর্দা দেখা হয়েছে; বাস্তব কাউন্টারের rollout বা external ERP integration প্রত্যয়িত হয়নি।
- বাংলা গাইড: **57 পৃষ্ঠা**, 51 synthetic screenshot, tagged PDF ও bookmarks। সব পৃষ্ঠা PNG-তে রেন্ডার করে দেখা হয়েছে; builder overflow/footer overlap পরীক্ষা করেছে; PDF-এ local-file URI নেই।

## প্যাকের বিষয়বস্তু

`release-source.zip`-এ app source, `.github/` workflows, license, public docs, guide source/screenshots এবং `output/pdf/Nivo-Bangla-Guide.pdf` আছে। Company database, personal config, credentials, installers, dependencies, private migration report এবং Git history নেই। মূল business data আলাদা থাকে।

নিজের repository-তে সম্পূর্ণ source upload করে package version-এর সঙ্গে মেলা `v0.40.1` tag দিলে workflow Windows x64 setup/portable এবং Linux AppImage বানিয়ে সফলতার পরে বর্তমান repository-এর Releases-এ প্রকাশ করে। বাংলা PDF-ও release asset হিসেবে যায়। বাস্তবে GitHub-এ কোনো নতুন repository/release এই কাজে প্রকাশ করা হয়নি।

## যে বিষয়গুলো এখনো সীমাবদ্ধ

- Windows installer-এর native build/startup smoke workflow-তে প্রস্তুত; এই Linux মেশিনে বাস্তব Windows install/upgrade/uninstall চালানো হয়নি। Signing certificate নেই।
- পুরোনো আমদানির অনুমোদিত opening/adjustment contra account, receipt allocation, stock date/valuation-এর প্রমাণ এখনো প্রয়োজন। এই আপডেটে অনুমান করে কোনো হিসাব পোস্ট হয়নি।
- মূল lifecycle transaction status ও ledger-কে একসঙ্গে রাখে এবং submit/cancel queue করে। তবে একই legacy Knex handle-এ আলাদা programmatic/background write-এর পূর্ণ isolation আগের রিপোর্টে বর্ণিত সীমাবদ্ধতা হিসেবে আছে; explicit owner context ছাড়া তা সম্পূর্ণ সমাধান হয়েছে বলা হচ্ছে না।
- Electron 22 runtime-এর সমন্বিত security/compatibility upgrade পৃথক কাজ; কেবল UI পরীক্ষা বা build pass দিয়ে সেটি সম্পন্ন হয়েছে বলা যায় না।

সব বাগ নেই বা সব ব্যবসার তথ্য শতভাগ মিলে গেছে এমন নিশ্চয়তা এই অডিট দেয় না। নির্দিষ্ট করে পাওয়া ও নিরাপদে যাচাইযোগ্য সমস্যাগুলো উপরে সংশোধনসহ লেখা আছে।

## স্থানীয় ইনস্টল যাচাই

Nivo 0.40.1 ইনস্টল করা হয়েছে। বিদ্যমান profile ও খোলা কোম্পানি দিয়ে চালু হয়েছে, Item তালিকায় Tax কলাম অনুপস্থিত এবং application error পাওয়া যায়নি। তিনটি বিদ্যমান কোম্পানির financial/HR row installer-এর consistent snapshot-এর সঙ্গে মিলে গেছে; SQLite integrity ঠিক আছে। ব্যবসার লেনদেন সংশোধন বা পুনরায় import করা হয়নি।
