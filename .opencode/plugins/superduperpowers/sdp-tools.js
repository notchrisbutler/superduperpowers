import { tool } from '@opencode-ai/plugin';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { expectedCommandNames, extractAndStripFrontmatter } from './sdp-registration.js';

const SDP_SCHEMA_VERSION = 1;
const SDP_RUNTIME_DIR = 'superduperpowers';
const SDP_DEFAULT_RETENTION_DAYS = 7;
const SDP_DOC_ROOT_CANDIDATES = ['docs', 'documents', 'documentation', '.docs', '.documents', '.documentation'];
const SDP_DOCS_DIR = 'superduperpowers';
const SDP_SETTINGS_FILE_CANDIDATES = [
  'superduperpowers.jsonc',
  'superduperpowers.json',
  'superduperpowers.config.jsonc',
  'superduperpowers.config.json',
  '.opencode/superduperpowers.jsonc',
  '.opencode/superduperpowers.json'
];
const SDP_USER_SETTINGS_FILE_CANDIDATES = [
  'superduperpowers/config.jsonc',
  'superduperpowers/config.json',
  'superduperpowers/settings.json',
  'superduperpowers/settings.jsonc'
];
const SDP_PROFILE_KEYS = new Set([
  'schemaVersion',
  'createdAt',
  'updatedAt',
  'sessionId',
  'messageId',
  'productName',
  'programmaticName',
  'skillNamespace',
  'invocationAliases',
  'route',
  'docsRoot',
  'sdpDocsRoot',
  'specsDir',
  'plansDir',
  'runtimeRoot',
  'stateRoot',
  'stateDir',
  'worktreeRoot',
  'generatedDocsPolicy',
  'workflowCommitPolicy',
  'executionMethod',
  'executionStrategy',
  'branchPolicy',
  'testingIntensity',
  'questionPolicy',
  'cleanupPolicy',
  'project',
  'harness'
]);
const SDP_MUTABLE_PROFILE_KEYS = new Set([
  'createdAt',
  'route',
  'docsRoot',
  'generatedDocsPolicy',
  'workflowCommitPolicy',
  'executionMethod',
  'executionStrategy',
  'branchPolicy',
  'testingIntensity',
  'questionPolicy',
  'cleanupPolicy'
]);
const SDP_ALIASES = [
  'superpowers',
  'Superpowers',
  'SuperPowers',
  'superduperpowers',
  'SuperDuperPowers',
  '/superpowers',
  '/superduperpowers',
  '/brainstorm'
];
const allowedRouteValues = ['full-brainstorming', 'quick-implementation', 'none'];
const allowedTestingIntensityValues = ['full-regression', 'major-behavior', 'existing-tests-only'];
const allowedGeneratedDocsPolicies = ['local-only', 'commit-after-approval'];
const allowedWorkflowCommitPolicies = ['disabled', 'implementation-commits-only', 'spec-plan-and-implementation-commits'];
const nullableDecisionKeys = new Set(['route', 'executionMethod', 'executionStrategy']);
const stringProfileInputKeys = new Set([
  'createdAt',
  'updatedAt',
  'messageId',
  'route',
  'docsRoot',
  'generatedDocsPolicy',
  'workflowCommitPolicy',
  'executionMethod',
  'executionStrategy',
  'branchPolicy',
  'testingIntensity',
  'questionPolicy',
  'productName',
  'programmaticName',
  'skillNamespace',
  'sdpDocsRoot',
  'specsDir',
  'plansDir',
  'runtimeRoot',
  'stateRoot',
  'stateDir',
  'worktreeRoot'
]);

const toPosixPath = (value) => value.split(path.sep).join('/');
const nowIso = () => new Date().toISOString();

const stripJsonComments = (input) => input
  .replace(/^\uFEFF/, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/,\s*([}\]])/g, '$1');

const deepMerge = (base, override) => {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      next[key] = deepMerge(base[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
};

const isPathInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const isSafePathSegment = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);

const defaultSettings = () => ({
  schemaVersion: SDP_SCHEMA_VERSION,
  workflow: {
    defaultRoute: null,
    defaultDocsRoot: 'docs',
    forceDefaultDocsRoot: false,
    generatedDocsPolicy: 'local-only',
    workflowCommitPolicy: 'implementation-commits-only',
    branchPolicy: 'prefer-feature-branch',
    preferFeatureBranches: true,
    defaultExecutionMethod: null,
    defaultExecutionStrategy: null,
    testingIntensity: 'major-behavior',
    questionPolicy: 'deep-questions-before-spec-avoid-during-execution',
    fullFlow: {
      useQuestionTool: true,
      requireSpecApproval: true,
      requirePlanApproval: true,
      reviewEachChunk: false,
      finalSpecReview: true,
      finalCodeReview: true
    },
    quickFlow: {
      maxClarifyingQuestions: 5,
      writeDocs: false,
      requireTdd: false,
      reviewIntensity: 'lite'
    }
  },
  paths: {
    runtimeDir: SDP_RUNTIME_DIR,
    docsDirName: SDP_DOCS_DIR,
    specsDirName: 'specs',
    plansDirName: 'plans',
    worktreesDirName: 'worktrees',
    stateDirName: 'state',
    quarantineDirName: 'quarantine'
  },
  cleanup: {
    mode: 'session-aware',
    retentionDays: SDP_DEFAULT_RETENTION_DAYS
  }
});

const readJsoncFile = (filePath) => {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return { value: JSON.parse(stripJsonComments(text)), errors: [] };
  } catch (error) {
    return { value: null, errors: [`invalid settings JSONC in ${filePath}: ${error.message}`] };
  }
};

const settingsSourcesFor = ({ configDir, packageInfo = {}, directory }) => {
  const sources = [];
  const packageRoot = packageInfo.packageRoot || path.resolve(path.dirname(fileURLSafe(packageInfo.pluginFile || '')), '../..');
  const defaultSettingsPath = packageInfo.defaultSettingsPath || path.join(packageRoot, 'defaults', 'superduperpowers.jsonc');
  const fallbackSettingsPath = path.join(packageRoot, 'defaults', 'superduperpowers.config.jsonc');
  if (defaultSettingsPath && fileExists(path.resolve(defaultSettingsPath))) {
    sources.push({ type: 'package-default', path: defaultSettingsPath });
  } else if (fallbackSettingsPath) {
    sources.push({ type: 'package-fallback', path: fallbackSettingsPath });
  }
  const projectRoot = path.resolve(directory || process.cwd());
  for (const candidate of SDP_USER_SETTINGS_FILE_CANDIDATES) sources.push({ type: 'user', path: path.join(configDir, candidate) });
  for (const candidate of SDP_SETTINGS_FILE_CANDIDATES) sources.push({ type: 'project', path: path.join(projectRoot, candidate) });
  return sources;
};

const fileURLSafe = (value) => value ? value : process.cwd();

const validateSettings = (settings) => {
  const errors = [];
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return { ok: false, errors: ['settings must be an object'] };
  if (settings.schemaVersion !== SDP_SCHEMA_VERSION) errors.push('settings.schemaVersion must be 1');
  const workflow = settings.workflow || {};
  const paths = settings.paths || {};
  const cleanup = settings.cleanup || {};
  if (workflow.defaultRoute !== null && workflow.defaultRoute !== undefined && !allowedRouteValues.includes(workflow.defaultRoute)) errors.push('workflow.defaultRoute is invalid');
  if (!isSafeProjectRelativePath(workflow.defaultDocsRoot)) errors.push('workflow.defaultDocsRoot must be a project-relative path');
  if (typeof workflow.forceDefaultDocsRoot !== 'boolean') errors.push('workflow.forceDefaultDocsRoot must be boolean');
  if (!allowedGeneratedDocsPolicies.includes(workflow.generatedDocsPolicy)) errors.push('workflow.generatedDocsPolicy is invalid');
  if (!allowedWorkflowCommitPolicies.includes(workflow.workflowCommitPolicy)) errors.push('workflow.workflowCommitPolicy is invalid');
  if (typeof workflow.preferFeatureBranches !== 'boolean') errors.push('workflow.preferFeatureBranches must be boolean');
  if (workflow.defaultExecutionMethod !== null && workflow.defaultExecutionMethod !== undefined && typeof workflow.defaultExecutionMethod !== 'string') errors.push('workflow.defaultExecutionMethod must be string or null');
  if (workflow.defaultExecutionStrategy !== null && workflow.defaultExecutionStrategy !== undefined && typeof workflow.defaultExecutionStrategy !== 'string') errors.push('workflow.defaultExecutionStrategy must be string or null');
  if (!allowedTestingIntensityValues.includes(workflow.testingIntensity)) errors.push('workflow.testingIntensity is invalid');
  if (typeof workflow.questionPolicy !== 'string' || !workflow.questionPolicy) errors.push('workflow.questionPolicy must be a non-empty string');
  for (const key of ['runtimeDir', 'docsDirName', 'specsDirName', 'plansDirName', 'worktreesDirName', 'stateDirName', 'quarantineDirName']) {
    if (!isSafePathSegment(paths[key])) errors.push(`paths.${key} must be a safe path segment`);
  }
  if (typeof cleanup.retentionDays !== 'number' || !Number.isInteger(cleanup.retentionDays) || cleanup.retentionDays < 1) errors.push('cleanup.retentionDays must be a positive integer');
  if (hasSecretLikeKey(settings)) errors.push('settings contains secret-like key');
  return { ok: errors.length === 0, errors };
};

