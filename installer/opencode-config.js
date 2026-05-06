import fs from 'node:fs';

const NPM_PLUGIN = 'superduperpowers';

export function readOpenCodeConfig(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    return { status: 'missing', filePath };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return parseOpenCodeConfig(raw, { ...options, filePath });
}

export function parseOpenCodeConfig(raw, options = {}) {
  const filePath = options.filePath ?? null;
  const format = options.format ?? inferFormat(filePath);
  const nonInteractive = options.nonInteractive !== false;

  try {
    return parsedResult(JSON.parse(raw), raw, filePath, format, 'json');
  } catch (jsonError) {
    if (format === 'json') {
      return manualResult('invalid-json', filePath, raw, jsonError.message);
    }
  }

  const jsonc = stripJsoncConservatively(raw);
  if (!jsonc.safe && nonInteractive) {
    return manualResult('complex-jsonc', filePath, raw, jsonc.reason);
  }

  try {
    return parsedResult(JSON.parse(jsonc.text), raw, filePath, format, 'jsonc');
  } catch (error) {
    return manualResult('invalid-jsonc', filePath, raw, error.message);
  }
}

export function parseInlineOpenCodeConfigContent(raw, options = {}) {
  const parsed = parseOpenCodeConfig(raw, { ...options, filePath: 'OPENCODE_CONFIG_CONTENT', format: 'jsonc' });
  if (inlineContentAppearsToControlPlugins(raw, parsed.config)) {
    return {
      status: 'needs-manual-attention',
      reason: 'OPENCODE_CONFIG_CONTENT appears to control OpenCode plugin loading; inline config will not be edited by the installer.',
      manualSnippet: pluginManualSnippet(),
      parsed,
    };
  }
  return parsed;
}

export function planAddSuperDuperPowersPlugin(input, options = {}) {
  const parsed = normalizeParsedInput(input, options);
  if (parsed.status !== 'ok') return parsed;

  const plugin = parsed.config.plugin;
  if (plugin !== undefined && !Array.isArray(plugin)) {
    return manualConfigPlan(parsed, 'plugin-not-array', 'OpenCode config has a non-array plugin field. Add the SuperDuperPowers plugin manually.');
  }

  const current = plugin ? [...plugin] : [];
  const npmIndexes = indexesOfPlugin(current, NPM_PLUGIN);
  const alternateSources = current.filter(isAlternateSuperDuperPowersSource);
  const warnings = [];
  let nextPlugin = dedupePlugins(current);
  let changed = nextPlugin.length !== current.length || !plugin;

  if (npmIndexes.length === 0) {
    if (alternateSources.length > 0 && !options.replaceAlternateSources) {
      warnings.push('Existing GitHub/local SuperDuperPowers plugin source preserved; npm source was not added automatically.');
    } else {
      if (options.replaceAlternateSources) {
        nextPlugin = nextPlugin.filter((entry) => !isAlternateSuperDuperPowersSource(entry));
      }
      nextPlugin.push(NPM_PLUGIN);
      changed = true;
    }
  }

  return configPlan(parsed, { ...parsed.config, plugin: nextPlugin }, changed, warnings, 'merge-plugin');
}

export function planRemoveSuperDuperPowersPlugin(input, options = {}) {
  const parsed = normalizeParsedInput(input, options);
  if (parsed.status !== 'ok') return parsed;

  const plugin = parsed.config.plugin;
  if (plugin === undefined) return configPlan(parsed, parsed.config, false, [], 'remove-plugin');
  if (!Array.isArray(plugin)) {
    return manualConfigPlan(parsed, 'plugin-not-array', 'OpenCode config has a non-array plugin field. Remove SuperDuperPowers manually if needed.');
  }

  const warnings = [];
  const alternateSources = plugin.filter(isAlternateSuperDuperPowersSource);
  if (alternateSources.length > 0 && !options.removeAlternateSources) {
    warnings.push('Existing GitHub/local SuperDuperPowers plugin source preserved during npm removal.');
  }

  const nextPlugin = plugin.filter((entry) => entry !== NPM_PLUGIN && !(options.removeAlternateSources && isAlternateSuperDuperPowersSource(entry)));
  return configPlan(parsed, { ...parsed.config, plugin: nextPlugin }, nextPlugin.length !== plugin.length, warnings, 'remove-plugin');
}

