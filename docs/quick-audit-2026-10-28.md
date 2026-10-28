# Nivo — দ্রুত সামগ্রিক কোড অডিট, ২৮ অক্টোবর ২০২৬

বর্তমান source-এর হিসাব, payroll, lists, cashflow ও navigation পর্যালোচনা করা হয়েছে; একটি Luna সাব-এজেন্ট read-only সহায়তা করেছে। কম টোকেন ও সময়ের জন্য full end-to-end, failure-injection, security scan বা production balance reconciliation চালানো হয়নি। নিচের বিষয়গুলো সংশোধন করা হয়নি।

| অগ্রাধিকার | সমস্যা | প্রভাব ও প্রমাণ |
|---|---|---|
| উচ্চ | Submit/Cancel এবং ledger একই transaction-এ হয় না | `fyo/model/doc.ts:1017` থেকে status আগে save, পরে ledger post/reverse। মাঝপথে disk/DB error হলে status ও ledger আলাদা অবস্থায় থাকতে পারে; retry শুরুতেই ফিরে যায়। এই failure path কোডে আছে; crash ঘটিয়ে পরীক্ষা হয়নি। |
| উচ্চ | পুরোনো import-এর হিসাব চূড়ান্তভাবে মেলানো বাকি | `docs/karbar-import-run-2026-10-28.md`-এ unallocated receipt, opening/adjustment ও stock history-এর সীমাবদ্ধতা আছে। এই দ্রুত অডিটে source ও company DB আবার মেলানো হয়নি; সমস্যা সমাধান হয়েছে বলে প্রমাণ নেই। |
| মাঝারি | Salary draft খুলে employee বদলালে পুরোনো salary থেকে যেতে পারে | `models/baseModels/SalaryPayment/SalaryPayment.ts:35–50`: salaryAutoFilled শুধু memory-তে থাকে। Draft reload হলে false হয়; nonzero salary থাকলে নতুন employee-এর salary নেওয়া হয় না। কোডভিত্তিক অসংগতি; নতুন UI reproduction করা হয়নি। |
| মাঝারি | Bank & Cash এবং Cashflow-এ পুরোনো group posting-এর গণনা আলাদা | Bank & Cash direct group entries দেখায়, কিন্তু `backend/database/bespoke.ts:73–78` Cashflow কেবল isGroup=false নেয়। Group-এ পুরোনো cash entry থাকলে দুই জায়গার coverage মিলবে না। ঐ ধরনের data থাকলেই প্রযোজ্য। |
| মাঝারি | Paid মানটি cash receipt-এর নিশ্চয়তা নয় | `src/pages/CommonForm/invoiceFinancials.ts:24–29` Final minus Due-কে Paid ধরে। Outstanding কমানো credit/return/write-off-ও এই সংখ্যায় পড়তে পারে; cash-paid ও adjusted আলাদা বোঝা যায় না। সূত্র নিশ্চিত; প্রতিটি adjustment workflow এখানে পুনরায় পরীক্ষা হয়নি। |
| মাঝারি | Status filter কিছু রেকর্ড বাদ দিতে পারে | `src/pages/ListView/List.vue:301–309` statusMap থেকে matched names নেয়; map ভরে rendered ListCell-এর mounted event দিয়ে (`ListCell.vue`)। অন্য page-এর/unrendered row বা পরে বদলানো status ঠিকভাবে map-এ না থাকলে ফল অসম্পূর্ণ/পুরোনো হতে পারে। |
| মাঝারি | বড় ডেটায় list ধীর হওয়ার ঝুঁকি | `src/pages/ListView/List.vue:293–297` সব matching rows আনে, পরে UI dataSlice দিয়ে page দেখায়। Database pagination নেই; data বাড়লে memory ও load/query কাজ বাড়ে। Performance benchmark করা হয়নি। |

## আলাদা করে সম্পন্ন অনুরোধ

Data Tools-এর sidebar, Settings button, search ও recent entry সরানো হয়েছে; আগের `/data-tools` link Dashboard-এ ফেরত যায়। Internal automatic backup ও database-safety code রাখা হয়েছে। এটি মেনু সরানোর কাজ; উপরের audit findings-এর bug fix নয়।

## পরবর্তী সংশোধন

এই তালিকাটি প্রাথমিক অডিটের রেকর্ড। বর্তমান সংশোধন, পরীক্ষা এবং এখনো প্রমাণ-নির্ভর বিষয়গুলো [0.40.0 resolution report](audit-resolution-2026-10-28.md)-এ আছে।
