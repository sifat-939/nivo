# অডিটের পর বাস্তবায়ন — Nivo 0.38.0

এই সংস্করণে অডিটের ব্যবহারযোগ্যতা, হিসাবের প্রদর্শন ও ডেটা সুরক্ষার কাজগুলো বাস্তবায়ন করা হয়েছে। তিনজন Luna সাব-এজেন্ট কাজ ভাগ করে করেছে; মূল এজেন্ট integration review ও পরীক্ষা করেছে। নতুন স্ক্রিনের ভাষা English রাখা হয়েছে।

## পরিবর্তন

- **ফিচার নিয়ন্ত্রণ:** কেন্দ্রীয় policy দিয়ে sidebar, search-এর list/create entries এবং নতুন রেকর্ড তৈরির সুযোগ মেলানো। পুরোনো নথি পড়ার সুযোগ রাখা। সরানো duplicate ও Tax/GST UI ফেরানো হয়নি। Features help-এ menu visibility, accounting rules এবং locked settings-এর পার্থক্য বোঝানো হয়েছে।
- **Get Started:** Both Party/Item ধরা, PurchaseInvoice দিয়ে purchase task সম্পূর্ণ করা, এবং checks আপডেটের পরে completion যাচাই।
- **POS:** POS Without Inventory চালু করলেই batch, serial, barcode ও UOM conversion নিজে থেকে চালু হবে না। আগে থেকে চালু থাকা সেটিংস জোর করে বন্ধ করা হয়নি।
- **ইনভয়েস:** Items-এর পরে Final Amount/Paid/Due-এর ছোট সারি; duplicate Net Total/Outstanding প্রদর্শন সরানো। পুরোনো adjustment-এর পার্থক্য থাকলে ব্যাখ্যা। মূল schema ও accounting values রাখা হয়েছে।
- **পুরোনো taxable invoice:** after-tax discount থাকলেও tax row ও posting বজায় রাখার সংশোধন। অস্থায়ী SQLite-এ submit ও ledger regression দিয়ে যাচাই; Tax UI ফেরানো হয়নি।
- **কলাম:** invoice list-এ কলাম দেখানো/লুকানো/ক্রম সাজানো, কোম্পানি অনুযায়ী saved view, Paid/Due এবং unit অনুযায়ী Total Quantity। quantity column লুকালে বাড়তি child-row query করা হয় না।
- **বকেয়ার বয়স:** invoice date থেকে ৩০/৬০/৯০ দিনের filter; শুধু submitted, non-cancelled, outstanding invoice। এটি due date থেকে overdue গণনা নয়।
- **Data Tools:** Settings ও Setup থেকে backup, restore preview, integrity verification, আগে snapshot, কোম্পানি/country যাচাই, দৈনিক backup ও ঐচ্ছিক দ্বিতীয় folder। স্বয়ংক্রিয় backup retention manual বা migration snapshot মুছবে না।
- **হিসাব যাচাই:** unallocated receipt এবং একই Party-এর invoice candidates দেখানো; নিজে থেকে allocation করা হয় না। Receivable/Payable control ledger ধরে party statement ও signed net balance; positive মানে পাওনা, negative মানে দেনা।
- **Import reconciliation:** archive থাকলে source/native balance ও evidence status দেখা। অজানা opening/adjustment-এর sign অনুমান করে ledger লেখা হয় না।
- **History:** বর্তমান modified timestamp, modified user ও cancellation state দেখা; এটি প্রতিটি পুরোনো edit-এর সম্পূর্ণ immutable audit log নয়।
- **Typecheck ও CI:** Vite প্রকল্পের অপ্রয়োজনীয় webpack type reference সরানো; পুরোনো type errors সংশোধন। Linux regression, typecheck, AppImage build ও packaged smoke job যোগ।
- **IPC সুরক্ষা:** মূল window/frame যাচাই; save dialog-এ নির্বাচিত path-এর একবার ব্যবহারযোগ্য অনুমতি; কোম্পানির DB-এর ওপর export লেখা বন্ধ; create/overwrite/delete-এর আগে snapshot। Restore চললে অন্য database action বন্ধ থাকে।
- **অতিরিক্ত সংশোধন:** শুধু আয় থাকা Profit and Loss period-এর crash ও শুধু ব্যয় থাকা period-এর ভুল total label; importer-এর missing source-account argument।