export const loadEffectiveSettings = ({ configDir, packageInfo = {}, directory } = {}) => {
  let settings = defaultSettings();
  const loaded = [];
  const errors = [];
  const seen = new Set();
  for (const source of settingsSourcesFor({ configDir, packageInfo, directory })) {
    const sourcePath = path.resolve(source.path);
    if (seen.has(sourcePath)) continue;
    seen.add(sourcePath);
    if (!fileExists(sourcePath)) continue;
    const parsed = readJsoncFile(sourcePath);
    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
      loaded.push({ ...source, path: sourcePath, status: 'error' });
      continue;
    }
    settings = deepMerge(settings, parsed.value);
    loaded.push({ ...source, path: sourcePath, status: 'loaded' });
  }
  const validation = validateSettings(settings);
  errors.push(...validation.errors);
  return {
    ok: errors.length === 0,
    settings,
    sources: loaded,
    searched: settingsSourcesFor({ configDir, packageInfo, directory }).map((source) => ({ ...source, path: path.resolve(source.path) })),
    errors
  };
};

export const validateRuntimePathContainment = (paths) => {
  const errors = [];
  const sessionID = paths.sessionID || paths.sessionId || null;
  if (sessionID && !isSafePathSegment(sessionID)) errors.push('sessionID must be a safe path segment');
  if (paths.stateDir) {
    const relative = path.relative(paths.stateRoot, paths.stateDir);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) errors.push('stateDir is outside SuperDuperPowers state root');
  }
  if (paths.quarantineDir && !isPathInside(paths.quarantineRoot, paths.quarantineDir)) errors.push('quarantineDir is outside SuperDuperPowers quarantine root');
  if (paths.repairTempDir && !isPathInside(paths.quarantineRoot, paths.repairTempDir)) errors.push('repairTempDir is outside SuperDuperPowers quarantine root');
  return errors;
};

const safePathSegment = (value) => String(value || 'unknown').replace(/[^A-Za-z0-9_.-]/g, '_');

const isSafeProjectRelativePath = (value) => {
  if (!value || typeof value !== 'string' || path.isAbsolute(value)) return false;
  return !value.split(/[\\/]+/).some((segment) => segment === '..');
};

const validateRuntimeParentPaths = ({ runtimeRoot, stateRoot, quarantineRoot }) => {
  const errors = [];
  for (const [label, dirPath] of Object.entries({ runtimeRoot, stateRoot, quarantineRoot })) {
    if (!dirPath) continue;
    try {
      const stat = fs.lstatSync(dirPath);
      if (stat.isSymbolicLink()) errors.push(`${label} must not be a symlink`);
      if (!stat.isDirectory()) errors.push(`${label} must be a directory`);
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push(`invalid ${label}: ${error.message}`);
    }
  }
  return errors;
};

const doctorCheck = (checks, id, status, message, details = {}) => {
  checks.push({ id, status, message, details });
};

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

const dirExists = (dirPath) => {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
};

const readTextSafe = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

const summarizeDoctor = (checks) => ({
  ok: checks.every((check) => check.status !== 'error'),
  errors: checks.filter((check) => check.status === 'error').length,
  warnings: checks.filter((check) => check.status === 'warning').length,
  recommendations: checks
    .filter((check) => check.status !== 'ok')
    .map((check) => ({ id: check.id, recommendation: check.recommendation || check.message })),
  checks
});

const projectKeyFor = (directory) => {
  const normalized = path.resolve(directory || process.cwd());
  const base = path.basename(normalized).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 10);
  return `${base}-${hash}`;
};

export const getRuntimePaths = (configDir, sessionID, directory, settingsInput = null) => {
  const paths = settingsInput?.settings?.paths || settingsInput?.paths || {};
  const runtimeDir = paths.runtimeDir || SDP_RUNTIME_DIR;
  const stateDirName = paths.stateDirName || 'state';
  const worktreesDirName = paths.worktreesDirName || 'worktrees';
  const quarantineDirName = paths.quarantineDirName || 'quarantine';
  const runtimeRoot = path.join(configDir, runtimeDir);
  const stateRoot = path.join(runtimeRoot, stateDirName);
  const stateDir = sessionID ? path.join(stateRoot, sessionID) : null;
  const projectKey = projectKeyFor(directory);
  const worktreeRoot = path.join(runtimeRoot, worktreesDirName, projectKey);
  const quarantineRoot = path.join(runtimeRoot, quarantineDirName);
  return { runtimeRoot, stateRoot, stateDir, worktreeRoot, quarantineRoot, projectKey, sessionID };
};

const selectDocsRoot = (directory, override, settingsInput = null) => {
  if (override) return override.replace(/\/$/, '');
  const configuredDefault = settingsInput?.settings?.workflow?.defaultDocsRoot || settingsInput?.workflow?.defaultDocsRoot;
  const forceDefault = settingsInput?.settings?.workflow?.forceDefaultDocsRoot || settingsInput?.workflow?.forceDefaultDocsRoot;
  if (configuredDefault && forceDefault) return configuredDefault.replace(/\/$/, '');
  for (const candidate of SDP_DOC_ROOT_CANDIDATES) {
    if (fs.existsSync(path.join(directory, candidate)) && fs.statSync(path.join(directory, candidate)).isDirectory()) return candidate;
  }
  if (configuredDefault) return configuredDefault.replace(/\/$/, '');
  return 'docs';
};

const buildDefaultProfile = ({ configDir, context, profile = {}, settingsInput = null }) => {
  const directory = context.directory || context.worktree || process.cwd();
  const effectiveSettings = settingsInput || { settings: defaultSettings(), ok: true, errors: [], sources: [] };
  const settings = effectiveSettings.settings || defaultSettings();
  const docsRoot = selectDocsRoot(directory, profile.docsRoot, settings);
  const paths = getRuntimePaths(configDir, context.sessionID, directory, settings);
  const timestamp = nowIso();
  const docsDirName = settings.paths?.docsDirName || SDP_DOCS_DIR;
  const specsDirName = settings.paths?.specsDirName || 'specs';
  const plansDirName = settings.paths?.plansDirName || 'plans';
  const workflow = settings.workflow || {};
  const cleanup = settings.cleanup || {};
  return {
    schemaVersion: SDP_SCHEMA_VERSION,
    createdAt: profile.createdAt || timestamp,
    updatedAt: timestamp,
    sessionId: context.sessionID || null,
    messageId: context.messageID || null,
    productName: 'SuperDuperPowers',
    programmaticName: 'superduperpowers',
    skillNamespace: 'superpowers',
    invocationAliases: SDP_ALIASES,
    route: profile.route || workflow.defaultRoute || null,
    docsRoot,
    sdpDocsRoot: `${docsRoot}/${docsDirName}`,
    specsDir: `${docsRoot}/${docsDirName}/${specsDirName}`,
    plansDir: `${docsRoot}/${docsDirName}/${plansDirName}`,
    runtimeRoot: paths.runtimeRoot,
    stateRoot: paths.stateRoot,
    stateDir: paths.stateDir,
    worktreeRoot: paths.worktreeRoot,
    generatedDocsPolicy: profile.generatedDocsPolicy || workflow.generatedDocsPolicy || 'local-only',
    workflowCommitPolicy: profile.workflowCommitPolicy || workflow.workflowCommitPolicy || 'implementation-commits-only',
    executionMethod: profile.executionMethod || workflow.defaultExecutionMethod || null,
    executionStrategy: profile.executionStrategy || workflow.defaultExecutionStrategy || null,
    branchPolicy: profile.branchPolicy || workflow.branchPolicy || 'prefer-feature-branch',
    testingIntensity: profile.testingIntensity || workflow.testingIntensity || 'major-behavior',
    questionPolicy: profile.questionPolicy || workflow.questionPolicy || 'deep-questions-before-spec-avoid-during-execution',
    cleanupPolicy: profile.cleanupPolicy || { mode: cleanup.mode || 'session-aware', retentionDays: cleanup.retentionDays || SDP_DEFAULT_RETENTION_DAYS },
    project: {
      root: directory,
      projectKey: paths.projectKey
    },
    harness: {
      name: 'opencode',
      configDir,
      settingsSources: effectiveSettings.sources || []
    }
  };
};

const hasSecretLikeKey = (value) => {
  if (!value || typeof value !== 'object') return false;
  for (const [key, nested] of Object.entries(value)) {
    if (/secret|token|password|api[_-]?key/i.test(key)) return true;
    if (hasSecretLikeKey(nested)) return true;
  }
  return false;
};

