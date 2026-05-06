import fs from 'node:fs';
import { parseInlineOpenCodeConfigContent, readOpenCodeConfig } from './opencode-config.js';

export function writeStatusReport(installState, stream) {
  const context = installState.pathContext;
  stream.write('SuperDuperPowers install status:\n');
  stream.write(`- project root: ${context.projectRoot}\n`);
  stream.write(`- global OpenCode config dir: ${context.openCodeConfigDir}\n`);
  stream.write(`- OPENCODE_CONFIG: ${context.envOverrides.opencodeConfig ? `${context.envOverrides.opencodeConfig} (reported only; not targeted automatically)` : 'not set'}\n`);
  stream.write(`- OPENCODE_CONFIG_CONTENT: ${context.envOverrides.opencodeConfigContent ? 'set; inline plugin config cannot be edited by this installer' : 'not set'}\n`);

  if (context.envOverrides.opencodeConfigContent) {
    const inline = installState.inlineConfig ?? parseInlineOpenCodeConfigContent(context.envOverrides.opencodeConfigContent);
    const status = inline.status === 'needs-manual-attention' ? 'needs manual attention' : 'present; not targeted automatically';
    stream.write(`- inline config status: ${status}\n`);
    if (inline.reason) stream.write(`  - ${inline.reason}\n`);
  }

  writeScopeStatus(stream, 'project', context.projectConfigCandidates, installState.projectSettings);
  writeScopeStatus(stream, 'global', context.globalConfigCandidates, installState.globalSettings);
}

function writeScopeStatus(stream, scope, configCandidates, settingsPath) {
  stream.write(`- ${scope} OpenCode config paths:\n`);
  for (const candidate of configCandidates) {
    stream.write(`  - ${candidate}: ${fs.existsSync(candidate) ? 'exists' : 'missing'}; plugin: ${classifyConfig(candidate)}\n`);
  }
  stream.write(`- ${scope} SuperDuperPowers settings path: ${settingsPath}: ${fs.existsSync(settingsPath) ? 'exists' : 'missing'}\n`);
}

function classifyConfig(filePath) {
  const parsed = readOpenCodeConfig(filePath);
  if (parsed.status === 'missing') return 'absent';
  if (parsed.status !== 'ok') return `needs manual attention (${parsed.reason || 'parse failed'})`;
  if (parsed.config.plugin === undefined) return 'absent';
  if (!Array.isArray(parsed.config.plugin)) return 'needs manual attention (plugin is not an array)';

  const entries = parsed.config.plugin.map(classifyPluginEntry).filter(Boolean);
  if (entries.length === 0) return 'absent';
  return [...new Set(entries)].join(', ');
}

function classifyPluginEntry(entry) {
  if (entry === 'superduperpowers') return 'npm';
  if (typeof entry !== 'string' || !entry.startsWith('superduperpowers@')) return null;
  if (/github\.com[:/]notchrisbutler\/superduperpowers|github\.com[:/]obra\/superpowers|git\+https?:|https?:/.test(entry)) return 'GitHub';
  if (/git\+file:|file:|^superduperpowers@\.\.?\//.test(entry)) return 'local';
  return 'needs manual attention';
}