## যেগুলো সফটওয়্যার নিজে সিদ্ধান্ত নেবে না

বর্তমান ব্যবসার locked accounting features জোর করে বন্ধ করা হয়নি। পুরোনো import-এর অপ্রমাণিত opening balances, payments বা stock movements তৈরি করা হয়নি। নতুন reconciliation screen-এর status যাচাই করার পরে প্রমাণিত correction আলাদা করে পোস্ট করতে হবে।

Runtime-এর বড় upgrade আলাদা compatibility stage হিসেবে রাখা হয়েছে, যেমন অডিটে বলা হয়েছিল। Electron/native SQLite একসঙ্গে বদলাতে packaging, ABI, print এবং backup/restore-এর আলাদা যাচাই দরকার। নিজস্ব update feed ছাড়া upstream auto-update বন্ধ আছে। release ও rollback পদ্ধতি `docs/release-process.md`-এ আছে।

## যাচাই

- `scripts/test-nivo.sh`: মূল regression **১৭৪/১৭৪**, asset rewrite **১/১** পাস।
- `vue-tsc --noEmit`: পাস। পরিবর্তিত প্রধান modules-এর targeted ESLint-এ error নেই; test file-টি ESLint-এর বিদ্যমান ignore pattern-এ পড়ে।
- Packaged UI regression: invoice summary, saved columns, ৩০/৬০/৯০ দিনের filter, Party list, verified backup, company/country validation, restore round trip, অনুমতি ছাড়া file write প্রত্যাখ্যান এবং Profit and Loss-এর income-only/expense-only branch পাস। Renderer exception এবং handled application error—দুটিই শূন্য।
- স্ক্রিনশট দেখে Data Tools পর্যালোচনা করা হয়েছে। অর্থ currency format-এ এবং Party statements খুলে দেখা যায়।
- Integration-এ ধরা computed Payment field-এর SQL query, child allocation join এবং Money value পুনরায় wrap করার age-filter bug সংশোধন হয়েছে; age-filter regression নতুন পরীক্ষায় অন্তর্ভুক্ত।
- AppImage build পাস। SHA-256: `e945ae4f9f7698f57fafe832996760a9ba467a0955a524533dff2a0a826f829c`।
- CI configuration যোগ করা হয়েছে; GitHub-এর remote CI run এই মেশিন থেকে চালানো হয়নি।
- Production database-এ পরীক্ষামূলক লেনদেন পোস্ট করা হয়নি। ব্যবসার import এখনও source evidence ও opening/adjustment যাচাই ছাড়া চূড়ান্তভাবে reconciled বলা যাবে না।

## ইনস্টল ও বর্তমান ডেটা দিয়ে যাচাই

Nivo **0.38.0** `scripts/install-linux.py` দিয়ে ইনস্টল করা হয়েছে। ইনস্টল করা AppImage-এর SHA-256 উপরের build-এর সঙ্গে মিলেছে। আগের company/profile দিয়ে অ্যাপ খুলেছে; Data Tools-এর native statements ও Karbar archive reconciliation পড়া গেছে এবং application error log খালি ছিল। ব্যবসার কোনো নতুন transaction পোস্ট বা restore করা হয়নি।

- ইনস্টল ব্যাকআপ: `<local-path>`।
- পুরোনো আটকে থাকা process বন্ধ করার আগের অতিরিক্ত যাচাইকৃত snapshot: `<local-path>`।
- Installer এখন defunct Electron process-কে চলমান অ্যাপ হিসেবে ভুল গণনা করে না; সক্রিয় অ্যাপ থাকলে আগের মতোই installation বন্ধ করে।
- আগের binary installer-এর rollback location-এ রাখা হয়েছে।
