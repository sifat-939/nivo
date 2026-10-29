<div align="center">

  <img src="src/assets/brand/nivo-logo.png" alt="Nivo Logo" width="130" />

  # Nivo

  **Privacy-First, Offline Desktop Accounting Application for Small Businesses & Freelancers**

  <p>
    <a href="https://github.com/sifat-939/nivo/releases/latest"><img src="https://img.shields.io/github/v/release/sifat-939/nivo?style=flat-square&color=2563eb&label=latest%20release" alt="Latest Release"></a>
    <a href="https://github.com/sifat-939/nivo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-10b981?style=flat-square" alt="License"></a>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-6366f1?style=flat-square" alt="Platform Support">
    <img src="https://img.shields.io/badge/database-100%25%20Offline%20SQLite-0284c7?style=flat-square" alt="Offline SQLite">
    <img src="https://img.shields.io/badge/stack-Electron%20%7C%20Vue%20%7C%20TypeScript-f59e0b?style=flat-square" alt="Tech Stack">
  </p>

  <p>
    <a href="#-download--installation">Download</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-why-nivo">Why Nivo?</a> •
    <a href="#-user-guide--documentation">User Guide</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-development">Development</a> •
    <a href="#-license--attribution">License</a>
  </p>

  <br>

  <!-- Dynamic Light / Dark Mode Hero Screenshot -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/nivo-dashboard-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/nivo-dashboard.png">
    <img alt="Nivo Financial Dashboard Preview" src="docs/assets/nivo-dashboard.png" width="92%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </picture>

  <p><em>Modern interactive dashboard with real-time cash flow, invoicing progress, and expense analytics.</em></p>

</div>

---

## 💡 Why Nivo?

Nivo is a modern, standalone desktop accounting suite built for business owners who want complete ownership over their financial data. It combines the bookkeeping precision of Frappe Books with an upgraded, minimal user experience and full offline autonomy.

- ⚡ **100% Offline-First:** Operates entirely on your local machine. No mandatory internet connection, no forced cloud accounts, and zero monthly SaaS subscriptions.
- 🔒 **Absolute Data Privacy:** Your invoices, customer records, and ledger balances live in an isolated local SQLite database (`.db`). You control your data.
- 💼 **Double-Entry Bookkeeping:** Built-in General Ledger, Chart of Accounts, Invoicing, Payment Allocations, and automatic balancing compliant with standard accounting principles.
- 👥 **HR & Payroll Module:** Manage employee profiles, record monthly salary payments, and prevent duplicate disbursements with unique period safeguards.
- 🛡️ **Automated Daily Backups:** Timestamped database backups are automatically maintained in a dedicated local directory upon closing or connecting.
- 🌓 **Sleek Light & Dark Themes:** Carefully crafted UI with smooth curves, clean typography, and full dark mode support.

---

## 📥 Download & Installation

