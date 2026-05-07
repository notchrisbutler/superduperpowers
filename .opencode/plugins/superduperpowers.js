/**
 * SuperDuperPowers plugin for OpenCode.ai
 *
 * Injects SuperDuperPowers bootstrap context via user-message transform.
 * Auto-registers skills and workflow agents.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { buildTuiCommands, getBootstrapContent, registerBundledConfig } from './superduperpowers/sdp-registration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SuperpowersPlugin = async () => {
  const superpowersAgentsDir = path.resolve(__dirname, '../../agents');
  const superpowersSkillsDir = path.resolve(__dirname, '../../skills');

  return {
    // Inject skills path into live config so OpenCode discovers superpowers skills
    // without requiring manual symlinks or config file edits.
    // This works because Config.get() returns a cached singleton — modifications
    // here are visible when skills are lazily discovered later.
    config: async (config) => {
      registerBundledConfig(config, {
        skillsDir: superpowersSkillsDir,
        agentsDir: superpowersAgentsDir
      });
    },

    // Inject bootstrap into the first user message of each session.
    // Using a user message instead of a system message avoids:
    //   1. Token bloat from system messages repeated every turn (#750)
    //   2. Multiple system messages breaking Qwen and other models (#894)
    [`experimental.chat${'.messages.transform'}`]: async (_input, output) => {
      const bootstrap = getBootstrapContent(superpowersSkillsDir);
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      // Only inject once
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
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
