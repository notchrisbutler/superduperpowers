#!/usr/bin/env node

import fs from 'node:fs';

const readmePath = new URL('../README.md', import.meta.url);
const packageJsonPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!pkg.name || !pkg.version) {
  throw new Error('package.json must include name and version');
}

const block = `## Latest Release Verification

The release workflow updates this block during the version bump. The final npm tarball hashes are published by the registry after publish; verify them with npm instead of trusting a self-referential hash embedded in this packaged README.

- Version: \`${pkg.version}\`
- GitHub tag: \`v${pkg.version}\`
- npm package: \`${pkg.name}@${pkg.version}\`
- Verify npm integrity: \`npm view ${pkg.name}@${pkg.version} dist.integrity dist.shasum\`

`;

const text = fs.readFileSync(readmePath, 'utf8');
const marker = '## Latest Release Verification\n';
let next;
if (text.includes(marker)) {
  next = text.replace(/## Latest Release Verification\n[\s\S]*?(?=---\n\n## |## Security\n|$)/, block);
} else {
  next = text.replace('## Security\n', `${block}---\n\n## Security\n`);
}
fs.writeFileSync(readmePath, next);
