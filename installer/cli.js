import { createInterface } from 'node:readline/promises';
import fs from 'node:fs';
import path from 'node:path';
import { createPathContext, summarizeOpenCodeEnvOverrides } from './paths.js';
import {
  hasSuperDuperPowersPlugin,
  parseInlineOpenCodeConfigContent,
  planAddSuperDuperPowersPlugin,
  planRemoveSuperDuperPowersPlugin,
  readOpenCodeConfig,
  writeOpenCodeConfigPlan,
} from './opencode-config.js';
import { ensureDefaultIgnoreHygiene } from './ignore-hygiene.js';
import { ensureSettingsFile, globalSettingsPath, projectSettingsPath, settingsExists } from './settings.js';
import { writeStatusReport } from './status.js';
import { runUninstall } from './uninstall.js';

const COMMANDS = new Set(['install', 'uninstall', 'status']);
const FLAGS = new Set(['--repo', '--global', '--all', '--dry-run', '--help']);

export async function runCli(args = [], io = {}) {
  const context = normalizeIo(io);
  let parsed;

  try {
    parsed = parseArgs(args);
  } catch (error) {
    context.stderr.write(`${error.message}\n\n`);
    writeHelp(context.stderr);
    return 2;
  }

  if (parsed.help) {
    writeHelp(context.stdout);
    return 0;
  }

  const installState = await context.detectInstallState(context);

  if (parsed.command === 'status') {
    return reportStatus(parsed, installState, context);
  }

  if (parsed.command === 'uninstall') {
    return dispatchUninstall(parsed, installState, context);
  }

  return dispatchInstall(parsed, installState, context);
}

export function parseArgs(args = []) {
  const parsed = {
    command: 'install',
    explicitCommand: false,
    repo: false,
    global: false,
    all: false,
    dryRun: false,
    help: false,
    scopes: [],
  };

  for (const arg of args) {
    if (COMMANDS.has(arg)) {
      if (parsed.explicitCommand) {
        throw new Error(`Only one subcommand is supported; received '${arg}' after '${parsed.command}'.`);
      }
      parsed.command = arg;
      parsed.explicitCommand = true;
      continue;
    }

    if (!FLAGS.has(arg)) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    if (arg === '--repo') parsed.repo = true;
    if (arg === '--global') parsed.global = true;
    if (arg === '--all') parsed.all = true;
    if (arg === '--dry-run') parsed.dryRun = true;
    if (arg === '--help') parsed.help = true;
  }

  if (parsed.repo && parsed.global) {
    parsed.all = true;
  }

  if (parsed.all) {
    parsed.scopes = ['project', 'global'];
  } else if (parsed.repo) {
    parsed.scopes = ['project'];
  } else if (parsed.global) {
    parsed.scopes = ['global'];
  }

  return parsed;
}

function normalizeIo(io) {
  return {
    cwd: io.cwd ?? process.cwd(),
    env: io.env ?? process.env,
    stdin: io.stdin ?? process.stdin,
    stdout: io.stdout ?? process.stdout,
    stderr: io.stderr ?? process.stderr,
    detectInstallState: io.detectInstallState ?? detectInstallState,
    pathContext: io.pathContext ?? createPathContext(io),
  };
}

async function detectInstallState(context = {}) {
  const pathContext = context.pathContext ?? createPathContext(context);
  const projectSettings = projectSettingsPath(pathContext.projectRoot);
  const globalSettings = globalSettingsPath(pathContext.openCodeConfigDir);
  const projectDetection = detectScopeFromCandidates(pathContext.projectConfigCandidates, projectSettings);
  const globalDetection = detectScopeFromCandidates(pathContext.globalConfigCandidates, globalSettings);
  const inlineConfig = pathContext.envOverrides.opencodeConfigContent
    ? parseInlineOpenCodeConfigContent(pathContext.envOverrides.opencodeConfigContent)
    : null;

  return {
    project: projectDetection.detected,
    global: globalDetection.detected,
    projectSource: projectDetection.source,
    globalSource: globalDetection.source,
    projectSettings,
    globalSettings,
    pathContext,
    inlineConfig,
  };
}

