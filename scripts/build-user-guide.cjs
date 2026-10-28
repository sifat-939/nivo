// Bengali shaping is rendered by Chromium/HarfBuzz; fonts are embedded in HTML/PDF.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'docs/user-guide');
const version = require('../package.json').version;
const chapters = JSON.parse(
  fs.readFileSync(path.join(dir, 'chapters.json'), 'utf8')
);
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
function fontFile() {
  const options = [
    process.env.NIVO_BENGALI_FONT,
    path.join(
      os.homedir(),
      '.local/share/fonts/bengali/HindSiliguri-Regular.ttf'
    ),
    '/usr/local/share/fonts/bengali/kalpurush.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf',
  ];
  const p = options.find((p) => p && fs.existsSync(p));
  if (!p) throw Error('Set NIVO_BENGALI_FONT to a Bengali TTF font');
  return p;
}
let number = 0;
function page(title, body, kind = '') {
  number++;
  return `<section class="page ${kind}" id="p${number}"><header><b>NIVO</b><span>ব্যবহার নির্দেশিকা · ${version}</span></header><main><h1>${title}</h1>${body}</main><footer><span>শুধু নমুনা কোম্পানির ছবি · নিজের তথ্য দিয়ে কাজ করুন</span><b>${number}</b></footer></section>`;
}
const parts = [];
parts.push(
  page(
    'আপনার ব্যবসার হিসাব<br>আপনার হাতেই',
    `<div class="cover-mark"><img src="../../src/assets/brand/nivo-mark.png"></div><div class="cover-name">Nivo</div><p class="cover-sub">সহজ বাংলায় পূর্ণ ব্যবহার নির্দেশিকা</p><div class="cover-rule"></div><p>কোম্পানি তৈরি থেকে চালান, পেমেন্ট, খরচ, বেতন,<br>রিপোর্ট এবং নিরাপদ ডেটা সংরক্ষণ।</p><div class="cover-box">ধাপে ধাপে নির্দেশনা<br><b>${chapters.length}টি অংশের বাস্তব অ্যাপের স্ক্রিনশট</b></div><small>সংস্করণ ${version} · অক্টোবর ২০২৬<br>অফলাইন ডেস্কটপ অ্যাপ · Windows / Linux</small>`,
    'cover'
  )
);
parts.push(
  page(
    'এই বই কীভাবে ব্যবহার করবেন',
    `<p class="intro">অ্যাপের বোতাম ও মেনুর ইংরেজি নাম অপরিবর্তিত রাখা হয়েছে, যাতে ছবির সঙ্গে সহজে মিলিয়ে নিতে পারেন। নির্দেশনা বাংলায়।</p><div class="toc">${chapters
      .map(
        (c, i) =>
          `<a href="#p${i + 4}"><b>${String(i + 1).padStart(
            2,
            '0'
          )}</b><span>${escape(c.title)}</span><em>${i + 4}</em></a>`
      )
      .join(
        ''
      )}</div><p class="small">প্রথমে পরের পাতার মৌলিক নিয়ম পড়ুন। শেষে backup, দৈনন্দিন checklist ও সাধারণ সমস্যার সমাধান আছে।</p>`,
    'contents'
  )
);
parts.push(
  page(
    'শুরু করার আগে ৬টি সহজ নিয়ম',
    `<div class="rules"><h2>১ · এক ব্যবসা, একটি সঠিক কোম্পানি</h2><p>কোম্পানি বদলালে হিসাবও বদলায়। উপরের কোম্পানির নাম দেখে নিন। অন্য প্রতিষ্ঠানের ডাটাবেসে নতুন লেনদেন দেবেন না।</p><h2>২ · Save এবং Submit এক নয়</h2><p>Save খসড়া রাখে। Submit হলে প্রাসঙ্গিক ledger/stock posting সম্পন্ন হয়। শুধু তালিকায় নাম দেখা মানেই হিসাব জমা নয়।</p><h2>৩ · বিল এবং টাকা আলাদা</h2><p>Invoice হলো বিল। Payment হলো টাকা গ্রহণ/প্রদান। সঠিক invoice reference ছাড়া টাকা জমা হলে Due আলাদাভাবে থেকে যেতে পারে।</p><h2>৪ · একই ঘটনা দুইবার নয়</h2><p>একটি ক্রয় বিলের Payment বা Salary Payment থাকলে আবার একই ঘটনাকে Expense হিসেবে তুলবেন না। আগে reference ও status মিলিয়ে নিন।</p><h2>৫ · মোট এবং নগদ এক নয়</h2><p>Settled / Adjusted-এ payment ছাড়াও সমন্বয় থাকতে পারে। ব্যাংকের প্রকৃত টাকা দেখতে Bank & Cash ও ledger-এর সঙ্গে statement মেলান।</p><h2>৬ · আগে নিরাপদ কপি</h2><p>বড় import, account পরিবর্তন বা পুরোনো হিসাব সংশোধনের আগে consistent backup রাখুন। উদাহরণের অঙ্ক নিজের ব্যবসার opening হিসেবে ব্যবহার করবেন না।</p></div><aside>এই বইয়ের সব লেনদেন ও পরিচয় কৃত্রিম। কিছু ঐচ্ছিক feature শুধু নমুনা কোম্পানিতে চালু করে দেখানো হয়েছে; আপনার অ্যাপে সেগুলো বন্ধ থাকতে পারে।</aside>`
  )
);
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  const img = path.join(dir, 'images', c.image + '.jpg');
  if (!fs.existsSync(img)) throw Error('Missing screenshot ' + c.image);
  parts.push(
    page(
      `<span class="chapter">${String(i + 1).padStart(2, '0')}</span> ${escape(
        c.title
      )}`,
      `<div class="breadcrumb">${escape(
        c.path
      )}</div><figure><img src="images/${c.image}.jpg" alt="${escape(
        c.title
      )}"><figcaption>নমুনা কোম্পানিতে Nivo ${version}-এর প্রকৃত পর্দা</figcaption></figure><ol class="steps">${c.steps
        .map((s) => `<li>${escape(s)}</li>`)
        .join('')}</ol><aside>${escape(c.note)}</aside>`
    )
  );
}
parts.push(
  page(
    'ব্যাকআপ, কম্পিউটার বদল ও আপডেট',
    `<h2>সোর্স, অ্যাপ এবং ডেটা তিনটি আলাদা জিনিস</h2><p>GitHub source ZIP বা installer-এর মধ্যে আপনার ব্যবসার ডাটাবেস থাকে না। অন্য কম্পিউটারে একই হিসাব পেতে কোম্পানির সঠিক database ও প্রয়োজনীয় backup আলাদা নিতে হবে।</p><h2>নিরাপদ কপি রাখুন</h2><ol><li>অসম্পূর্ণ কাজ সংরক্ষণ করে অ্যাপ স্বাভাবিকভাবে সম্পূর্ণ বন্ধ করুন। চলন্ত SQLite ফাইল শুধু কপি করলে অসম্পূর্ণ তথ্য যাওয়ার ঝুঁকি থাকে।</li><li>কোম্পানির আসল .db ও প্রয়োজনীয় backup কপি করুন। .db-wal বা .db-shm থাকলে সেগুলো অন্ধভাবে মুছবেন না; consistent SQLite backup পদ্ধতি বা অভিজ্ঞ সহায়তা নিন।</li><li>আলাদা ড্রাইভে তারিখসহ backup রাখুন। একটি কপির ওপর নির্ভর করবেন না। কিছুদিন পর একটি পরীক্ষার কপি খুলে যাচাই করুন।</li></ol><h2>সাধারণ অবস্থান</h2><div class="path">Linux: ~/.local/share/nivo/data/<br>Windows-এর সাধারণ profile: %APPDATA%/frappe-books/data/</div><p>অন্য জায়গা থেকে আগে database খোলা থাকলে সেটি ওই জায়গাতেই থাকে। Profile বা custom launch path বদলালে অবস্থান আলাদা হতে পারে। স্বয়ংক্রিয় daily backup সাধারণত কোম্পানির database-এর পাশের backups ফোল্ডারে থাকে।</p><h2>নতুন কম্পিউটারে</h2><p>Nivo ইনস্টল করে Existing Company দিয়ে কপি করা সঠিক .db খুলুন। নাম, invoice সংখ্যা, balance ও সাম্প্রতিক নথি মিলিয়ে তারপর নতুন কাজ শুরু করুন। আপডেটের আগে backup রাখুন; installer বদলানো data restore নয়।</p><aside>Data Tools মেনু সরানো হয়েছে। এই সংস্করণে ব্যবহারকারীর জন্য ওই মেনুতে Restore বোতাম আছে বলে ধরে নেবেন না। বর্তমান database-এর ওপর backup বসানোর আগে পুরোনোটির নিরাপদ কপি ও পরিচয় যাচাই জরুরি।</aside>`
  )
);
parts.push(
  page(
    'প্রতিদিনের কাজের ছোট checklist',
    `<h2>দিনের শুরুতে</h2><ul><li>সঠিক কোম্পানি খোলা আছে কি না দেখুন।</li><li>তারিখ, পণ্যের rate এবং বাস্তব cash/bank opening মিলিয়ে নিন।</li><li>আগের দিনের কোনো Save করা খসড়া জমা দেওয়া বাকি কি না দেখুন।</li></ul><h2>কাজের সময়</h2><ul><li>বিক্রয়ে invoice, ক্রয়ে purchase invoice এবং টাকা চলাচলে সঠিক Payment দিন।</li><li>Party, পণ্য, unit, quantity ও amount মিলিয়ে তবেই Submit করুন।</li><li>দৈনন্দিন পরিশোধিত খরচ Expense-এ, বেতন Salary Payments-এ দিন। একই ঘটনা দুইবার তুলবেন না।</li></ul><h2>দিনের শেষে</h2><ul><li>Cash গুনে ও bank statement দেখে Bank & Cash-এর সঙ্গে মিলিয়ে নিন।</li><li>চালানের Due, allocation এবং জমা/বাতিল status পরীক্ষা করুন।</li><li>প্রয়োজনীয় PDF পাঠানোর আগে নিজে খুলে দেখুন। Backup-এর কপি আছে কি না নিশ্চিত করুন।</li></ul><h2>শব্দের ছোট মানে</h2><table><tr><th>ইংরেজি</th><th>সহজ অর্থ</th></tr><tr><td>Party</td><td>কাস্টমার বা সরবরাহকারীর রেকর্ড</td></tr><tr><td>Due / Outstanding</td><td>সংশ্লিষ্ট নথিতে বাকি থাকা অঙ্ক</td></tr><tr><td>Reference / Allocation</td><td>কোন বিলের বিপরীতে কত টাকা বসেছে</td></tr><tr><td>Cancel</td><td>জমা হিসাব উল্টে দেওয়া; ইতিহাস রেখে দেওয়া</td></tr><tr><td>Export</td><td>নির্বাচিত তথ্য বাইরে নেওয়া; পূর্ণ database backup নয়</td></tr></table>`
  )
);
parts.push(
  page(
    'কিছু না মিললে যেভাবে খুঁজবেন',
    `<h2>নথি দেখা যাচ্ছে না</h2><p>কোম্পানির নাম, মেনু, filter, পেজ নম্বর এবং Features আগে দেখুন। মেনু বন্ধ থাকলে পুরোনো তথ্য মুছে যায় না। অ্যাপ নতুন ফাঁকা কোম্পানি খুলেছে কি না নিশ্চিত করুন।</p><h2>টাকা পেয়েও Due কমছে না</h2><p>Payment জমা হয়েছে কি না, সঠিক Party এবং invoice reference আছে কি না, বরাদ্দের amount ঠিক কি না দেখুন। অনুমান করে আবার একই টাকা তোলা বা চালান মুছবেন না।</p><h2>গোল চার্ট বা রিপোর্ট ফাঁকা</h2><p>সময়সীমা এবং জমা লেনদেন আছে কি না দেখুন। খরচ না থাকলে Top Expenses ফাঁকা থাকা স্বাভাবিক। Inventory history না থাকলে stock report-ও ফাঁকা হতে পারে।</p><h2>Feature-এর টিক বদলানো যাচ্ছে না</h2><p>নামের পাশের ! খুলুন। Dependency বা আগের হিসাব ব্যবহারের নিরাপত্তা-নিয়মের কারণে পরিবর্তন আটকে থাকতে পারে। Database হাতে বদলাবেন না।</p><h2>পুরোনো করবারের হিসাবের ফারাক</h2><p>Opening/adjustment-এর বিপরীত account, invoice-wise receipt allocation এবং dated stock/valuation-এর উৎসপ্রমাণ প্রয়োজন। সফটওয়্যার আপডেট দিয়ে অনুপস্থিত তথ্য তৈরি করা যায় না। হিসাবরক্ষক ও মূল উৎসের রিপোর্ট দিয়ে মিলিয়ে নিন।</p><h2>ত্রুটি বার্তা এলে</h2><p>বার্তাটি লিখে রাখুন, সংশ্লিষ্ট নথির status দেখুন এবং backup অক্ষত রাখুন। কোনো আংশিক কাজ সম্পন্ন হয়েছে কি না না জেনে বারবার Submit বা Import দেবেন না। Public issue-তে বাস্তব database, statement বা ব্যক্তিগত screenshot দেবেন না।</p><aside>এই সংস্করণের code audit ও পরীক্ষার পরিধি repository-এর docs-এ লেখা আছে। Windows installer-এর বাস্তব পরীক্ষা ও সব ব্যবসার accounting reconciliation এই নির্দেশিকার মাধ্যমে প্রত্যয়িত হচ্ছে না।</aside>`
  )
);
const font = fs.readFileSync(fontFile()).toString('base64');
const html = `<!doctype html><html lang="bn"><meta charset="utf-8"><title>Nivo - বাংলা ব্যবহার নির্দেশিকা</title><style>
@font-face{font-family:Bangla;src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:100 900}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Bangla,sans-serif;color:#18343c;font-size:12.5pt;line-height:1.48;background:#e8eeee} @page{size:A4;margin:0}.page{width:210mm;height:297mm;padding:13mm 14mm 16mm;background:white;position:relative;break-after:page;overflow:visible}.page:last-child{break-after:auto}header{display:flex;justify-content:space-between;border-bottom:1px solid #d6e5e5;padding-bottom:7px;margin-bottom:15px;color:#537077;font-size:9pt;letter-spacing:.2px}header b{font-family:Arial,sans-serif;letter-spacing:3px;color:#147d78}h1{font-size:23pt;line-height:1.23;margin:0 0 8px;font-weight:700;letter-spacing:-.2px}h2{font-size:17pt;line-height:1.3;margin:17px 0 5px;color:#147d78}p{margin:7px 0 12px}figure{margin:12px 0 10px}figure img{width:100%;display:block;border:1px solid #d9e6e7;border-radius:7px}figcaption{font-size:8.5pt;color:#6c8187;text-align:right;margin-top:4px}.breadcrumb{font-family:Bangla,Arial,sans-serif;color:#52757a;font-size:10.5pt}.chapter{display:inline-block;color:#168c83;font-size:16pt;margin-right:6px}.steps{padding-left:24px;margin:9px 0 11px}.steps li{padding-left:3px;margin:6px 0}li::marker{font-weight:bold;color:#147d78}aside{padding:10px 13px;border-left:3px solid #23988e;background:#edf6f4;border-radius:0 5px 5px 0;font-size:10.7pt;line-height:1.48}footer{position:absolute;bottom:8mm;left:14mm;right:14mm;border-top:1px solid #dce7e7;padding-top:7px;display:flex;justify-content:space-between;font-size:8pt;color:#71868b}footer b{color:#147d78;font-family:Arial;font-size:10pt}.cover{background:#102d35;color:#f4fbfa}.cover header{color:#adcece;border-color:#36535b}.cover header b{color:#62c6b8}.cover h1{font-size:31pt;margin-top:22px}.cover-mark{margin-top:25px;width:48mm;height:48mm;padding:12px;border-radius:22px;background:#1a3c45}.cover-mark img{width:100%;height:100%;object-fit:contain}.cover-name{font-family:Arial;font-weight:700;font-size:58pt;line-height:1.1;margin-top:14px}.cover-sub{font-size:23pt;color:#96ded3}.cover-rule{width:65px;height:4px;background:#67caba;margin:25px 0}.cover-box{border:1px solid #52737b;padding:15px;margin:30px 0;font-size:16pt;border-radius:9px}.cover small{color:#b7cdcf;font-size:11pt}.cover footer{color:#a8c5c8;border-color:#36535b}.cover footer b{color:#8bdacb}.intro{font-size:12pt;color:#4b666d}.toc{display:grid;grid-template-rows:repeat(${Math.ceil(
  chapters.length / 2
)},auto);grid-auto-flow:column;grid-template-columns:1fr 1fr;column-gap:20px;margin-top:18px}.toc a{display:flex;align-items:baseline;gap:6px;text-decoration:none;color:#213f45;min-height:29px;font-size:10.5pt;border-bottom:1px solid #edf1f1;padding:4px 0}.toc b{font-family:Arial;font-size:8pt;color:#168c83}.toc span{flex:1}.toc em{font-style:normal;font-family:Arial;font-size:9pt;color:#69848a}.small{font-size:10pt;color:#57727a;margin-top:16px}.rules p{font-size:12pt}.path{font-family:Bangla,Arial,sans-serif;font-size:11pt;background:#f0f5f5;padding:12px;border-radius:7px;line-height:1.7}ul,ol{padding-left:25px}table{width:100%;border-collapse:collapse;font-size:11pt}td,th{border-bottom:1px solid #dce7e7;text-align:left;padding:8px}th{color:#147d78;background:#edf5f3}
@media screen{.page{margin:18px auto;box-shadow:0 3px 18px #bcc}}@media print{body{background:white}.page{margin:0;box-shadow:none}}
</style><body>${parts.join('')}</body></html>`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
(async () => {
  let executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath();
  if (!fs.existsSync(executablePath)) {
    const base = path.join(os.homedir(), '.cache/ms-playwright');
    for (const folder of fs
      .readdirSync(base)
      .filter((n) => n.startsWith('chromium-'))
      .sort()
      .reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = path.join(base, folder, sub);
        if (fs.existsSync(p)) executablePath = p;
      }
    }
  }
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(path.join(dir, 'index.html')).href);
    await p.evaluate(() => document.fonts.ready);
    await p.emulateMedia({ media: 'print' });
    const failures = await p.evaluate(() =>
      [...document.querySelectorAll('.page')]
        .map((e, i) => ({
          page: i + 1,
          overflow: e.scrollHeight - e.clientHeight,
          footerOverlap:
            e.querySelector('main').getBoundingClientRect().bottom -
            e.querySelector('footer').getBoundingClientRect().top,
        }))
        .filter((e) => e.overflow > 2 || e.footerOverlap > 0)
    );
    if (failures.length)
      throw Error('Tutorial pages overflow: ' + JSON.stringify(failures));
    const out = path.join(root, 'output/pdf/Nivo-Bangla-Guide.pdf');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
    });
    console.log(
      JSON.stringify({ pdf: out, pages: number, screenshots: chapters.length })
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
