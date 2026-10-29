# Nivo ইনস্টল ও ডেটা সংরক্ষণ

Linux-এ বিল্ড তৈরি হওয়ার পর Nivo বন্ধ করে চালান:

```bash
python3 scripts/install-linux.py dist_electron/bundled/Nivo-v0.40.4-linux-x86_64.AppImage
```

অ্যাপ মেনুতে **Nivo** নামে পাওয়া যাবে। পরের বিল্ড ইনস্টল করতেও একই স্ক্রিপ্ট ব্যবহার করুন।

- ইনস্টল করা অ্যাপ: `~/.local/share/nivo/Nivo.AppImage`
- নতুন কোম্পানির ডেটা: `~/.local/share/nivo/data/`
- আপডেটের আগে ডেটাবেস ও সেটিংসের ব্যাকআপ: `~/.local/share/nivo/backups/`
- আগের Nivo বিল্ড: `~/.local/share/nivo/Nivo.previous.AppImage`
- বিদ্যমান সেটিংস: `~/.config/frappe-books/config.json`

`XDG_DATA_HOME` থাকলে Linux-এর ডেটা ও ইনস্টল ওই ডিরেক্টরির অধীনে হয়। macOS ও Windows-এ নতুন কোম্পানির ডেটা Electron-এর userData-এর `data/` ফোল্ডারে থাকে। পুরোনো কোনো ফাইল অন্য জায়গা থেকে খোলা হলে তার পথ অক্ষত থাকে; ইনস্টলার সেটি নিজে সরায় না।

সোর্স, বিল্ড বা পুরোনো ইনস্টলার মুছলেও স্থায়ী ডেটা ফোল্ডার মুছবেন না। অন্য কম্পিউটারে নিতে ডেটাবেস এবং প্রয়োজনীয় ব্যাকআপ আলাদা কপি করুন।

পুরোনো কোম্পানি খোলার সময় ফাইল না পাওয়া গেলে বা ফাঁকা/ভুল ফাইল হলে অ্যাপ নতুন ফাঁকা হিসাব তৈরি করে না। আসল ডেটাবেস বা ব্যাকআপ বেছে নিতে বলে। **নতুন কোম্পানি তৈরি** করার কাজটি আলাদা থাকে।

ভেতরের `frappe-books` পরিচয়টি পুরোনো সেটিংস ও টাস্কবারের সামঞ্জস্যের জন্য আছে; এটি আলাদা পুরোনো অ্যাপের ইনস্টলেশন নয়। অ্যাপের দৃশ্যমান নাম ও আইকন Nivo।

## Windows

নিজের repository-এর Releases থেকে `Nivo-v<version>-windows-x64-setup.exe` নিন। Nivo বন্ধ করে installer চালান। Company database মুছবেন না; upgrade-এর আগে consistent SQLite backup আলাদা রাখুন। Portable exe-ও profile data ব্যবহার করে। GitHub-এর Actions artifact build পরীক্ষার জন্য; ব্যবহারকারীর স্থায়ী download Releases-এ পাওয়া যায়।

PowerShell দিয়ে download যাচাই: `Get-FileHash .\Nivo-v<version>-windows-x64-setup.exe -Algorithm SHA256`। ফল release-এর `SHA256SUMS.txt`-এর সঙ্গে মেলান। Unsigned build-এ unknown-publisher prompt হতে পারে; নিজের যাচাইকৃত release ছাড়া চালাবেন না।
