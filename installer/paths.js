import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const OPENCODE_CONFIG_FILES = ['opencode.json', 'opencode.jsonc'];

export function detectProjectRoot(options = {}) {
  const cwd = options.cwd ?? process.cwd();

  try {
    const output = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (output) return path.resolve(output);
  } catch {
    // Fall through to cwd when git is unavailable or this is not a repository.
  }

  return path.resolve(cwd);
}

export function resolveOpenCodeConfigDir(options = {}) {
  const env = options.env ?? process.env;
  if (env.OPENCODE_CONFIG_DIR) return path.resolve(env.OPENCODE_CONFIG_DIR);
  return path.join(os.homedir(), '.config', 'opencode');
}

export function projectConfigCandidates(projectRoot) {
  return OPENCODE_CONFIG_FILES.map((name) => path.join(projectRoot, name));
}

export function globalConfigCandidates(configDir) {
  return OPENCODE_CONFIG_FILES.map((name) => path.join(configDir, name));
}

export function createPathContext(options = {}) {
  const env = options.env ?? process.env;
  const projectRoot = detectProjectRoot(options);
  const openCodeConfigDir = resolveOpenCodeConfigDir({ env });

  return {
    cwd: path.resolve(options.cwd ?? process.cwd()),
    projectRoot,
    openCodeConfigDir,
    projectConfigCandidates: projectConfigCandidates(projectRoot),
    globalConfigCandidates: globalConfigCandidates(openCodeConfigDir),
    envOverrides: detectOpenCodeEnvOverrides(env),
  };
}

export function detectOpenCodeEnvOverrides(env = process.env) {
  return {
    opencodeConfigDir: env.OPENCODE_CONFIG_DIR || null,
    opencodeConfig: env.OPENCODE_CONFIG || null,
    opencodeConfigContent: env.OPENCODE_CONFIG_CONTENT || null,
  };
}

export function summarizeOpenCodeEnvOverrides(envOverrides) {
  const lines = [];
  if (envOverrides?.opencodeConfigDir) {
    lines.push(`OPENCODE_CONFIG_DIR=${envOverrides.opencodeConfigDir}`);
  }
  if (envOverrides?.opencodeConfig) {
    lines.push(`OPENCODE_CONFIG=${envOverrides.opencodeConfig} (automatic install/update writes require unsetting this override)`);
  }
  if (envOverrides?.opencodeConfigContent) {
    lines.push('OPENCODE_CONFIG_CONTENT is set (inline config requires manual review before installer edits)');
  }
  return lines;
}