const validateProfile = (profile, { allowIncomplete = false } = {}) => {
  const errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return { ok: false, errors: ['profile must be an object'] };
  for (const key of Object.keys(profile)) {
    if (!SDP_PROFILE_KEYS.has(key)) errors.push(`unknown profile field: ${key}`);
  }
  if (profile.schemaVersion !== SDP_SCHEMA_VERSION) errors.push('schemaVersion must be 1');
  if (!profile.productName || profile.productName !== 'SuperDuperPowers') errors.push('productName must be SuperDuperPowers');
  if (!(allowIncomplete && profile.route === null) && !allowedRouteValues.includes(profile.route)) errors.push('invalid route');
  if (!allowedTestingIntensityValues.includes(profile.testingIntensity)) errors.push('invalid testingIntensity');
  if (!allowedGeneratedDocsPolicies.includes(profile.generatedDocsPolicy)) errors.push('invalid generatedDocsPolicy');
  if (!allowedWorkflowCommitPolicies.includes(profile.workflowCommitPolicy)) errors.push('invalid workflowCommitPolicy');
  if (hasSecretLikeKey(profile)) errors.push('profile contains secret-like key');
  return { ok: errors.length === 0, errors };
};

const stableJson = (value) => JSON.stringify(value);

const validateProfileInput = (value, { allowFull = false, comparisonProfile = null } = {}) => {
  const errors = [];
  if (!value) return { ok: true, errors };
  if (typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['profile input must be an object'] };
  const allowedKeys = allowFull ? SDP_PROFILE_KEYS : SDP_MUTABLE_PROFILE_KEYS;
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`unsupported profile field: ${key}`);
    if (stringProfileInputKeys.has(key) && value[key] !== null && typeof value[key] !== 'string') errors.push(`profile field must be a string: ${key}`);
    if (nullableDecisionKeys.has(key) && value[key] === null) continue;
    if (key === 'route' && value[key] !== undefined && !allowedRouteValues.includes(value[key])) errors.push('invalid route');
    if (key === 'docsRoot' && value[key] !== undefined && !isSafeProjectRelativePath(value[key])) errors.push('invalid docsRoot');
    if (key === 'testingIntensity' && value[key] !== undefined && !allowedTestingIntensityValues.includes(value[key])) errors.push('invalid testingIntensity');
    if (key === 'generatedDocsPolicy' && value[key] !== undefined && !allowedGeneratedDocsPolicies.includes(value[key])) errors.push('invalid generatedDocsPolicy');
    if (key === 'workflowCommitPolicy' && value[key] !== undefined && !allowedWorkflowCommitPolicies.includes(value[key])) errors.push('invalid workflowCommitPolicy');
    if (key === 'cleanupPolicy' && (typeof value[key] !== 'object' || value[key] === null || Array.isArray(value[key]))) errors.push('cleanupPolicy must be an object');
    if (allowFull && key === 'schemaVersion' && value[key] !== SDP_SCHEMA_VERSION) errors.push('schemaVersion must be 1');
    if (allowFull && key === 'invocationAliases' && !Array.isArray(value[key])) errors.push('invocationAliases must be an array');
    if (allowFull && ['project', 'harness'].includes(key) && (typeof value[key] !== 'object' || value[key] === null || Array.isArray(value[key]))) errors.push(`${key} must be an object`);
    if (allowFull && comparisonProfile && !SDP_MUTABLE_PROFILE_KEYS.has(key) && !['updatedAt', 'messageId'].includes(key)) {
      if (stableJson(value[key]) !== stableJson(comparisonProfile[key])) errors.push(`profile field does not match active context: ${key}`);
    }
  }
  if (hasSecretLikeKey(value)) errors.push('profile contains secret-like key');
  return { ok: errors.length === 0, errors };
};

export const profileSummaryText = (profile) => `SuperDuperPowers profile: route=${profile.route || 'unset'}, docs=${profile.sdpDocsRoot}, execution=${profile.executionStrategy || profile.executionMethod || 'unset'}, testingIntensity=${profile.testingIntensity}, branch=${profile.branchPolicy}, commits=${profile.workflowCommitPolicy}, generatedDocs=${profile.generatedDocsPolicy}.`;

export const settingsSummaryText = (effectiveSettings) => {
  const settings = effectiveSettings?.settings || defaultSettings();
  const workflow = settings.workflow || {};
  const paths = settings.paths || {};
  const loaded = (effectiveSettings?.sources || []).filter((source) => source.status === 'loaded').map((source) => source.path);
  return `SuperDuperPowers live settings: docsRoot=${workflow.defaultDocsRoot}, docsDir=${paths.docsDirName}, commits=${workflow.workflowCommitPolicy}, branch=${workflow.branchPolicy}, tests=${workflow.testingIntensity}, fullReviewEachChunk=${workflow.fullFlow?.reviewEachChunk}. Use sdp_settings for details; loaded=${loaded.length}.`;
};

const listKnownOpenCodeSessions = () => {
  try {
    const output = execFileSync('opencode', ['session', 'list', '--format', 'json', '--max-count', '10000'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(JSON.parse(output).map((session) => session.id).filter(Boolean));
  } catch {
    return null;
  }
};

const cleanupRetentionDays = (requested, configured) => Math.min(requested || configured || SDP_DEFAULT_RETENTION_DAYS, SDP_DEFAULT_RETENTION_DAYS);

const writeJsonAtomic = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
  fs.renameSync(tmpPath, filePath);
};

const touchDirectory = (dirPath) => {
  if (!dirPath) return false;
  try {
    const stat = fs.lstatSync(dirPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
    const now = new Date();
    fs.utimesSync(dirPath, now, now);
    return true;
  } catch {
    return false;
  }
};

const appendEvent = (stateDir, event) => {
  fs.mkdirSync(stateDir, { recursive: true });
  const eventsPath = path.join(stateDir, 'events.jsonl');
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(eventsPath, flags, 0o666);
  try {
    fs.writeSync(fd, `${JSON.stringify({ timestamp: nowIso(), ...event })}\n`);
  } finally {
    fs.closeSync(fd);
  }
};

const readJsonFile = (filePath) => {
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, 'utf8')), errors: [] };
  } catch (error) {
    return { value: null, errors: [`invalid JSON in ${path.basename(filePath)}: ${error.message}`] };
  }
};

const inspectRuntimeStateFile = (filePath) => {
  try {
    const stat = fs.lstatSync(filePath);
    const errors = [];
    if (stat.isSymbolicLink()) errors.push(`${path.basename(filePath)} must not be a symlink`);
    if (!stat.isFile()) errors.push(`${path.basename(filePath)} must be a file`);
    return { exists: true, errors };
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, errors: [] };
    return { exists: false, errors: [`invalid ${path.basename(filePath)}: ${error.message}`] };
  }
};

const validateEventAppendTarget = (stateDir) => {
  const eventsPath = path.join(stateDir, 'events.jsonl');
  const inspection = inspectRuntimeStateFile(eventsPath);
  return inspection.exists ? inspection.errors : [];
};

export const readProfileJsonSafe = (profilePath) => {
  const profileFile = inspectRuntimeStateFile(profilePath);
  if (!profileFile.exists) return { value: null, errors: [] };
  if (profileFile.errors.length > 0) return { value: null, errors: profileFile.errors };
  const parsed = readJsonFile(profilePath);
  if (parsed.errors.length > 0) return parsed;
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) return { value: null, errors: ['profile must be an object'] };
  return parsed;
};

const validateJsonLinesFile = (filePath) => {
  const errors = [];
  const inspection = inspectRuntimeStateFile(filePath);
  if (!inspection.exists) return [`missing ${path.basename(filePath)}`];
  if (inspection.errors.length > 0) return inspection.errors;
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
    lines.forEach((line, index) => {
      try {
        const event = JSON.parse(line);
        if (!event || typeof event !== 'object' || Array.isArray(event)) errors.push(`${path.basename(filePath)} line ${index + 1} must be an object`);
      } catch (error) {
        errors.push(`invalid JSON in ${path.basename(filePath)} line ${index + 1}: ${error.message}`);
      }
    });
  } catch (error) {
    errors.push(`invalid ${path.basename(filePath)}: ${error.message}`);
  }
  return errors;
};

const validateRelatedStateFiles = (stateDir) => {
  const errors = [];
  if (!stateDir) return errors;

  const artifactsPath = path.join(stateDir, 'artifacts.json');
  const artifactsFile = inspectRuntimeStateFile(artifactsPath);
  if (!artifactsFile.exists) {
    errors.push('missing artifacts.json');
  } else {
    errors.push(...artifactsFile.errors);
    const artifacts = artifactsFile.errors.length === 0 ? readJsonFile(artifactsPath) : { value: null, errors: [] };
    errors.push(...artifacts.errors);
    if (artifacts.errors.length === 0 && (!artifacts.value || typeof artifacts.value !== 'object' || Array.isArray(artifacts.value))) {
      errors.push('artifacts.json must be an object');
    } else if (artifacts.value) {
      if (artifacts.value.schemaVersion !== SDP_SCHEMA_VERSION) errors.push('artifacts.json schemaVersion must be 1');
      if (!Array.isArray(artifacts.value.artifacts)) errors.push('artifacts.json artifacts must be an array');
    }
  }

  const eventsPath = path.join(stateDir, 'events.jsonl');
  errors.push(...validateJsonLinesFile(eventsPath));

  return errors;
};