export function hasSuperDuperPowersPlugin(input, options = {}) {
  const parsed = normalizeParsedInput(input, options);
  if (parsed.status !== 'ok') return false;
  return Array.isArray(parsed.config.plugin) && parsed.config.plugin.some(isSuperDuperPowersSource);
}

export function writeOpenCodeConfigPlan(plan) {
  if (!plan || plan.status !== 'ready') {
    throw new Error('Refusing to write an OpenCode config plan that is not ready.');
  }
  if (!plan.filePath) {
    throw new Error('Refusing to write an OpenCode config plan without a file path.');
  }
  fs.writeFileSync(plan.filePath, plan.content, 'utf8');
}

export function pluginManualSnippet() {
  return `{
  "plugin": ["superduperpowers"]
}`;
}

function normalizeParsedInput(input, options) {
  if (typeof input === 'string') return parseOpenCodeConfig(input, options);
  if (input?.status) return input;
  if (input && typeof input === 'object') {
    return parsedResult(input, null, options.filePath ?? null, options.format ?? 'json', 'object');
  }
  return manualResult('invalid-input', options.filePath ?? null, '', 'Expected config object, raw config string, or parsed config result.');
}

function parsedResult(config, raw, filePath, format, parsedAs) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return manualResult('config-not-object', filePath, raw, 'OpenCode config must be a JSON object.');
  }
  return { status: 'ok', config, raw, filePath, format, parsedAs };
}

function manualResult(reason, filePath, raw, detail) {
  return {
    status: 'needs-manual-attention',
    reason,
    detail,
    filePath,
    raw,
    manualSnippet: pluginManualSnippet(),
  };
}

function manualConfigPlan(parsed, reason, detail) {
  return {
    status: 'needs-manual-attention',
    reason,
    detail,
    filePath: parsed.filePath,
    manualSnippet: pluginManualSnippet(),
    warnings: [],
  };
}

function configPlan(parsed, config, changed, warnings, operation) {
  return {
    status: 'ready',
    operation,
    changed,
    filePath: parsed.filePath,
    config,
    content: `${JSON.stringify(config, null, 2)}\n`,
    warnings,
    manualSnippet: pluginManualSnippet(),
  };
}

function inferFormat(filePath) {
  return filePath?.endsWith('.jsonc') ? 'jsonc' : 'json';
}

function stripJsoncConservatively(raw) {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  let changed = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      changed = true;
      while (i < raw.length && raw[i] !== '\n') i += 1;
      output += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      changed = true;
      i += 2;
      let closed = false;
      while (i < raw.length) {
        if (raw[i] === '*' && raw[i + 1] === '/') {
          closed = true;
          i += 1;
          break;
        }
        if (raw[i] === '\n') output += '\n';
        i += 1;
      }
      if (!closed) return { safe: false, reason: 'Unclosed block comment in JSONC config.', text: raw };
      continue;
    }

    output += char;
  }

  const withoutTrailingCommas = removeTrailingCommasOutsideStrings(output);
  if (withoutTrailingCommas !== output) changed = true;

  return { safe: true, changed, text: withoutTrailingCommas };
}

function removeTrailingCommasOutsideStrings(raw) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (/\s/.test(raw[j] || '')) j += 1;
      if (raw[j] === '}' || raw[j] === ']') continue;
    }

    output += char;
  }

  return output;
}

function dedupePlugins(plugins) {
  const seen = new Set();
  const next = [];
  for (const plugin of plugins) {
    const key = typeof plugin === 'string' ? plugin : JSON.stringify(plugin);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(plugin);
  }
  return next;
}

function indexesOfPlugin(plugins, pluginName) {
  const indexes = [];
  plugins.forEach((plugin, index) => {
    if (plugin === pluginName) indexes.push(index);
  });
  return indexes;
}

function isSuperDuperPowersSource(entry) {
  return entry === NPM_PLUGIN || isAlternateSuperDuperPowersSource(entry);
}

function isAlternateSuperDuperPowersSource(entry) {
  return typeof entry === 'string'
    && entry !== NPM_PLUGIN
    && /^superduperpowers@/.test(entry);
}

function inlineContentAppearsToControlPlugins(raw, config) {
  if (config && Array.isArray(config.plugin)) return true;
  return /"plugin"\s*:|\bplugin\b.*superduperpowers|superduperpowers/.test(raw);
}
