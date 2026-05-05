import fs from 'fs';
import path from 'path';

export const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  const lines = frontmatterStr.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const rawValue = line.slice(colonIdx + 1).trim();
      if (rawValue === '|' || rawValue === '>') {
        const block = [];
        while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === '')) {
          i++;
          block.push(lines[i].replace(/^ {2}/, ''));
        }
        frontmatter[key] = block.join('\n').trim();
        continue;
      }
      frontmatter[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }

  return { frontmatter, content: body };
};

export const SDP_COMMANDS = Object.freeze({
  sdp: {
    description: 'Open SuperDuperPowers routing',
    template: 'Use SuperDuperPowers. If the route is unclear, ask me to choose Full Brainstorming, Quick Implementation, or No SuperDuperPowers before proceeding. Arguments: $ARGUMENTS'
  },
  superduperpowers: {
    description: 'Open SuperDuperPowers routing',
    template: 'Use SuperDuperPowers. If the route is unclear, ask me to choose Full Brainstorming, Quick Implementation, or No SuperDuperPowers before proceeding. Arguments: $ARGUMENTS'
  },
  superpowers: {
    description: 'Legacy alias for SuperDuperPowers routing',
    template: 'Use SuperDuperPowers. Treat this as the legacy /superpowers alias. If the route is unclear, ask me to choose Full Brainstorming, Quick Implementation, or No SuperDuperPowers before proceeding. Arguments: $ARGUMENTS'
  },
  brainstorm: {
    description: 'Start SuperDuperPowers brainstorming',
    template: 'Use SuperDuperPowers brainstorming for this request. Load the brainstorming skill and follow its approval gate before any implementation. Arguments: $ARGUMENTS'
  },
  'quick-flow': {
    description: 'Use SuperDuperPowers quick flow',
    template: 'Use SuperDuperPowers quick flow for this request. Keep the work lightweight and bounded: gather only enough context, make the smallest correct change, run targeted validation when practical, and do not use full brainstorming, planning, or TDD unless the task escalates. Arguments: $ARGUMENTS'
  },
  'write-plan': {
    description: 'Write a SuperDuperPowers implementation plan',
    template: 'Use the SuperDuperPowers writing-plans workflow to write a full implementation plan from the approved spec or design. Arguments: $ARGUMENTS'
  },
  'execute-plan': {
    description: 'Execute an approved SuperDuperPowers plan',
    template: 'Use the active SuperDuperPowers execution workflow to execute the approved plan. Ask for execution method and strategy if they are not already recorded. Arguments: $ARGUMENTS'
  },
  'sdp-status': {
    description: 'Diagnose SuperDuperPowers install and runtime health',
    template: 'Run the sdp_doctor tool with operation "check" and summarize install/runtime health, warnings, errors, repair history, and recommended next steps.'
  },
  'sdp-profile': {
    description: 'Summarize the active SuperDuperPowers workflow profile',
    template: 'Run sdp_profile with operation "summary" and summarize the active SuperDuperPowers workflow profile.'
  },
  'sdp-cleanup': {
    description: 'Inspect stale SuperDuperPowers runtime state',
    template: 'Inspect stale SuperDuperPowers runtime state with sdp_profile cleanup only after confirming whether I want cleanup. If I explicitly asked to clean, run cleanup and report removed and kept paths.'
  }
});

export const expectedCommandNames = () => Object.keys(SDP_COMMANDS);

export const loadBundledAgents = (agentsDir) => {
  if (!fs.existsSync(agentsDir)) return {};

  const agents = {};
  for (const file of fs.readdirSync(agentsDir)) {
    if (!file.endsWith('.md')) continue;

    const agentPath = path.join(agentsDir, file);
    const { frontmatter, content } = extractAndStripFrontmatter(fs.readFileSync(agentPath, 'utf8'));
    const name = frontmatter.name || path.basename(file, '.md');
    const description = frontmatter.description;
    const prompt = content.trim();
    if (!name || !description || !prompt) continue;

    const agent = {
      description,
      mode: 'subagent',
      prompt,
      permission: {
        edit: 'deny',
        todowrite: 'deny'
      }
    };

    if (frontmatter.model && frontmatter.model !== 'inherit') {
      agent.model = frontmatter.model;
    }

    agents[name] = agent;
  }

  return agents;
};

export const getBootstrapContent = (skillsDir) => {
  const skillPath = path.join(skillsDir, 'using-superpowers', 'SKILL.md');
  if (!fs.existsSync(skillPath)) return null;

  const fullContent = fs.readFileSync(skillPath, 'utf8');
  const { content } = extractAndStripFrontmatter(fullContent);
  const toolMapping = `**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
- \`TodoWrite\` -> \`todowrite\`
- \`Task\` tool with subagents -> Use OpenCode's \`task\` tool with the named \`subagent_type\` when available; use @mentions for manual user-invoked subagents
- \`Skill\` tool -> OpenCode's native \`skill\` tool
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` -> Your native tools
- SuperDuperPowers workflow profile/state -> Use \`sdp_profile\` when available; otherwise carry decisions explicitly in prompts and generated docs
- SuperDuperPowers live settings -> Use \`sdp_settings\` when available at routing, spec, plan, execution, review, and finalization gates
- SuperDuperPowers generated-doc hygiene -> Use \`sdp_setup_hygiene\` when available before writing project-local generated specs/plans
- SuperDuperPowers branch preflight -> Use \`sdp_branch_context\` when available before execution starts
- SuperDuperPowers diagnostics -> Use \`sdp_doctor\` when checking install or runtime health
- Invocation aliases include \`/sdp\`, \`superpowers\`, \`superduperpowers\`, \`/superpowers\`, \`/superduperpowers\`, and \`/brainstorm\`

Use OpenCode's native \`skill\` tool to list and load skills.`;

  return `<EXTREMELY_IMPORTANT>
You have SuperDuperPowers.

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-superpowers" again - that would be redundant.**

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
};

export const registerBundledConfig = (config, { skillsDir, agentsDir }) => {
  const report = {
    skillsPath: { path: skillsDir, status: 'missing' },
    agents: {},
    commands: {}
  };

  config.skills = config.skills || {};
  config.skills.paths = config.skills.paths || [];
  if (config.skills.paths.includes(skillsDir)) {
    report.skillsPath.status = 'already-present';
  } else {
    config.skills.paths.push(skillsDir);
    report.skillsPath.status = 'registered';
  }

  config.agent = config.agent || {};
  for (const [name, agent] of Object.entries(loadBundledAgents(agentsDir))) {
    if (config.agent[name]) {
      report.agents[name] = 'preserved';
    } else {
      config.agent[name] = agent;
      report.agents[name] = 'registered';
    }
  }

  config.command = config.command || {};
  for (const [name, command] of Object.entries(SDP_COMMANDS)) {
    if (config.command[name]) {
      report.commands[name] = 'preserved';
    } else {
      config.command[name] = command;
      report.commands[name] = 'registered';
    }
  }

  return report;
};