const inspectRuntimeDrift = (configDir, context, packageInfo = {}) => {
  const directory = context.directory || context.worktree || process.cwd();
  const settingsInput = loadEffectiveSettings({ configDir, packageInfo, directory });
  const baseProfile = buildDefaultProfile({ configDir, context: { ...context, directory }, profile: {}, settingsInput });
  const stateDir = baseProfile.stateDir;
  const parentPathErrors = validateRuntimeParentPaths(baseProfile);
  if (parentPathErrors.length > 0) return { drifted: true, reason: 'invalid-runtime-path', baseProfile, errors: parentPathErrors };
  const containmentErrors = validateRuntimePathContainment(baseProfile);
  if (containmentErrors.length > 0) return { drifted: true, reason: 'invalid-runtime-path', baseProfile, errors: containmentErrors };
  if (stateDir && !isPathInside(baseProfile.stateRoot, stateDir)) {
    return { drifted: true, reason: 'invalid-runtime-path', baseProfile, errors: ['stateDir is outside SuperDuperPowers runtime state'] };
  }
  if (!stateDir) return { drifted: false, reason: 'state-not-initialized', baseProfile, errors: [] };
  try {
    const stateDirStat = fs.lstatSync(stateDir);
    if (stateDirStat.isSymbolicLink()) return { drifted: true, reason: 'runtime-state-drift', baseProfile, errors: ['stateDir must not be a symlink'] };
    if (!stateDirStat.isDirectory()) return { drifted: true, reason: 'runtime-state-drift', baseProfile, errors: ['stateDir must be a directory'] };
  } catch (error) {
    if (error.code === 'ENOENT') return { drifted: false, reason: 'state-not-initialized', baseProfile, errors: [] };
    return { drifted: true, reason: 'runtime-state-drift', baseProfile, errors: [`invalid stateDir: ${error.message}`] };
  }

  const errors = [];
  const profilePath = path.join(stateDir, 'profile.json');
  const artifactsPath = path.join(stateDir, 'artifacts.json');
  const eventsPath = path.join(stateDir, 'events.jsonl');

  const profileFile = inspectRuntimeStateFile(profilePath);
  const artifactsFile = inspectRuntimeStateFile(artifactsPath);
  errors.push(...profileFile.errors, ...artifactsFile.errors);
  const profile = profileFile.exists && profileFile.errors.length === 0 ? readJsonFile(profilePath) : { value: null, errors: profileFile.exists ? [] : ['missing profile.json'] };
  const expectedProfile = profile.value && isSafeProjectRelativePath(profile.value.docsRoot)
    ? buildDefaultProfile({ configDir, context: { ...context, directory }, profile: { docsRoot: profile.value.docsRoot }, settingsInput })
    : baseProfile;
  errors.push(...profile.errors);
  if (profile.errors.length === 0 && (!profile.value || typeof profile.value !== 'object' || Array.isArray(profile.value))) {
    errors.push('profile must be an object');
  } else if (profile.value) {
    errors.push(...validateProfile(profile.value, { allowIncomplete: profile.value.route === null }).errors);
    if (!isSafeProjectRelativePath(profile.value.docsRoot)) errors.push('profile docsRoot must be a project-relative path');
    if (profile.value.sessionId !== context.sessionID) errors.push('profile sessionId does not match active session');
    if (profile.value.docsRoot !== expectedProfile.docsRoot) errors.push('profile docsRoot does not match active docs root');
    if (profile.value.runtimeRoot !== expectedProfile.runtimeRoot) errors.push('profile runtimeRoot does not match active config directory');
    if (profile.value.stateRoot !== expectedProfile.stateRoot) errors.push('profile stateRoot does not match active config directory');
    if (profile.value.stateDir !== expectedProfile.stateDir) errors.push('profile stateDir does not match active session');
    if (profile.value.worktreeRoot !== expectedProfile.worktreeRoot) errors.push('profile worktreeRoot does not match active directory');
    if (profile.value.sdpDocsRoot !== expectedProfile.sdpDocsRoot) errors.push('profile sdpDocsRoot does not match active docs root');
    if (profile.value.specsDir !== expectedProfile.specsDir) errors.push('profile specsDir does not match active docs root');
    if (profile.value.plansDir !== expectedProfile.plansDir) errors.push('profile plansDir does not match active docs root');
    if (profile.value.harness?.configDir !== configDir) errors.push('profile harness configDir does not match active config directory');
    if (profile.value.project?.root !== directory) errors.push('profile project root does not match active directory');
    if (profile.value.project?.projectKey !== expectedProfile.project.projectKey) errors.push('profile projectKey does not match active directory');
  }

  if (!artifactsFile.exists) {
    errors.push('missing artifacts.json');
  } else {
    const artifacts = artifactsFile.errors.length === 0 ? readJsonFile(artifactsPath) : { value: null, errors: [] };
    errors.push(...artifacts.errors);
    if (artifacts.errors.length === 0 && (!artifacts.value || typeof artifacts.value !== 'object' || Array.isArray(artifacts.value))) {
      errors.push('artifacts.json must be an object');
    } else if (artifacts.value) {
      if (artifacts.value.schemaVersion !== SDP_SCHEMA_VERSION) errors.push('artifacts.json schemaVersion must be 1');
      if (!Array.isArray(artifacts.value.artifacts)) errors.push('artifacts.json artifacts must be an array');
    }
  }

  errors.push(...validateJsonLinesFile(eventsPath));

  return { drifted: errors.length > 0, reason: errors.length > 0 ? 'runtime-state-drift' : 'ok', baseProfile: expectedProfile, errors };
};

const recordRepairFailure = (baseProfile, context, errors) => {
  try {
    const failurePath = path.join(baseProfile.runtimeRoot, 'quarantine', `repair-failure-${Date.now()}-${safePathSegment(context.sessionID)}.json`);
    writeJsonAtomic(failurePath, { timestamp: nowIso(), sessionID: context.sessionID, errors });
    return failurePath;
  } catch {
    return null;
  }
};

const recordRepairFailureIfSafe = (baseProfile, context, errors) => {
  const parentErrors = validateRuntimeParentPaths({
    runtimeRoot: baseProfile.runtimeRoot,
    stateRoot: baseProfile.stateRoot,
    quarantineRoot: path.join(baseProfile.runtimeRoot, 'quarantine')
  });
  if (parentErrors.length > 0) return null;
  return recordRepairFailure(baseProfile, context, errors);
};

export const autoRepairRuntimeState = ({ configDir, context, packageInfo = {} }) => {
  if (!context?.sessionID) return { ok: true, repaired: false, reason: 'missing-session-id' };
  const inspection = inspectRuntimeDrift(configDir, context, packageInfo);
  if (!inspection.drifted) {
    if (inspection.reason === 'ok') touchDirectory(inspection.baseProfile.stateDir);
    return { ok: true, repaired: false, reason: inspection.reason };
  }

  const stateDir = inspection.baseProfile.stateDir;
  const stateRoot = inspection.baseProfile.stateRoot;
  const quarantineRoot = path.join(inspection.baseProfile.runtimeRoot, 'quarantine');
  const repairId = `${Date.now()}-${process.pid}-${safePathSegment(context.sessionID)}-${crypto.randomBytes(4).toString('hex')}`;
  const quarantineDir = path.join(quarantineRoot, repairId);
  const repairTempDir = path.join(quarantineRoot, `repairing-${repairId}`);
  const parentPathErrors = validateRuntimeParentPaths({ runtimeRoot: inspection.baseProfile.runtimeRoot, stateRoot, quarantineRoot });
  if (parentPathErrors.length > 0) {
    return { ok: false, repaired: false, stateDir, quarantineDir, errors: [...inspection.errors, ...parentPathErrors] };
  }
  const containmentErrors = validateRuntimePathContainment({ ...inspection.baseProfile, quarantineRoot, quarantineDir, repairTempDir });
  if (!stateDir || containmentErrors.length > 0) {
    const errors = [...inspection.errors, ...(containmentErrors.length > 0 ? containmentErrors : ['repair path is outside SuperDuperPowers runtime state'])];
    const failurePath = recordRepairFailureIfSafe(inspection.baseProfile, context, errors);
    return { ok: false, repaired: false, stateDir, quarantineDir, failurePath, errors };
  }
  let movedToQuarantine = false;
  let createdReplacementState = false;
  const repairMarker = `.repairing-${repairId}`;
  const repairMarkerPath = path.join(stateDir, repairMarker);
  try {
    let stateDirExists = false;
    try {
      fs.lstatSync(stateDir);
      stateDirExists = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (stateDirExists) {
      fs.mkdirSync(path.dirname(quarantineDir), { recursive: true });
      fs.renameSync(stateDir, quarantineDir);
      movedToQuarantine = true;
    }
    const repairedProfile = { ...inspection.baseProfile, route: null, updatedAt: nowIso() };
    writeJsonAtomic(path.join(repairTempDir, 'profile.json'), repairedProfile);
    writeJsonAtomic(path.join(repairTempDir, 'artifacts.json'), { schemaVersion: SDP_SCHEMA_VERSION, artifacts: [] });
    appendEvent(repairTempDir, { type: 'runtime.autoRepair', messageID: context.messageID || null, errors: inspection.errors, quarantineDir });
    fs.mkdirSync(stateDir);
    createdReplacementState = true;
    fs.writeFileSync(repairMarkerPath, repairId, { flag: 'wx' });
    for (const file of ['profile.json', 'artifacts.json', 'events.jsonl']) {
      fs.copyFileSync(path.join(repairTempDir, file), path.join(stateDir, file), fs.constants.COPYFILE_EXCL);
    }
    fs.rmSync(repairMarkerPath, { force: true });
    fs.rmSync(repairTempDir, { recursive: true, force: true });
    touchDirectory(stateDir);
    return { ok: true, repaired: true, stateDir, quarantineDir, errors: inspection.errors };
  } catch (error) {
    const errors = [...inspection.errors, error.message];
    let restored = false;
    try {
      if (fs.existsSync(repairTempDir)) fs.rmSync(repairTempDir, { recursive: true, force: true });
      if (createdReplacementState && fs.existsSync(stateDir) && !fs.existsSync(repairMarkerPath) && fs.readdirSync(stateDir).length === 0) {
        fs.rmSync(stateDir, { recursive: true, force: true });
      }
      if (createdReplacementState && fs.existsSync(repairMarkerPath) && fs.readFileSync(repairMarkerPath, 'utf8') === repairId) {
        const entries = fs.readdirSync(stateDir);
        const expectedEntries = new Set([repairMarker, 'profile.json', 'artifacts.json', 'events.jsonl']);
        if (entries.every((entry) => expectedEntries.has(entry))) {
          fs.rmSync(stateDir, { recursive: true, force: true });
        }
      }
      if (movedToQuarantine && !fs.existsSync(stateDir) && fs.existsSync(quarantineDir)) {
        fs.renameSync(quarantineDir, stateDir);
        restored = true;
      }
    } catch (restoreError) {
      errors.push(`failed to restore quarantined state: ${restoreError.message}`);
    }
    const failurePath = recordRepairFailure(inspection.baseProfile, context, errors);
    return { ok: false, repaired: false, stateDir, quarantineDir, restored, failurePath, errors };
  }
};

const ensureTrailingNewline = (content) => content.endsWith('\n') ? content : `${content}\n`;
const readTextIfExists = (filePath) => fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

const appendMissingLines = (filePath, lines) => {
  const existing = readTextIfExists(filePath);
  const changed = [];
  let next = existing ? ensureTrailingNewline(existing) : '';
  const existingLines = existing.split(/\r?\n/);
  for (const line of lines) {
    if (!existingLines.includes(line)) {
      next += `${line}\n`;
      changed.push(line);
    }
  }
  if (changed.length > 0 || !fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next);
  }
  return changed;
};

