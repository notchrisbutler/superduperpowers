import fs from 'node:fs';
import path from 'node:path';
import { docsPathFromSettings, projectSettingsPath } from './settings.js';

export function ensureDefaultIgnoreHygiene(projectRoot) {
  const docsPath = docsPathFromSettings(projectSettingsPath(projectRoot));
  const results = [];
  results.push(ensureLine(path.join(projectRoot, '.gitignore'), docsPath));
  results.push(ensureLine(path.join(projectRoot, '.ignore'), `!${docsPath}`));
  return results;
}

function ensureLine(filePath, line) {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((entry) => entry.length > 0);
    if (lines.includes(line)) return { changed: false, filePath, line };
  }

  const prefix = content && !content.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(filePath, `${content}${prefix}${line}\n`, 'utf8');
  return { changed: true, filePath, line };
}