function detectScopeFromCandidates(candidates, settingsPath) {
  if (settingsPath && fs.existsSync(settingsPath)) {
    return { detected: true, source: settingsPath };
  }

  let firstConfigWithoutPlugin = null;

  for (const candidate of candidates) {
    const config = readOpenCodeConfig(candidate);
    if (config.status === 'missing') continue;
    if (hasSuperDuperPowersPlugin(config)) {
      return { detected: true, source: candidate };
    }
    if (config.status === 'needs-manual-attention') {
      return { detected: false, source: `${candidate} needs manual attention` };
    }
    firstConfigWithoutPlugin ??= candidate;
  }

  if (firstConfigWithoutPlugin) {
    return { detected: false, source: `${firstConfigWithoutPlugin} without SuperDuperPowers plugin` };
  }

  return { detected: false, source: 'no OpenCode config found' };
}

function installScope(scope, parsed, context) {
  if (context.pathContext?.envOverrides?.opencodeConfigContent) {
    const inlineConfig = parseInlineOpenCodeConfigContent(context.pathContext.envOverrides.opencodeConfigContent);
    if (inlineConfig.status === 'needs-manual-attention') {
      return result(scope, 'needs manual attention', [], [inlineConfig.reason, 'Add plugin manually: "plugin": ["superduperpowers"]']);
    }
  }

  try {
    return scope === 'project'
      ? installProjectScope(parsed, context)
      : installGlobalScope(parsed, context);
  } catch (error) {
    return result(scope, 'needs manual attention', [], [error.message]);
  }
}

function installProjectScope(parsed, context) {
  const projectRoot = context.pathContext.projectRoot;
  const configPlan = planScopeConfig({
    candidates: context.pathContext.projectConfigCandidates,
    fallbackPath: path.join(projectRoot, 'opencode.json'),
    seedCandidates: context.pathContext.globalConfigCandidates,
    allowSeed: parsed.seedProjectFromGlobal !== false,
    reinstall: parsed.reinstall,
  });
  const settingsPath = projectSettingsPath(projectRoot);
  return applyInstallPlan('project', configPlan, settingsPath, parsed, () => ensureDefaultIgnoreHygiene(projectRoot));
}

function installGlobalScope(parsed, context) {
  const configDir = context.pathContext.openCodeConfigDir;
  const configPlan = planScopeConfig({
    candidates: context.pathContext.globalConfigCandidates,
    fallbackPath: path.join(configDir, 'opencode.json'),
    reinstall: parsed.reinstall,
  });
  return applyInstallPlan('global', configPlan, globalSettingsPath(configDir), parsed);
}

function planScopeConfig({ candidates, fallbackPath, seedCandidates = [], allowSeed = false, reinstall = false }) {
  let targetPath = null;
  let parsedConfig = null;
  const warnings = [];
  let firstExisting = null;

  for (const candidate of candidates) {
    const parsed = readOpenCodeConfig(candidate);
    if (parsed.status === 'missing') continue;
    firstExisting ??= { candidate, parsed };
    if (hasSuperDuperPowersPlugin(parsed)) {
      targetPath = candidate;
      parsedConfig = parsed;
      break;
    }
  }

  if (!parsedConfig && firstExisting) {
    targetPath = firstExisting.candidate;
    parsedConfig = firstExisting.parsed;
  }

  if (!parsedConfig && allowSeed) {
    for (const candidate of seedCandidates) {
      const parsed = readOpenCodeConfig(candidate);
      if (parsed.status !== 'ok') continue;
      targetPath = fallbackPath;
      parsedConfig = { ...parsed, filePath: targetPath };
      warnings.push(`seeded new project config from ${candidate}`);
      break;
    }
  }

  if (!parsedConfig) {
    targetPath = fallbackPath;
    parsedConfig = { status: 'ok', config: {}, raw: null, filePath: targetPath, format: 'json', parsedAs: 'object' };
  }

  if (parsedConfig.status !== 'ok') return parsedConfig;

  const base = reinstall ? planRemoveSuperDuperPowersPlugin(parsedConfig) : { status: 'ready', config: parsedConfig.config, changed: false, filePath: targetPath, warnings: [] };
  if (base.status !== 'ready') return base;
  const addPlan = planAddSuperDuperPowersPlugin({ ...parsedConfig, config: base.config, filePath: targetPath });
  return { ...addPlan, changed: base.changed || addPlan.changed || targetPath === fallbackPath && !fs.existsSync(targetPath), warnings: [...warnings, ...(base.warnings || []), ...(addPlan.warnings || [])] };
}

