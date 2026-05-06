import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const installerDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(installerDir, '..');
const templatePath = path.join(packageRoot, 'templates', 'superduperpowers.settings.jsonc');

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

export function ensureSettingsFile(filePath, options = {}) {
  if (fs.existsSync(filePath) && !options.overwrite) {
    return { changed: false, action: 'kept', filePath };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, readSettingsTemplate(), 'utf8');
  return { changed: true, action: fs.existsSync(filePath) ? 'written' : 'created', filePath };
}
