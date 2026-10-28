# Accounts ও HR — Nivo 0.39.0

## গবেষণা ও নকশা

বর্তমান Vue forms/list, sidebar, model/schema registration, SQLite migration, Transactional/LedgerPosting, General Ledger এবং dashboard queries মিলিয়ে নকশা করা হয়েছে। UI-এর ভাষা English; আগের light/dark রং, rounded controls, outline icons ও Save/Submit পদ্ধতি অনুসরণ করে। তিনজন Luna সাব-এজেন্ট model, UI এবং accounting integration ভাগ করে কাজ করেছে; মূল এজেন্ট integration ও সুরক্ষা যাচাই করেছে।

মেনু:

- Accounts → Expense
- Accounts → Bank & Cash
- HR → Employees
- HR → Salary Payments

## ফিচারগুলোর কাজ

**Expense:** তারিখ, খরচের খাত, Amount, Paid From, বিবরণ ও attachment। Save করলে draft; Submit করলে Expense account-এ debit ও নির্বাচিত Bank/Cash-এ credit। Cancel করলে native reversal। জমা না দেওয়া draft খরচ হিসেবে গণনা হয় না। খরচ ইতিমধ্যে পরিশোধের এই voucher-এর জন্য আলাদা Payment আবার তৈরি করতে হয় না।

**Bank & Cash:** প্রতিটি Asset Cash/Bank account-এর posted ledger balance (আগের group account-এ সরাসরি posting থাকলে সেটিও আলাদাভাবে দেখা যায়; child balance দ্বিতীয়বার যোগ হয় না), সম্মিলিত total, Refresh, account-ভিত্তিক General Ledger এবং Manage Accounts। Account তৈরি/সম্পাদনা বিদ্যমান Chart of Accounts tree দিয়েই হয়। একসঙ্গে ledger rows আনা হয়; প্রতি account-এর জন্য আলাদা query হয় না। টাকার যোগ-বিয়োগে decimal Money ব্যবহার করা হয়।

**Employees:** Employee ID, নাম, পদ, যোগদানের তারিখ, মাসিক বেতন, ফোন, ইমেইল ও Active অবস্থা। Employee আলাদা HR record; Customer/Supplier Party-এর বাকি হিসাবের সঙ্গে মেশানো হয় না।

**Salary Payments:** কর্মী, payment date, salary month, salary, bonus, deductions, Net Pay, Expense Account, Paid From ও remarks। কর্মী বাছলে monthly salary আসে; হাতে বদলানো যায়। Net Pay = salary + bonus − deductions। Submit হলে প্রদেয় টাকাই expense ও bank/cash ledger-এ যায়। এটি মাসের বেতন সরাসরি পরিশোধের workflow।

## হিসাব ও সুরক্ষা

- খরচের account অবশ্যই leaf Expense এবং Paid From অবশ্যই leaf Asset Cash/Bank। UI dropdown ও backend দুটোতেই বিধি প্রয়োগ হয়।
- শূন্য/ঋণাত্মক payment, ঋণাত্মক bonus/deduction এবং শূন্য/ঋণাত্মক Net Pay প্রত্যাখ্যান হয়।
- নতুন Salary Payment-এর জন্য active employee প্রয়োজন। পরে employee inactive হলেও পুরোনো payment cancel করা যায়।
- একই কর্মীর একই মাসে একটিই active submitted salary payment রাখা হয়। একাধিক draft রাখা যায়; cancel-এর পরে replacement দেওয়া যায়। Application check এবং SQLite partial unique index আছে।
- একই form-এ double-submit এবং concurrent paid-entry action serialize করা হয়, যাতে একই entry দুবার post না হয়।
- Net Pay read-only calculated value হিসেবে database-এ সংরক্ষিত হয়; list/reopen-এ সঠিক value পাওয়া যায়।
- Report ও dashboard-এ নতুন আলাদা হিসাব যোগ হয়নি: native ledger থেকেই Profit and Loss, cashflow ও Top Expenses আপডেট হয়। General Ledger-এ Expense/Salary Payments reference filter যোগ হয়েছে। Data Tools history-তেও দুটো document থাকে।
- পুরোনো invoice/payment/party rows সম্পাদনা না করে নতুন schema tables/index migration দিয়ে যোগ হয়; migration ও installation backup থাকে।

## যাচাই ও ইনস্টল

- Regression: **২০৮/২০৮** এবং asset rewrite **১/১** পাস।
- পূর্ণ `vue-tsc --noEmit`, targeted ESLint এবং `git diff --check` পাস।
- Packaged app-এ পুরোনো database অনুকরণ করে upgrade: আগের invoice ও ledger rows অপরিবর্তিত, নতুন tables যোগ এবং migration snapshot যাচাই হয়েছে।
- UI দিয়েই employee Save, Expense/Salary Save ও Submit; বেতন prefill, Net Pay, list, history, dashboard expense/cashflow, salary reference-ভিত্তিক General Ledger এবং Bank & Cash drilldown পাস। Cancel করলে আগের cash balance ফেরে।
- নতুন ব্যাংক/নগদ পেজের light/dark theme, দুই কলামের alignment এবং readable heading যাচাই হয়েছে। Renderer ও handled application error শূন্য।
- আগের invoice summary, saved columns, age filter, Backup/Restore round trip ও file-write protection-এর packaged regression-ও পাস।
- AppImage SHA-256: `e45dab593219b3cf9a9da40223af47db9ffccb81119ad52f0f149e9556843c77`।
- পরীক্ষার লেনদেন শুধু OS temporary directory-এর আলাদা company database-এ হয়; production company-তে পরীক্ষার salary/expense যোগ করা হয়নি।


## বর্তমান কোম্পানিতে ইনস্টল

Nivo **0.39.0** `scripts/install-linux.py` দিয়ে ইনস্টল হয়েছে। বর্তমান profile/company-তে Accounts/HR-এর চারটি পেজ খোলা, native history query এবং Bank & Cash পড়া সফল; application error পাওয়া যায়নি। Employee/Expense/SalaryPayment নতুন tables খালি আছে—আসল কোম্পানিতে পরীক্ষার লেনদেন ঢোকানো হয়নি।

- Installer backup: `<local-path>`।
- অতিরিক্ত pre-upgrade snapshot: `<local-path>`।
- তিনটি configured company-এর পুরোনো Sales/Purchase invoices ও items, Payments ও references, ledger, Party, Item ও Account rows ব্যাকআপের সঙ্গে পুরো মিলিয়ে অপরিবর্তিত পাওয়া গেছে।
- বর্তমান কোম্পানিতে salary uniqueness index এবং SQLite integrity check যাচাই হয়েছে।
- নতুন খরচের খাত বা Bank/Cash account তৈরি/সম্পাদনা: **Accounts → Bank & Cash → Manage Accounts**।
- GitHub CI configuration-এ Accounts/HR packaged regression যুক্ত হয়েছে; remote CI run এখানে চালানো হয়নি।
