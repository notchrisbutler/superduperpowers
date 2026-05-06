import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOpenCodeConfig } from './opencode-config.js';

const installerDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(installerDir, '..');
const templatePath = path.join(packageRoot, 'installer', 'templates', 'superduperpowers.settings.jsonc');

export function projectSettingsPath(projectRoot) {
  return path.join(projectRoot, '.opencode', 'superduperpowers.jsonc');
}

export function globalSettingsPath(openCodeConfigDir) {
  return path.join(openCodeConfigDir, 'superduperpowers', 'settings.jsonc');
}

export function settingsExists(filePath) {
  return fs.existsSync(filePath);
}

export function readSettingsTemplate() {
  return fs.readFileSync(templatePath, 'utf8');
}

export function docsPathFromSettings(filePath) {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : readSettingsTemplate();
  const parsed = parseOpenCodeConfig(raw, { filePath, format: 'jsonc' });
  const config = parsed.status === 'ok' ? parsed.config : {};
  const docsRoot = safeProjectRelativePath(config.workflow?.defaultDocsRoot) || 'docs';
  const docsDirName = safePathSegment(config.paths?.docsDirName) || 'superduperpowers';
  return `${docsRoot.replace(/\/+$/, '')}/${docsDirName}/`;
}

export function ensureSettingsFile(filePath, options = {}) {
  if (fs.existsSync(filePath) && !options.overwrite) {
    return { changed: false, action: 'kept', filePath };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, readSettingsTemplate(), 'utf8');
  return { changed: true, action: fs.existsSync(filePath) ? 'written' : 'created', filePath };
}

function safeProjectRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (path.isAbsolute(value) || value.split(/[\\/]+/).includes('..')) return null;
  return value.split(/[\\/]+/).filter(Boolean).join('/');
}

function safePathSegment(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