Binaries for the latest stable version are available on the [**GitHub Releases Page**](https://github.com/sifat-939/nivo/releases/latest).

| Operating System | Package | Description | Direct Download |
|---|---|---|:---:|
| **Windows 10 / 11 (64-bit)** | Standard Setup (`.exe`) | Recommended installer. Adds Desktop and Start menu shortcuts. | [Download Setup](https://github.com/sifat-939/nivo/releases/download/v0.40.1/Nivo-v0.40.1-windows-x64-setup.exe) |
| **Windows 10 / 11 (64-bit)** | Portable (`.exe`) | Runs directly without installation (ideal for USB drives). | [Download Portable](https://github.com/sifat-939/nivo/releases/download/v0.40.1/Nivo-v0.40.1-windows-x64-portable.exe) |
| **Linux (64-bit)** | AppImage (`.AppImage`) | Single executable for Ubuntu, Debian, Fedora, Arch, etc. | [Download AppImage](https://github.com/sifat-939/nivo/releases/download/v0.40.1/Nivo-v0.40.1-linux-x86_64.AppImage) |
| **Verification** | Checksum (`SHA256SUMS.txt`) | Cryptographic checksums to verify package authenticity. | [View Checksums](https://github.com/sifat-939/nivo/releases/download/v0.40.1/SHA256SUMS.txt) |

> ℹ️ **Windows SmartScreen Note:**  
> Since Nivo installers are self-published and not yet signed with a paid corporate EV certificate, Windows may present a standard *"Windows protected your PC"* prompt. Click **"More info"** and then **"Run anyway"** to launch.

### Linux Quick Start
```bash
chmod +x Nivo-v0.40.1-linux-x86_64.AppImage
./Nivo-v0.40.1-linux-x86_64.AppImage
```

---

## 📖 User Guide & Documentation

We provide a complete, end-to-end visual manual in Bengali tailored for business operators and accountants:

📄 [**Download Nivo Bengali User Guide (PDF)**](output/pdf/Nivo-Bangla-Guide.pdf)  
- **58 comprehensive pages** covering 52 practical accounting workflows.
- Step-by-step visual walkthroughs for invoicing, payment allocations, stock reconciliation, salary disbursement, and financial reporting.
- Practical daily operational checklists and backup recovery protocols.

---

## ✨ Key Features

### 🧾 Invoicing & Billing
- **Sales Invoices:** Generate standard and tax invoices with instant stock ledger updates.
- **Purchase Invoices:** Record incoming supplier bills and track outstanding payables.
- **Payment Entries:** Record incoming and outgoing payments with multi-invoice allocation.
- **Parties:** Manage customer and supplier ledgers, addresses, and transaction histories.

### 💰 Financial Accounts & Reports
- **General Ledger & Journal Entries:** Complete double-entry accounting records with debit/credit balance integrity.
- **Bank & Cash Accounts:** Track cash registers, bank deposits, and transfers.
- **Financial Statements:** Instant Profit & Loss reports, Balance Sheets, Trial Balances, and Cash Flow summaries.
- **Print & PDF Export:** Clean standard print templates with customized branding, notes, and terms.

### 👥 HR & Payroll
- **Employee Management:** Maintain staff directories, designation, and compensation records.
- **Salary Processing:** Create salary vouchers with automated period-based duplicate locks to prevent double payments.

### ⚙️ Customizable & Modular
- Enable or disable modules as your business requires via **Settings → Features** (POS, Inventory, HR, Expense tracking).
- Customize custom fields and print views to fit your regional invoicing requirements.

---

## 🛠️ Tech Stack

Nivo is engineered with a modern, high-performance desktop technology stack:

- **Desktop Framework:** [Electron](https://www.electronjs.org/)
- **Frontend Architecture:** [Vue.js 3](https://vuejs.org/) with [Tailwind CSS](https://tailwindcss.com/)
- **Core Language:** [TypeScript](https://www.typescriptlang.org/)
- **Embedded Database:** [SQLite](https://www.sqlite.org/) (via native Node-SQLite bindings)
- **Automated Verification:** Playwright & Vitest for packaged UI regression testing

---

## 💻 Development & Building

### Prerequisites
- **Node.js:** `^22.0.0`
- **Yarn:** Classic `1.22.22`

### Setup & Local Development
```bash
# Enable Yarn and install dependencies
corepack enable
yarn install --frozen-lockfile

# Launch Nivo in development mode
yarn dev
```

### Quality Assurance & Auditing
```bash
# Run TypeScript validation
yarn typecheck

# Run test suites and security assertions
yarn test:nivo

# Run repository integrity and privacy checker
python3 scripts/check-repository.py
```

### Building Distributables
- **Windows (Setup & Portable):** Run on Windows or via GitHub Actions runner:
  ```bash
  yarn build:windows
  ```
- **Linux (AppImage):**
  ```bash
  yarn build --linux AppImage --x64 --nosign --publish never
  ```

---

## 🔐 Security & Data Privacy

Your company data is completely isolated from the application code:
- **Linux Data Path:** `~/.local/share/nivo/data/`
- **Windows Data Path:** `%APPDATA%\nivo\data\`

All databases, logs, secrets, and private credentials are excluded from version control via `.gitignore`. Downloading updates, pulling Git code, or building installers never touches or exposes your proprietary accounting data. See [Installation & Data Architecture](docs/installation.md) for details.

---

## 📜 License & Attribution

Nivo is free and open-source software licensed under the **GNU Affero General Public License v3.0** ([AGPL-3.0-only](LICENSE)).

- **Upstream Project:** Derived from [Frappe Books](https://github.com/frappe/books) created by [Frappe Technologies Pvt. Ltd.](https://frappe.io).
- All upstream copyrights, trademarks, and [Upstream README](docs/upstream-readme.md) are strictly acknowledged and preserved.
- Code audits and architecture notes are documented in the [Final Audit Report](docs/final-audit-2026-10-29.md).
