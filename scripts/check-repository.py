#!/usr/bin/env python3
"""Check public source candidates, optionally export a clean GitHub source ZIP.

Uses Git's tracked + non-ignored untracked inventory, not the working folder tree.
Never includes history, ignored business files, dependencies or build output.
"""
import argparse
import pathlib
import re
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--zip', type=pathlib.Path, help='Create a reviewed source-only ZIP')
args = parser.parse_args()
result = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
                        cwd=ROOT, check=True, capture_output=True)
names = sorted(set(p for p in result.stdout.decode().split('\0') if p))
blocked = re.compile(r'(^|/)(node_modules|dist_electron|\.local-private|\.git|backups|dbs)(/|$)|'
                     r'(^|/)(\.env(?:\..*)?|log_creds\.txt|config\.json)$|'
                     r'\.(?:db(?:-.*)?|sqlite3?(?:-.*)?|p12|pfx|pem|key|exe|AppImage|dmg|deb|rpm)$', re.I)
secrets = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|'
                     r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|'
                     r'AKIA[0-9A-Z]{16}')
errors, files = [], []
for name in names:
    p = ROOT / name
    if not p.exists():  # tracked deletion
        continue
    if blocked.search(name):
        errors.append(f'Private/build file selected: {name}')
        continue
    if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to(ROOT):
        errors.append(f'Unsupported source path: {name}')
        continue
    data = p.read_bytes()
    if len(data) > 10 * 1024 * 1024:
        errors.append(f'Oversized source file (review required): {name}')
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        text = ''
    if secrets.search(text):
        errors.append(f'Possible credential in {name} (value withheld)')
    if re.search(r'/(?:home|Users)/(?!test(?:/|$))[^/\s]+/', text):
        errors.append(f'Local business identifier/path in {name}')
    files.append((name, p))
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'Public source checks passed: {len(files)} files; no selected database/build/credential files.')
if args.zip:
    destination = args.zip.resolve()
    # Prevent the ZIP itself becoming a public source candidate next time.
    if destination.is_relative_to(ROOT) and not subprocess.run(
        ['git', 'check-ignore', '-q', str(destination)], cwd=ROOT).returncode == 0:
        parser.error('Choose a destination outside the repository or an ignored path')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, p in files:
            archive.write(p, 'nivo/' + name)
    print(f'Source ZIP: {destination}')