function applyInstallPlan(scope, configPlan, targetSettingsPath, parsed, hygieneCallback) {
  const modifiedFiles = [];
  const messages = [];

  if (configPlan.status !== 'ready') {
    return result(scope, 'needs manual attention', [], [configPlan.detail || configPlan.reason || 'OpenCode config could not be updated safely.']);
  }

  const settingsAlreadyExists = settingsExists(targetSettingsPath);
  const configAlreadyExists = fs.existsSync(configPlan.filePath);
  const settingsAction = parsed.settingsActions?.[scope] || 'keep';

  if (settingsAction === 'cancel') {
    return result(scope, 'skipped', [], ['cancelled before writing settings']);
  }

  if (parsed.dryRun) {
    const planned = [];
    if (configPlan.changed || !configAlreadyExists) planned.push(configPlan.filePath);
    if (!settingsAlreadyExists) planned.push(targetSettingsPath);
    if (scope === 'project') planned.push(path.join(path.dirname(configPlan.filePath), '.gitignore'), path.join(path.dirname(configPlan.filePath), '.ignore'));
    return result(scope, planned.length > 0 ? 'updated' : 'already current', planned, ['dry run; no files changed', ...configPlan.warnings]);
  }

  if (configPlan.changed || !configAlreadyExists) {
    fs.mkdirSync(path.dirname(configPlan.filePath), { recursive: true });
    writeOpenCodeConfigPlan(configPlan);
    modifiedFiles.push(configPlan.filePath);
  }

  if (settingsAlreadyExists && settingsAction !== 'overwrite') {
    messages.push(`kept existing settings: ${targetSettingsPath}`);
  } else {
    const written = ensureSettingsFile(targetSettingsPath, { overwrite: settingsAction === 'overwrite' });
    if (written.changed) modifiedFiles.push(targetSettingsPath);
  }

  if (scope === 'project' && hygieneCallback) {
    for (const hygiene of hygieneCallback()) {
      if (hygiene.changed) modifiedFiles.push(hygiene.filePath);
    }
  }

  messages.push(...configPlan.warnings);
  const status = modifiedFiles.length === 0 ? 'already current' : (configAlreadyExists || settingsAlreadyExists ? 'updated' : 'installed');
  return result(scope, status, modifiedFiles, messages);
}

function result(scope, status, modifiedFiles = [], messages = []) {
  return { scope, status, modifiedFiles, messages: messages.filter(Boolean) };
}

function projectConfigExists(context) {
  return context.pathContext.projectConfigCandidates.some((candidate) => fs.existsSync(candidate));
}

function globalConfigExists(context) {
  return context.pathContext.globalConfigCandidates.some((candidate) => fs.existsSync(candidate));
}

async function dispatchInstall(parsed, installState, context) {
  if (parsed.scopes.length > 0) {
    return planScopedInstall(parsed, context);
  }

  const detectedScopes = scopesFromInstallState(installState);
  if (!isInteractive(context)) {
    if (detectedScopes.length === 0) {
      context.stderr.write('No existing SuperDuperPowers install was detected. Re-run with --repo for this project or --global for your OpenCode user config.\n');
      return 1;
    }

    return planScopedInstall({ ...parsed, scopes: detectedScopes }, context);
  }

  return dispatchInteractiveInstall(parsed, installState, context);
}

