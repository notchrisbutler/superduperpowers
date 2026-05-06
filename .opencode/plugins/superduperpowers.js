/**
 * SuperDuperPowers plugin for OpenCode.ai
 *
 * Injects SuperDuperPowers bootstrap context via user-message transform.
 * Auto-registers skills and workflow agents, and exposes workflow tools.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { autoRepairRuntimeState, createSdpTools, getRuntimePaths, loadEffectiveSettings, profileSummaryText, readProfileJsonSafe, settingsSummaryText, validateRuntimePathContainment } from './superduperpowers/sdp-tools.js';
import { buildTuiCommands, getBootstrapContent, registerBundledConfig } from './superduperpowers/sdp-registration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Normalize a path: trim whitespace, expand ~, resolve to absolute
const normalizePath = (p, homeDir) => {
  if (!p || typeof p !== 'string') return null;
  let normalized = p.trim();
  if (!normalized) return null;
  if (normalized.startsWith('~/')) {
    normalized = path.join(homeDir, normalized.slice(2));
  } else if (normalized === '~') {
    normalized = homeDir;
  }
  return path.resolve(normalized);
};

export const SuperpowersPlugin = async ({ client, directory, worktree } = {}) => {
  const homeDir = os.homedir();
  const superpowersAgentsDir = path.resolve(__dirname, '../../agents');
  const superpowersSkillsDir = path.resolve(__dirname, '../../skills');
  const envConfigDir = normalizePath(process.env.OPENCODE_CONFIG_DIR, homeDir);
  const configDir = envConfigDir || path.join(homeDir, '.config/opencode');
  let registrationReport = null;
  const driftCheckedSessions = new Set();

  const packageInfo = {
    packageRoot: path.resolve(__dirname, '../..'),
    pluginFile: fileURLToPath(import.meta.url),
    skillsDir: superpowersSkillsDir,
    agentsDir: superpowersAgentsDir,
    defaultSettingsPath: path.resolve(__dirname, '../../defaults/superduperpowers.config.jsonc')
  };

  return {
    tool: createSdpTools({
      configDir,
      packageInfo,
      getRegistrationReport: () => registrationReport
    }),

    // Inject skills path into live config so OpenCode discovers superpowers skills
    // without requiring manual symlinks or config file edits.
    // This works because Config.get() returns a cached singleton — modifications
    // here are visible when skills are lazily discovered later.
    config: async (config) => {
      registrationReport = registerBundledConfig(config, {
        skillsDir: superpowersSkillsDir,
        agentsDir: superpowersAgentsDir
      });
    },

    // Inject bootstrap into the first user message of each session.
    // Using a user message instead of a system message avoids:
    //   1. Token bloat from system messages repeated every turn (#750)
    //   2. Multiple system messages breaking Qwen and other models (#894)
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent(superpowersSkillsDir);
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      // Only inject once
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      const activeDirectory = directory || worktree || process.cwd();
      const settings = loadEffectiveSettings({ configDir, packageInfo, directory: activeDirectory });
      firstUser.parts.unshift({ ...ref, type: 'text', text: `${bootstrap}\n\n${settingsSummaryText(settings)}` });
    },

    'chat.message': async (input) => {
      if (!input?.sessionID || driftCheckedSessions.has(input.sessionID)) return;
      driftCheckedSessions.add(input.sessionID);
      const activeDirectory = directory || worktree || process.cwd();
      const activeWorktree = worktree || directory || process.cwd();
      autoRepairRuntimeState({
        configDir,
        packageInfo,
        context: {
          sessionID: input.sessionID,
          messageID: input.messageID || null,
          directory: activeDirectory,
          worktree: activeWorktree
        }
      });
    },

    'experimental.session.compacting': async (input, output) => {
      const sessionID = input?.sessionID;
      if (!sessionID) return output;
      const activeDirectory = directory || worktree || process.cwd();
      const paths = getRuntimePaths(configDir, sessionID, activeDirectory);
      if (validateRuntimePathContainment(paths).length > 0) return output;
      for (const dirPath of [paths.runtimeRoot, paths.stateRoot]) {
        try {
          const stat = fs.lstatSync(dirPath);
          if (stat.isSymbolicLink() || !stat.isDirectory()) return output;
        } catch {
          return output;
        }
      }
      try {
        const stat = fs.lstatSync(paths.stateDir);
        if (stat.isSymbolicLink() || !stat.isDirectory()) return output;
      } catch {
        return output;
      }
      const profilePath = path.join(paths.stateDir, 'profile.json');

      const profile = readProfileJsonSafe(profilePath);
      if (!profile.value || profile.errors.length > 0) return output;
      const summary = profileSummaryText(profile.value);
      if (output && Array.isArray(output.context)) {
        output.context.push(summary);
      }
      return output;
    }
  };
};

export const SuperpowersTuiPlugin = async (api = {}) => {
  if (typeof api.command?.register !== 'function') return {};

  api.command.register(() => buildTuiCommands({
    client: api.client,
    workspace: api.workspace
  }));

  return {};
};

export const tui = SuperpowersTuiPlugin;
