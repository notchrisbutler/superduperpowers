#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const bootstrapLimit = Number(process.env.SDP_BOOTSTRAP_WORD_LIMIT || 220);
const largeSkillLineWarning = Number(process.env.SDP_SKILL_LINE_WARNING || 500);

const wordCount = (text) => (text.trim().match(/\S+/g) || []).length;
const lineCount = (text) => text.split('\n').length;

const walk = (dir, predicate, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, predicate, out);
    } else if (entry.isFile() && predicate(entryPath)) {
      out.push(entryPath);
    }
  }
  return out;
};

const summarizeFiles = (files) => {
  const rows = [];
  const totals = { files: files.length, words: 0, lines: 0, bytes: 0 };
  for (const file of files.sort()) {
    const text = fs.readFileSync(file, 'utf8');
    const row = {
      file: path.relative(repoRoot, file),
      words: wordCount(text),
      lines: lineCount(text),
      bytes: Buffer.byteLength(text)
    };
    totals.words += row.words;
    totals.lines += row.lines;
    totals.bytes += row.bytes;
    rows.push(row);
  }
  return { totals, rows };
};

const skillsDir = path.join(repoRoot, 'skills');
const agentsDir = path.join(repoRoot, 'agents');
const registrationPath = path.join(repoRoot, '.opencode/plugins/superduperpowers/sdp-registration.js');
const { getBootstrapContent } = await import(pathToFileURL(registrationPath));

const skillFiles = walk(skillsDir, (file) => path.basename(file) === 'SKILL.md');
const agentFiles = walk(agentsDir, (file) => file.endsWith('.md'));
const fallbackPromptFiles = walk(skillsDir, (file) => {
  const name = path.basename(file);
  return name.endsWith('-prompt.md') || file.endsWith(path.join('requesting-code-review', 'code-reviewer.md'));
});

const skillSummary = summarizeFiles(skillFiles);
const agentSummary = summarizeFiles(agentFiles);
const fallbackSummary = summarizeFiles(fallbackPromptFiles);

const bootstrap = getBootstrapContent(skillsDir) || '';
const bootstrapWords = wordCount(bootstrap);
const bootstrapLines = lineCount(bootstrap);
const bootstrapBytes = Buffer.byteLength(bootstrap);

const largeSkills = skillSummary.rows
  .filter((row) => row.lines > largeSkillLineWarning)
  .sort((a, b) => b.lines - a.lines);

let failed = false;

console.log('SuperDuperPowers context budget');
console.log('');
console.log(`Bootstrap: words=${bootstrapWords} lines=${bootstrapLines} bytes=${bootstrapBytes} limit=${bootstrapLimit}`);
console.log(`Skills: files=${skillSummary.totals.files} words=${skillSummary.totals.words} lines=${skillSummary.totals.lines} bytes=${skillSummary.totals.bytes}`);
console.log(`Agents: files=${agentSummary.totals.files} words=${agentSummary.totals.words} lines=${agentSummary.totals.lines} bytes=${agentSummary.totals.bytes}`);
console.log(`Fallback prompts: files=${fallbackSummary.totals.files} words=${fallbackSummary.totals.words} lines=${fallbackSummary.totals.lines} bytes=${fallbackSummary.totals.bytes}`);

if (largeSkills.length > 0) {
  console.log('');
  console.log(`Large skills over ${largeSkillLineWarning} lines (warning only):`);
  for (const row of largeSkills) {
    console.log(`- ${row.file}: ${row.lines} lines, ${row.words} words`);
  }
}

console.log('');
console.log('Top skill bodies by words:');
for (const row of [...skillSummary.rows].sort((a, b) => b.words - a.words).slice(0, 8)) {
  console.log(`- ${row.file}: ${row.words} words, ${row.lines} lines`);
}

console.log('');
console.log('Agent prompts by words:');
for (const row of [...agentSummary.rows].sort((a, b) => b.words - a.words)) {
  console.log(`- ${row.file}: ${row.words} words, ${row.lines} lines`);
}

if (bootstrapWords > bootstrapLimit) {
  console.error('');
  console.error(`ERROR: bootstrap exceeds ${bootstrapLimit} words (${bootstrapWords}).`);
  failed = true;
}

if (checkMode && failed) {
  process.exit(1);
}