function planScopedInstall(parsed, context) {
  const scopes = parsed.scopes.length > 0 ? parsed.scopes : ['project'];
  const results = scopes.map((scope) => installScope(scope, parsed, context));
  context.stdout.write(`SuperDuperPowers install results for ${formatScopes(scopes)}:\n`);
  for (const result of results) {
    context.stdout.write(`- ${result.scope}: ${result.status}\n`);
    for (const message of result.messages) context.stdout.write(`  - ${message}\n`);
    if (result.modifiedFiles.length > 0) {
      context.stdout.write('  - modified files:\n');
      for (const file of result.modifiedFiles) context.stdout.write(`    - ${file}\n`);
    }
  }
  writePathContextNotes(context);
  context.stdout.write('Restart OpenCode after install/update so plugin changes are loaded.\n');
  return results.some((result) => result.status === 'needs manual attention') ? 1 : 0;
}

async function dispatchInteractiveInstall(parsed, installState, context) {
  if (installState.global && !installState.project) {
    return promptOnlyGlobalDetected(parsed, installState, context);
  }

  if (installState.project && !installState.global) {
    return promptOnlyProjectDetected(parsed, installState, context);
  }

  if (installState.project && installState.global) {
    return promptProjectAndGlobalDetected(parsed, installState, context);
  }

  return promptNoInstallDetected(parsed, installState, context);
}

async function promptOnlyGlobalDetected(parsed, installState, context) {
  return chooseInteractiveAction(context, 'SuperDuperPowers is already configured globally.', [
    choice('Update global install', () => confirmInteractiveInstall(['global'], parsed, context)),
    choice('Reinstall global', () => confirmInteractiveInstall(['global'], { ...parsed, reinstall: true }, context)),
    choice('Install project too', () => confirmInteractiveInstall(['project'], parsed, context)),
    choice('Show status', () => reportStatus(parsed, installState, context)),
    choice('Uninstall', () => dispatchUninstall({ ...parsed, scopes: ['global'] }, installState, context)),
    choice('Cancel', () => cancel(context), true),
  ]);
}

async function promptOnlyProjectDetected(parsed, installState, context) {
  return chooseInteractiveAction(context, 'SuperDuperPowers is already configured for this project.', [
    choice('Update project install', () => confirmInteractiveInstall(['project'], parsed, context)),
    choice('Reinstall project', () => confirmInteractiveInstall(['project'], { ...parsed, reinstall: true }, context)),
    choice('Install global too', () => confirmInteractiveInstall(['global'], parsed, context)),
    choice('Show status', () => reportStatus(parsed, installState, context)),
    choice('Uninstall', () => dispatchUninstall({ ...parsed, scopes: ['project'] }, installState, context)),
    choice('Cancel', () => cancel(context), true),
  ]);
}

async function promptProjectAndGlobalDetected(parsed, installState, context) {
  return chooseInteractiveAction(context, 'SuperDuperPowers is configured globally and for this project.', [
    choice('Update both installs', () => confirmInteractiveInstall(['project', 'global'], parsed, context)),
    choice('Reinstall both', () => confirmInteractiveInstall(['project', 'global'], { ...parsed, reinstall: true }, context)),
    choice('Choose scopes manually', () => promptManualScopes(parsed, context)),
    choice('Show status', () => reportStatus(parsed, installState, context)),
    choice('Uninstall', () => dispatchUninstall({ ...parsed, scopes: ['project', 'global'] }, installState, context)),
    choice('Cancel', () => cancel(context), true),
  ]);
}

async function promptNoInstallDetected(parsed, installState, context) {
  return chooseInteractiveAction(context, 'No existing SuperDuperPowers install was detected.', [
    choice('Install for project', () => confirmInteractiveInstall(['project'], parsed, context)),
    choice('Install globally', () => confirmInteractiveInstall(['global'], parsed, context)),
    choice('Install both', () => confirmInteractiveInstall(['project', 'global'], parsed, context)),
    choice('Show status', () => reportStatus(parsed, installState, context)),
    choice('Uninstall', () => dispatchUninstall(parsed, installState, context)),
    choice('Cancel', () => cancel(context), true),
  ]);
}