const docsEntriesFor = (directory, docsRootArg, settingsInput = null) => {
  const settings = settingsInput?.settings || settingsInput || defaultSettings();
  const docsRoot = selectDocsRoot(directory, docsRootArg, settings);
  const docsDirName = settings.paths?.docsDirName || SDP_DOCS_DIR;
  const docsPath = toPosixPath(path.posix.join(docsRoot, docsDirName));
  return {
    docsRoot,
    entries: {
      gitignore: [`${docsPath}/`],
      ignore: [`!${docsPath}/`]
    }
  };
};

const runGit = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

const getGitContext = (directory) => {
  const root = runGit(directory, ['rev-parse', '--show-toplevel']);
  if (!root) return { present: false };
  const currentBranch = runGit(root, ['branch', '--show-current']) || null;
  const defaultFromOrigin = runGit(root, ['symbolic-ref', 'refs/remotes/origin/HEAD']);
  const defaultBranch = defaultFromOrigin ? defaultFromOrigin.replace('refs/remotes/origin/', '') : (['main', 'master'].includes(currentBranch) ? currentBranch : null);
  const upstream = runGit(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const status = runGit(root, ['status', '--porcelain=v1']) || '';
  const dirtySummary = status ? status.split('\n') : [];
  let aheadBehind = null;
  if (upstream) {
    const counts = runGit(root, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
    if (counts) {
      const [behind, ahead] = counts.split(/\s+/).map((value) => Number(value));
      aheadBehind = { ahead, behind };
    }
  }
  return {
    present: true,
    root,
    currentBranch,
    defaultBranch,
    isDefaultBranch: currentBranch === 'main' || currentBranch === 'master' || (!!defaultBranch && currentBranch === defaultBranch),
    ambiguous: !currentBranch,
    upstream,
    aheadBehind,
    dirty: status.length > 0,
    dirtySummary,
    likelyUnrelatedChanges: dirtySummary
  };
};

const recommendBranchAction = (git) => {
  if (!git.present) return 'block';
  if (git.ambiguous) return 'ask-user';
  if (git.dirty) return 'ask-user';
  if (git.isDefaultBranch) return 'create-feature-branch';
  if (git.aheadBehind?.behind > 0) return 'ask-user';
  return 'continue';
};

const createSettingsTool = (configDir, packageInfo) => tool({
  description: 'Read the live SuperDuperPowers JSON/JSONC settings for this OpenCode session without modifying files.',
  args: {
    operation: tool.schema.enum(['get', 'summary', 'validate', 'sources'])
  },
  async execute(args, context) {
    const directory = context.directory || context.worktree || process.cwd();
    const effective = loadEffectiveSettings({ configDir, packageInfo, directory });
    if (args.operation === 'summary') return JSON.stringify({ ok: effective.ok, summary: settingsSummaryText(effective), errors: effective.errors }, null, 2);
    if (args.operation === 'validate') return JSON.stringify({ ok: effective.ok, errors: effective.errors, sources: effective.sources }, null, 2);
    if (args.operation === 'sources') return JSON.stringify({ ok: effective.ok, sources: effective.sources, searched: effective.searched, errors: effective.errors }, null, 2);
    if (args.operation === 'get') return JSON.stringify(effective, null, 2);
    return JSON.stringify({ ok: false, reason: `unsupported operation ${args.operation}` }, null, 2);
  }
});

const projectConfigPathFor = (directory) => path.join(path.resolve(directory || process.cwd()), '.opencode', 'superduperpowers.jsonc');

const readProjectConfigTemplate = (packageInfo) => {
  const sourcePath = packageInfo.defaultSettingsPath || path.join(packageInfo.packageRoot || process.cwd(), 'defaults/superduperpowers.jsonc');
  const content = readTextSafe(sourcePath);
  if (content) return { sourcePath, content };
  return {
    sourcePath,
    content: `{
  "$schema": "https://notchrisbutler.github.io/superduperpowers/settings.schema.json",
  "schemaVersion": 1,
  "workflow": {
    "defaultRoute": null,
    "defaultDocsRoot": "docs",
    "generatedDocsPolicy": "local-only",
    "workflowCommitPolicy": "implementation-commits-only",
    "branchPolicy": "prefer-feature-branch",
    "testingIntensity": "major-behavior",
    "fullFlow": {
      "reviewEachChunk": false
    }
  }
}
`
  };
};

const inspectProjectConfigTarget = (directory, packageInfo) => {
  const projectRoot = path.resolve(directory || process.cwd());
  const opencodeDir = path.join(projectRoot, '.opencode');
  const configPath = projectConfigPathFor(projectRoot);
  const template = readProjectConfigTemplate(packageInfo);
  const errors = [];
  try {
    const projectStat = fs.lstatSync(projectRoot);
    if (projectStat.isSymbolicLink()) errors.push('project root must not be a symlink for sdp_init writes');
    if (!projectStat.isDirectory()) errors.push('project root must be a directory');
  } catch (error) {
    errors.push(`invalid project root: ${error.message}`);
  }
  try {
    const stat = fs.lstatSync(opencodeDir);
    if (stat.isSymbolicLink()) errors.push('.opencode must not be a symlink');
    if (!stat.isDirectory()) errors.push('.opencode must be a directory');
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push(`invalid .opencode directory: ${error.message}`);
  }
  try {
    const stat = fs.lstatSync(configPath);
    if (stat.isSymbolicLink()) errors.push('.opencode/superduperpowers.jsonc must not be a symlink');
    if (!stat.isFile()) errors.push('.opencode/superduperpowers.jsonc must be a file');
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push(`invalid project config path: ${error.message}`);
  }
  const exists = fileExists(configPath);
  return { projectRoot, opencodeDir, configPath, exists, sourcePath: template.sourcePath, template: template.content, errors };
};

const createInitTool = (packageInfo) => tool({
  description: 'Check or create the project-local SuperDuperPowers config at .opencode/superduperpowers.jsonc.',
  args: {
    operation: tool.schema.enum(['check', 'apply', 'template'])
  },
  async execute(args, context) {
    const directory = context.directory || context.worktree || process.cwd();
    const target = inspectProjectConfigTarget(directory, packageInfo);
    if (args.operation === 'template') {
      return JSON.stringify({ ok: true, path: target.configPath, sourcePath: target.sourcePath, content: target.template }, null, 2);
    }
    if (args.operation === 'check') {
      return JSON.stringify({
        ok: target.errors.length === 0,
        exists: target.exists,
        path: target.configPath,
        sourcePath: target.sourcePath,
        action: target.exists ? 'none' : 'run /sdp-init to create project-local defaults',
        errors: target.errors
      }, null, 2);
    }
    if (args.operation === 'apply') {
      if (target.errors.length > 0) return JSON.stringify({ ok: false, path: target.configPath, errors: target.errors }, null, 2);
      if (target.exists) return JSON.stringify({ ok: true, created: false, path: target.configPath, reason: 'already-exists' }, null, 2);
      fs.mkdirSync(target.opencodeDir, { recursive: true });
      fs.writeFileSync(target.configPath, ensureTrailingNewline(target.template), { flag: 'wx' });
      return JSON.stringify({ ok: true, created: true, path: target.configPath, sourcePath: target.sourcePath }, null, 2);
    }
    return JSON.stringify({ ok: false, reason: `unsupported operation ${args.operation}` }, null, 2);
  }
});

const createProfileTool = (configDir, packageInfo) => tool({
  description: 'Manage the active SuperDuperPowers workflow profile for this OpenCode session.',
  args: {
    operation: tool.schema.enum(['get', 'set', 'merge', 'summary', 'validate', 'repair', 'clear', 'cleanup']),
    profile: tool.schema.record(tool.schema.string(), tool.schema.any()).optional(),
    updates: tool.schema.record(tool.schema.string(), tool.schema.any()).optional(),
    retentionDays: tool.schema.number().int().positive().optional()
  },
  async execute(args, context) {
    const operation = args.operation;
    const incomingProfile = args.profile || {};
    const profileInputOperation = ['set', 'repair'].includes(operation);
    const preValidation = profileInputOperation ? validateProfileInput(incomingProfile, { allowFull: true }) : { ok: true, errors: [] };
    if (!preValidation.ok) return JSON.stringify({ ok: false, errors: preValidation.errors }, null, 2);
    const directory = context.directory || context.worktree || process.cwd();
    const settingsInput = loadEffectiveSettings({ configDir, packageInfo, directory });
    if (!settingsInput.ok) return JSON.stringify({ ok: false, reason: 'invalid-settings', errors: settingsInput.errors, settings: settingsInput.settings, sources: settingsInput.sources }, null, 2);
    const baseProfile = buildDefaultProfile({ configDir, context: { ...context, directory }, profile: profileInputOperation ? incomingProfile : {}, settingsInput });
    const stateDir = baseProfile.stateDir;
    const containmentErrors = validateRuntimePathContainment(baseProfile);
    if (containmentErrors.length > 0) return JSON.stringify({ ok: false, errors: containmentErrors }, null, 2);
    const parentPathErrors = validateRuntimeParentPaths({
      runtimeRoot: baseProfile.runtimeRoot,
      stateRoot: baseProfile.stateRoot,
      quarantineRoot: path.join(baseProfile.runtimeRoot, 'quarantine')
    });
    if (parentPathErrors.length > 0) return JSON.stringify({ ok: false, errors: parentPathErrors }, null, 2);
    if (stateDir) {
      try {
        const stateDirStat = fs.lstatSync(stateDir);
        if (stateDirStat.isSymbolicLink()) return JSON.stringify({ ok: false, errors: ['stateDir must not be a symlink'] }, null, 2);
        if (!stateDirStat.isDirectory()) return JSON.stringify({ ok: false, errors: ['stateDir must be a directory'] }, null, 2);
      } catch (error) {
        if (error.code !== 'ENOENT') return JSON.stringify({ ok: false, errors: [`invalid stateDir: ${error.message}`] }, null, 2);
      }
    }
    if (stateDir && ['set', 'merge'].includes(operation)) {
      const eventTargetErrors = validateEventAppendTarget(stateDir);
      if (eventTargetErrors.length > 0) return JSON.stringify({ ok: false, errors: eventTargetErrors }, null, 2);
    }

    if (!context.sessionID && ['set', 'merge', 'clear', 'repair'].includes(operation)) {
      return JSON.stringify({ ok: false, reason: 'missing-session-id', unsavedProfile: baseProfile }, null, 2);
    }

    const profilePath = stateDir ? path.join(stateDir, 'profile.json') : null;
    const readExisting = () => {
      if (!profilePath) return null;
      const parsed = readProfileJsonSafe(profilePath);
      if (!parsed.value && parsed.errors.length === 0) return null;
      if (parsed.errors.length > 0) return { corrupted: true, errors: parsed.errors };
      return parsed.value;
    };

    if (operation === 'get') {
      const existing = readExisting();
      if (existing?.corrupted) return JSON.stringify({ ok: false, reason: 'corrupt-profile', errors: existing.errors }, null, 2);
      touchDirectory(stateDir);
      return JSON.stringify({ ok: true, profile: existing || baseProfile }, null, 2);
    }

    if (operation === 'set') {
      const profile = buildDefaultProfile({ configDir, context: { ...context, directory }, profile: incomingProfile, settingsInput });
      const inputValidation = validateProfileInput(args.profile || {}, { allowFull: true, comparisonProfile: profile });
      if (!inputValidation.ok) return JSON.stringify({ ok: false, errors: inputValidation.errors }, null, 2);
      const validation = validateProfile(profile);
      if (!validation.ok) return JSON.stringify({ ok: false, errors: validation.errors }, null, 2);
      writeJsonAtomic(profilePath, profile);
      writeJsonAtomic(path.join(stateDir, 'artifacts.json'), { schemaVersion: SDP_SCHEMA_VERSION, artifacts: [] });
      appendEvent(stateDir, { type: 'profile.set', messageID: context.messageID || null });
      touchDirectory(stateDir);
      return JSON.stringify({ ok: true, profile }, null, 2);
    }

    if (operation === 'merge') {
      const inputValidation = validateProfileInput(args.updates || {});
      if (!inputValidation.ok) return JSON.stringify({ ok: false, errors: inputValidation.errors }, null, 2);
      const existing = readExisting() || baseProfile;
      if (existing?.corrupted) return JSON.stringify({ ok: false, reason: 'corrupt-profile', errors: existing.errors }, null, 2);
      const updates = args.updates || {};
      const docsRoot = typeof updates.docsRoot === 'string' ? updates.docsRoot.replace(/\/$/, '') : null;
      const docsDirName = settingsInput.settings.paths?.docsDirName || SDP_DOCS_DIR;
      const specsDirName = settingsInput.settings.paths?.specsDirName || 'specs';
      const plansDirName = settingsInput.settings.paths?.plansDirName || 'plans';
      const profile = {
        ...existing,
        ...updates,
        sdpDocsRoot: docsRoot ? `${docsRoot}/${docsDirName}` : existing.sdpDocsRoot,
        specsDir: docsRoot ? `${docsRoot}/${docsDirName}/${specsDirName}` : existing.specsDir,
        plansDir: docsRoot ? `${docsRoot}/${docsDirName}/${plansDirName}` : existing.plansDir,
        updatedAt: nowIso()
      };
      const validation = validateProfile(profile);
      if (!validation.ok) return JSON.stringify({ ok: false, errors: validation.errors }, null, 2);
      writeJsonAtomic(profilePath, profile);
      appendEvent(stateDir, { type: 'profile.merge', updates: Object.keys(args.updates || {}) });
      touchDirectory(stateDir);
      return JSON.stringify({ ok: true, profile }, null, 2);
    }

    if (operation === 'summary') {
      const profile = readExisting() || baseProfile;
      if (profile?.corrupted) return JSON.stringify({ ok: false, reason: 'corrupt-profile', errors: profile.errors }, null, 2);
      touchDirectory(stateDir);
      return JSON.stringify({ ok: true, summary: profileSummaryText(profile) }, null, 2);
    }

    if (operation === 'validate') {
      const existing = readExisting();
      if (existing?.corrupted) return JSON.stringify({ ok: false, errors: existing.errors, profile: null }, null, 2);
      const profile = existing || baseProfile;
      const errors = [...validateProfile(profile, { allowIncomplete: !existing }).errors];
      if (existing) errors.push(...validateRelatedStateFiles(stateDir));
      if (errors.length === 0) touchDirectory(stateDir);
      return JSON.stringify({ ok: errors.length === 0, errors, profile }, null, 2);
    }

    if (operation === 'clear') {
      if (stateDir && fs.existsSync(stateDir)) fs.rmSync(stateDir, { recursive: true, force: true });
      return JSON.stringify({ ok: true, cleared: stateDir }, null, 2);
    }

    if (operation === 'repair') {
      const validation = validateProfile(baseProfile);
      if (!validation.ok) return JSON.stringify({ ok: false, errors: validation.errors }, null, 2);
      const quarantineDir = path.join(baseProfile.runtimeRoot, 'quarantine', `${Date.now()}-${context.sessionID}`);
      if (stateDir && fs.existsSync(stateDir)) {
        fs.mkdirSync(path.dirname(quarantineDir), { recursive: true });
        fs.renameSync(stateDir, quarantineDir);
      }
      writeJsonAtomic(profilePath, baseProfile);
      writeJsonAtomic(path.join(stateDir, 'artifacts.json'), { schemaVersion: SDP_SCHEMA_VERSION, artifacts: [] });
      appendEvent(stateDir, { type: 'profile.repair', quarantineDir });
      touchDirectory(stateDir);
      return JSON.stringify({ ok: true, profile: baseProfile, quarantineDir }, null, 2);
    }

    if (operation === 'cleanup') {
      const retentionDays = cleanupRetentionDays(args.retentionDays, settingsInput.settings.cleanup?.retentionDays);
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const knownSessions = listKnownOpenCodeSessions();
      const removed = [];
      const kept = [];
      if (fs.existsSync(baseProfile.stateRoot)) {
        for (const entry of fs.readdirSync(baseProfile.stateRoot, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const dir = path.join(baseProfile.stateRoot, entry.name);
          if (entry.name === context.sessionID) {
            kept.push(dir);
            continue;
          }
          const stat = fs.statSync(dir);
          const missingOpenCodeSession = knownSessions ? !knownSessions.has(entry.name) : false;
          const staleByAge = stat.mtimeMs < cutoff;
          if (missingOpenCodeSession || staleByAge) {
            fs.rmSync(dir, { recursive: true, force: true });
            removed.push(dir);
          } else {
            kept.push(dir);
          }
        }
      }
      return JSON.stringify({
        ok: true,
        removed,
        kept,
        retentionDays,
        openCodeSessionPresence: knownSessions ? 'available' : 'unavailable',
        staleDefinition: `OpenCode session is gone, or state directory has not been updated/session has not been reactivated in ${retentionDays} days`
      }, null, 2);
    }

    return JSON.stringify({ ok: false, reason: `unsupported operation ${operation}` }, null, 2);
  }
});

const createSetupHygieneTool = (configDir, packageInfo) => tool({
  description: 'Check or apply project-local SuperDuperPowers generated-doc ignore hygiene.',
  args: {
    operation: tool.schema.enum(['check', 'apply', 'explain']),
    docsRoot: tool.schema.string().optional()
  },
  async execute(args, context) {
    const directory = context.directory || context.worktree || process.cwd();
    const settingsInput = loadEffectiveSettings({ configDir, packageInfo, directory });
    if (!settingsInput.ok) return JSON.stringify({ ok: false, reason: 'invalid-settings', errors: settingsInput.errors }, null, 2);
    const { docsRoot, entries } = docsEntriesFor(directory, args.docsRoot, settingsInput);
    const gitignorePath = path.join(directory, '.gitignore');
    const ignorePath = path.join(directory, '.ignore');

    const missingFor = (filePath, required) => {
      const existing = readTextIfExists(filePath).split(/\r?\n/);
      return required.filter((entry) => !existing.includes(entry));
    };

    if (args.operation === 'explain') {
      return JSON.stringify({ ok: true, docsRoot, entries, reason: 'Generated SuperDuperPowers specs and plans are local-only but must remain readable to OpenCode.' }, null, 2);
    }

    if (args.operation === 'check') {
      const missing = {
        gitignore: missingFor(gitignorePath, entries.gitignore),
        ignore: missingFor(ignorePath, entries.ignore)
      };
      const ok = missing.gitignore.length === 0 && missing.ignore.length === 0;
      return JSON.stringify({ ok, docsRoot, entries, missing }, null, 2);
    }

    if (args.operation === 'apply') {
      const changed = [];
      const gitignoreChanged = appendMissingLines(gitignorePath, entries.gitignore);
      const ignoreChanged = appendMissingLines(ignorePath, entries.ignore);
      changed.push(...gitignoreChanged.map((entry) => ({ file: '.gitignore', entry })));
      changed.push(...ignoreChanged.map((entry) => ({ file: '.ignore', entry })));
      return JSON.stringify({ ok: true, docsRoot, entries, changed }, null, 2);
    }

    return JSON.stringify({ ok: false, reason: `unsupported operation ${args.operation}` }, null, 2);
  }
});

const createBranchContextTool = () => tool({
  description: 'Inspect git branch safety for SuperDuperPowers execution without changing branches.',
  args: {
    strategy: tool.schema.enum(['worktree', 'feature-branch', 'current-branch']).optional()
  },
  async execute(args, context) {
    const directory = context.directory || context.worktree || process.cwd();
    const git = getGitContext(directory);
    const recommendedAction = recommendBranchAction(git);
    return JSON.stringify({ ok: true, strategy: args.strategy || null, git, recommendedAction }, null, 2);
  }
});

const createDoctorTool = (configDir, packageInfo, getRegistrationReport) => tool({
  description: 'Diagnose SuperDuperPowers OpenCode plugin installation and runtime state without modifying files.',
  args: {
    operation: tool.schema.enum(['check'])
  },
  async execute(args, context) {
    const checks = [];
    const directory = context.directory || context.worktree || process.cwd();
    const settingsInput = loadEffectiveSettings({ configDir, packageInfo, directory });
    const paths = getRuntimePaths(configDir, context.sessionID, directory, settingsInput.settings);
    const registration = getRegistrationReport() || null;
    const packageRoot = packageInfo.packageRoot || null;
    const skillsDir = packageInfo.skillsDir || null;
    const agentsDir = packageInfo.agentsDir || null;

    doctorCheck(checks, 'operation', args.operation === 'check' ? 'ok' : 'error', `operation=${args.operation}`);
    doctorCheck(checks, 'package-root', packageRoot && dirExists(packageRoot) ? 'ok' : 'error', packageRoot ? `package root ${packageRoot}` : 'package root unavailable', { packageRoot });
    doctorCheck(checks, 'skills-dir', skillsDir && dirExists(skillsDir) ? 'ok' : 'error', skillsDir ? `skills dir ${skillsDir}` : 'skills dir unavailable', { skillsDir });
    doctorCheck(checks, 'settings', settingsInput.ok ? 'ok' : 'error', settingsInput.ok ? 'live settings validate' : settingsInput.errors.join('; '), { sources: settingsInput.sources, errors: settingsInput.errors, settings: settingsInput.settings });

    const skillsPathStatus = registration?.skillsPath?.status || null;
    doctorCheck(
      checks,
      'skills-registration',
      !registration ? 'warning' : (skillsPathStatus ? 'ok' : 'error'),
      !registration ? 'registration report unavailable until config hook runs' : (skillsPathStatus ? `skills path ${skillsPathStatus}` : 'skills path registration missing'),
      { skillsPath: registration?.skillsPath || null }
    );

    const requiredSkills = {
      'using-superpowers': 'routing',
      brainstorming: 'guidance',
      'writing-plans': 'guidance',
      'systematic-debugging': 'guidance',
      'test-driven-development': 'guidance',
      'frontend-design': 'guidance',
      'subagent-driven-development': 'action',
      'executing-plans': 'action',
      'dispatching-parallel-agents': 'action',
      'using-feature-branches': 'action',
      'using-git-worktrees': 'action',
      'requesting-spec-review': 'review',
      'requesting-code-review': 'review',
      'receiving-spec-review': 'review',
      'receiving-code-review': 'review',
      'verification-before-completion': 'completion',
      'finishing-a-development-branch': 'completion',
      'writing-skills': 'maintainer'
    };
    const missingSkills = Object.keys(requiredSkills).filter((name) => !skillsDir || !fileExists(path.join(skillsDir, name, 'SKILL.md')));
    doctorCheck(checks, 'required-skills', missingSkills.length === 0 ? 'ok' : 'error', missingSkills.length === 0 ? 'required skills exist' : `missing skills: ${missingSkills.join(', ')}`, { requiredSkills: Object.keys(requiredSkills), missingSkills });

    const skillCategoryMismatches = [];
    for (const [name, expectedCategory] of Object.entries(requiredSkills)) {
      const skillPath = skillsDir ? path.join(skillsDir, name, 'SKILL.md') : null;
      if (!skillPath || !fileExists(skillPath)) continue;
      const { frontmatter } = extractAndStripFrontmatter(fs.readFileSync(skillPath, 'utf8'));
      const actualCategory = frontmatter.metadata?.category;
      if (actualCategory !== expectedCategory) {
        skillCategoryMismatches.push(`${name}:${actualCategory || 'missing'}!=${expectedCategory}`);
      }
    }
    doctorCheck(checks, 'skill-categories', skillCategoryMismatches.length === 0 ? 'ok' : 'error', skillCategoryMismatches.length === 0 ? 'required skills have expected categories' : `skill category mismatches: ${skillCategoryMismatches.join(', ')}`, { expectedCategories: requiredSkills, mismatches: skillCategoryMismatches });

    const requiredAgents = ['code-reviewer', 'spec-reviewer', 'lite-code-reviewer', 'lite-spec-reviewer', 'brainstorming-facilitator', 'plan-writer', 'plan-reviewer', 'implementer', 'tdd-implementer', 'debugging-investigator', 'parallelization-advisor'];
    const missingAgents = requiredAgents.filter((name) => !agentsDir || !fileExists(path.join(agentsDir, `${name}.md`)));
    doctorCheck(checks, 'reviewer-agents', missingAgents.length === 0 ? 'ok' : 'error', missingAgents.length === 0 ? 'workflow agents exist' : `missing agents: ${missingAgents.join(', ')}`, { requiredAgents, missingAgents });

    const registeredAgents = registration?.agents || {};
    const missingAgentRegistrations = registration ? requiredAgents.filter((name) => !registeredAgents[name]) : [];
    doctorCheck(
      checks,
      'agent-registration',
      !registration ? 'warning' : (missingAgentRegistrations.length === 0 ? 'ok' : 'error'),
      !registration ? 'registration report unavailable until config hook runs' : (missingAgentRegistrations.length === 0 ? 'workflow agents registered or preserved' : `missing workflow agent registrations: ${missingAgentRegistrations.join(', ')}`),
      { agents: registeredAgents, missingAgentRegistrations }
    );

    const expectedCommands = expectedCommandNames();
    const registeredCommands = registration?.commands || {};
    const missingCommands = registration ? expectedCommands.filter((name) => !registeredCommands[name]) : [];
    doctorCheck(checks, 'commands', !registration ? 'warning' : (missingCommands.length === 0 ? 'ok' : 'error'), !registration ? 'registration report unavailable until config hook runs' : (missingCommands.length === 0 ? 'expected commands registered or preserved' : `missing command registrations: ${missingCommands.join(', ')}`), { commands: registeredCommands, missingCommands });

    const preservedCommands = Object.entries(registeredCommands).filter(([, status]) => status === 'preserved').map(([name]) => name);
    if (preservedCommands.length > 0) {
      doctorCheck(checks, 'command-overrides', 'warning', `user-defined commands preserved: ${preservedCommands.join(', ')}`, { preservedCommands });
    }

    const tools = ['sdp_settings', 'sdp_init', 'sdp_profile', 'sdp_setup_hygiene', 'sdp_branch_context', 'sdp_doctor'];
    doctorCheck(checks, 'tools', 'ok', `expected tools exposed: ${tools.join(', ')}`, { tools });

    const initTarget = inspectProjectConfigTarget(directory, packageInfo);
    const globalSettingsPaths = (settingsInput.searched || []).filter((source) => source.type === 'user').map((source) => source.path);
    const projectSettingsPaths = (settingsInput.searched || []).filter((source) => source.type === 'project').map((source) => source.path);
    const globalSettingsExists = globalSettingsPaths.some((sourcePath) => fileExists(sourcePath));
    const projectSettingsExists = projectSettingsPaths.some((sourcePath) => fileExists(sourcePath));
    const projectConfigMessage = initTarget.errors.length > 0
      ? initTarget.errors.join('; ')
      : (projectSettingsExists
          ? (globalSettingsExists ? 'project SuperDuperPowers settings exist and override global settings' : 'project-local SuperDuperPowers config exists')
          : (globalSettingsExists
              ? 'global SuperDuperPowers settings exist; project-local settings are optional'
              : 'no global or project SuperDuperPowers settings found; run npx superduperpowers --repo for this project or npx superduperpowers --global for user settings; use /sdp-init as an in-session fallback'));
    doctorCheck(
      checks,
      'project-config',
      initTarget.errors.length > 0 ? 'error' : (projectSettingsExists || globalSettingsExists ? 'ok' : 'warning'),
      projectConfigMessage,
      { path: initTarget.configPath, exists: initTarget.exists, globalSettingsExists, projectSettingsExists, globalSettingsPaths, projectSettingsPaths, errors: initTarget.errors }
    );

    const runtimeParentErrors = validateRuntimeParentPaths(paths);
    doctorCheck(checks, 'runtime-parents', runtimeParentErrors.length === 0 ? 'ok' : 'error', runtimeParentErrors.length === 0 ? 'runtime parent paths are safe' : runtimeParentErrors.join('; '), { errors: runtimeParentErrors });

    const containmentErrors = validateRuntimePathContainment(paths);
    doctorCheck(checks, 'runtime-containment', containmentErrors.length === 0 ? 'ok' : 'error', containmentErrors.length === 0 ? 'runtime state paths stay inside owned roots' : containmentErrors.join('; '), { errors: containmentErrors });

    const profilePath = paths.stateDir ? path.join(paths.stateDir, 'profile.json') : null;
    const stateDirErrors = [];
    if (runtimeParentErrors.length > 0 || containmentErrors.length > 0) {
      stateDirErrors.push('stateDir not inspected because runtime paths are unsafe');
    } else if (paths.stateDir) {
      try {
        const stateDirStat = fs.lstatSync(paths.stateDir);
        if (stateDirStat.isSymbolicLink()) stateDirErrors.push('stateDir must not be a symlink');
        if (!stateDirStat.isDirectory()) stateDirErrors.push('stateDir must be a directory');
      } catch (error) {
        if (error.code !== 'ENOENT') stateDirErrors.push(`invalid stateDir: ${error.message}`);
      }
    }
    doctorCheck(checks, 'state-dir', stateDirErrors.length === 0 ? 'ok' : 'error', stateDirErrors.length === 0 ? 'active stateDir is safe to inspect' : stateDirErrors.join('; '), { stateDir: paths.stateDir, errors: stateDirErrors });

    if (stateDirErrors.length > 0) {
      doctorCheck(checks, 'profile', 'error', 'active profile not read because stateDir is unsafe', { profilePath, errors: stateDirErrors });
    } else if (profilePath) {
      const parsed = readProfileJsonSafe(profilePath);
      if (!parsed.value && parsed.errors.length === 0) {
        doctorCheck(checks, 'profile', 'warning', 'active profile has not been initialized', { profilePath });
      } else if (parsed.errors.length > 0) {
        doctorCheck(checks, 'profile', 'error', parsed.errors.join('; '), { profilePath, errors: parsed.errors });
      } else {
        const errors = [...validateProfile(parsed.value, { allowIncomplete: parsed.value?.route === null }).errors, ...validateRelatedStateFiles(paths.stateDir)];
        doctorCheck(checks, 'profile', errors.length === 0 ? 'ok' : 'error', errors.length === 0 ? 'active profile validates' : errors.join('; '), { profilePath, errors });
      }
    } else {
      doctorCheck(checks, 'profile', 'warning', 'active profile has not been initialized', { profilePath });
    }

    doctorCheck(checks, 'runtime-root', dirExists(paths.runtimeRoot) ? 'ok' : 'warning', dirExists(paths.runtimeRoot) ? `runtime root exists: ${paths.runtimeRoot}` : `runtime root not created yet: ${paths.runtimeRoot}`, { runtimeRoot: paths.runtimeRoot });

    const legacyShim = path.join(configDir, 'plugins', 'superpowers.js');
    doctorCheck(checks, 'legacy-shim', fileExists(legacyShim) ? 'warning' : 'ok', fileExists(legacyShim) ? `legacy shim exists: ${legacyShim}` : 'legacy superpowers.js shim not found', { legacyShim });

    const configText = `${readTextSafe(path.join(configDir, 'opencode.json'))}\n${readTextSafe(path.join(configDir, 'opencode.jsonc'))}`;
    const duplicateRisk = /superpowers\.js/.test(configText) || (/superduperpowers/.test(configText) && fileExists(legacyShim));
    doctorCheck(checks, 'duplicate-plugin-risk', duplicateRisk ? 'warning' : 'ok', duplicateRisk ? 'possible mixed legacy/package plugin load detected' : 'no mixed legacy/package plugin risk detected from known files', { checkedConfigDir: configDir });

    const hygiene = docsEntriesFor(directory, null, settingsInput);
    const gitignore = readTextSafe(path.join(directory, '.gitignore')).split(/\r?\n/);
    const ignore = readTextSafe(path.join(directory, '.ignore')).split(/\r?\n/);
    const missingHygiene = {
      gitignore: hygiene.entries.gitignore.filter((entry) => !gitignore.includes(entry)),
      ignore: hygiene.entries.ignore.filter((entry) => !ignore.includes(entry))
    };
    doctorCheck(checks, 'generated-doc-hygiene', missingHygiene.gitignore.length === 0 && missingHygiene.ignore.length === 0 ? 'ok' : 'warning', missingHygiene.gitignore.length === 0 && missingHygiene.ignore.length === 0 ? 'generated-doc hygiene entries are present' : 'generated-doc hygiene entries are missing', { docsRoot: hygiene.docsRoot, missing: missingHygiene });

    const quarantines = runtimeParentErrors.length === 0 && dirExists(paths.quarantineRoot) ? fs.readdirSync(paths.quarantineRoot).filter(Boolean) : [];
    const repairFailures = quarantines.filter((entry) => entry.startsWith('repair-failure-'));
    doctorCheck(
      checks,
      'repair-history',
      runtimeParentErrors.length > 0 ? 'error' : (repairFailures.length > 0 ? 'error' : (quarantines.length === 0 ? 'ok' : 'warning')),
      runtimeParentErrors.length > 0 ? 'repair history not read because runtime parent paths are unsafe' : (repairFailures.length > 0 ? `failed automatic repairs found: ${repairFailures.length}` : (quarantines.length === 0 ? 'no quarantined runtime state found' : `quarantined runtime state entries: ${quarantines.length}`)),
      { quarantineRoot: paths.quarantineRoot, quarantines, repairFailures }
    );

    return JSON.stringify(summarizeDoctor(checks), null, 2);
  }
});

export const createSdpTools = ({ configDir, packageInfo = {}, getRegistrationReport = () => null }) => ({
  sdp_settings: createSettingsTool(configDir, packageInfo),
  sdp_init: createInitTool(packageInfo),
  sdp_profile: createProfileTool(configDir, packageInfo),
  sdp_setup_hygiene: createSetupHygieneTool(configDir, packageInfo),
  sdp_branch_context: createBranchContextTool(),
  sdp_doctor: createDoctorTool(configDir, packageInfo, getRegistrationReport)
});