async function promptManualScopes(parsed, context) {
  return chooseInteractiveAction(context, 'Choose install scope.', [
    choice('Project', () => confirmInteractiveInstall(['project'], parsed, context)),
    choice('Global', () => confirmInteractiveInstall(['global'], parsed, context)),
    choice('Both', () => confirmInteractiveInstall(['project', 'global'], parsed, context)),
    choice('Cancel', () => cancel(context), true),
  ]);
}

async function chooseInteractiveAction(context, heading, choices) {
  const defaultIndex = choices.findIndex((item) => item.defaultChoice);
  const readline = createInterface({ input: context.stdin, output: context.stdout });

  try {
    context.stdout.write(`${heading}\n`);
    choices.forEach((item, index) => {
      const suffix = index === defaultIndex ? ' [default]' : '';
      context.stdout.write(`  ${index + 1}. ${item.label}${suffix}\n`);
    });

    while (true) {
      const prompt = defaultIndex >= 0 ? `Choose 1-${choices.length} [${defaultIndex + 1}]: ` : `Choose 1-${choices.length}: `;
      const answer = (await readline.question(prompt)).trim();

      if (answer === '' && defaultIndex >= 0) {
        return choices[defaultIndex].run();
      }

      const selected = Number(answer);
      if (Number.isInteger(selected) && selected >= 1 && selected <= choices.length) {
        return choices[selected - 1].run();
      }

      context.stdout.write('Enter a listed number, or press Ctrl+C to cancel.\n');
    }
  } finally {
    readline.close();
  }
}

function choice(label, run, defaultChoice = false) {
  return { label, run, defaultChoice };
}

async function confirmInteractiveInstall(scopes, parsed, context) {
  if (scopes.includes('project')) {
    const rootConfirmed = await confirmProjectRoot(context);
    if (!rootConfirmed) return cancel(context);

    if (!projectConfigExists(context) && globalConfigExists(context)) {
      parsed = { ...parsed, seedProjectFromGlobal: await confirmSeedProjectFromGlobal(context) };
    }
  }

  parsed = { ...parsed, settingsActions: await promptSettingsActions(scopes, context) };
  const plan = plannedInstallChanges(scopes, parsed, context);
  const confirmed = await confirmPlannedChanges(plan, context);
  if (!confirmed) {
    return cancel(context);
  }

  return planScopedInstall({ ...parsed, scopes }, context);
}

async function confirmProjectRoot(context) {
  const readline = createInterface({ input: context.stdin, output: context.stdout });
  try {
    const answer = (await readline.question(`Detected project root: ${context.pathContext.projectRoot}\nInstall to this project? [y/N]: `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}

async function confirmSeedProjectFromGlobal(context) {
  const readline = createInterface({ input: context.stdin, output: context.stdout });
  try {
    const answer = (await readline.question('No project OpenCode config exists. Seed new project opencode.json from global config? [Y/n]: ')).trim().toLowerCase();
    return answer === '' || answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}

async function promptSettingsActions(scopes, context) {
  const actions = {};
  for (const scope of scopes) {
    const filePath = scope === 'project' ? projectSettingsPath(context.pathContext.projectRoot) : globalSettingsPath(context.pathContext.openCodeConfigDir);
    if (!settingsExists(filePath)) continue;
    actions[scope] = await chooseInteractiveAction(context, `Existing ${scope} SuperDuperPowers settings found: ${filePath}`, [
      choice('Keep existing settings', () => 'keep', true),
      choice('Overwrite from template', () => 'overwrite'),
      choice('Show path and skip', () => {
        context.stdout.write(`${filePath}\n`);
        return 'skip';
      }),
      choice('Cancel', () => 'cancel'),
    ]);
  }
  return actions;
}

export async function confirmPlannedChanges(plan, context) {
  context.stdout.write('Planned file changes:\n');
  for (const group of plan) {
    context.stdout.write(`- ${group.scope}:\n`);
    for (const file of group.files) {
      context.stdout.write(`  - ${file}\n`);
    }
  }

  const readline = createInterface({ input: context.stdin, output: context.stdout });
  try {
    const answer = (await readline.question('Apply these changes? [y/N]: ')).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}

function plannedInstallChanges(scopes, parsed, context) {
  return scopes.map((scope) => {
    if (scope === 'project') {
      const configPlan = planScopeConfig({
        candidates: context.pathContext.projectConfigCandidates,
        fallbackPath: path.join(context.pathContext.projectRoot, 'opencode.json'),
        seedCandidates: context.pathContext.globalConfigCandidates,
        allowSeed: parsed.seedProjectFromGlobal !== false,
        reinstall: parsed.reinstall,
      });
      return {
        scope,
        files: [
          configPlan.filePath || path.join(context.pathContext.projectRoot, 'opencode.json'),
          projectSettingsPath(context.pathContext.projectRoot),
          path.join(context.pathContext.projectRoot, '.gitignore'),
          path.join(context.pathContext.projectRoot, '.ignore'),
        ],
      };
    }

    const configPlan = planScopeConfig({
      candidates: context.pathContext.globalConfigCandidates,
      fallbackPath: path.join(context.pathContext.openCodeConfigDir, 'opencode.json'),
      reinstall: parsed.reinstall,
    });
    return {
      scope,
      files: [
        configPlan.filePath || path.join(context.pathContext.openCodeConfigDir, 'opencode.json'),
        globalSettingsPath(context.pathContext.openCodeConfigDir),
      ],
    };
  });
}

async function dispatchUninstall(parsed, installState, context) {
  return runUninstall(parsed, installState, { ...context, isInteractive: isInteractive(context) });
}

function reportStatus(parsed, installState, context) {
  writeStatusReport(installState, context.stdout);
  return 0;
}

function writePathContextNotes(context) {
  if (!context.pathContext) return;
  context.stdout.write(`Project root: ${context.pathContext.projectRoot}\n`);
  context.stdout.write(`OpenCode config dir: ${context.pathContext.openCodeConfigDir}\n`);
  for (const line of summarizeOpenCodeEnvOverrides(context.pathContext.envOverrides)) {
    context.stdout.write(`Environment: ${line}\n`);
  }
}

function scopesFromInstallState(installState) {
  const scopes = [];
  if (installState.project) scopes.push('project');
  if (installState.global) scopes.push('global');
  return scopes;
}

function formatScopes(scopes) {
  if (scopes.length === 2) return 'project and global scopes';
  if (scopes[0] === 'project') return 'the project scope';
  if (scopes[0] === 'global') return 'the global scope';
  return 'no scopes';
}

function isInteractive(context) {
  return Boolean(context.stdin?.isTTY && context.stdout?.isTTY);
}

function cancel(context) {
  context.stdout.write('Cancelled. No files were changed.\n');
  return 0;
}

function writeHelp(stream) {
  stream.write(`SuperDuperPowers installer\n\n`);
  stream.write(`Usage:\n`);
  stream.write(`  superduperpowers [install] [--repo|--global|--all] [--dry-run]\n`);
  stream.write(`  superduperpowers uninstall [--repo|--global|--all] [--dry-run]\n`);
  stream.write(`  superduperpowers status [--repo|--global|--all]\n\n`);
  stream.write(`Commands:\n`);
  stream.write(`  install      Install or update SuperDuperPowers (default)\n`);
  stream.write(`  uninstall    Remove SuperDuperPowers integration\n`);
  stream.write(`  status       Show detected install state\n\n`);
  stream.write(`Flags:\n`);
  stream.write(`  --repo       Target this repository/project\n`);
  stream.write(`  --global     Target the OpenCode user config\n`);
  stream.write(`  --all        Target project and global scopes\n`);
  stream.write(`  --dry-run    Print planned action without writing\n`);
  stream.write(`  --help       Show this help\n`);
}
