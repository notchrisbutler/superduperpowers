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
      if (!line.startsWith(' ') && rawValue === '') {
        const nested = {};
        while (i + 1 < lines.length && /^  [^ ].*:/.test(lines[i + 1])) {
          i++;
          const nestedLine = lines[i];
          const nestedColonIdx = nestedLine.indexOf(':');
          const nestedKey = nestedLine.slice(0, nestedColonIdx).trim();
          const nestedValue = nestedLine.slice(nestedColonIdx + 1).trim();
          nested[nestedKey] = nestedValue.replace(/^["']|["']$/g, '');
        }
        frontmatter[key] = nested;
        continue;
      }
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
  }
});

export const expectedCommandNames = () => Object.keys(SDP_COMMANDS);

export const buildTuiCommands = ({ client, workspace } = {}) => {
  const submitCommandPrompt = async (command) => {
    const workspaceID = typeof workspace?.current === 'function' ? workspace.current() : undefined;
    const text = command.template.replaceAll('$ARGUMENTS', '').trim();
    await client?.tui?.appendPrompt?.({ workspace: workspaceID, text });
    await client?.tui?.submitPrompt?.({ workspace: workspaceID });
  };

  return Object.entries(SDP_COMMANDS).map(([name, command]) => ({
    title: `/${name}`,
    value: `superduperpowers.${name}`,
    description: command.description,
    category: 'SuperDuperPowers',
    slash: { name },
    onSelect: () => submitCommandPrompt(command)
  }));
};

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
    const editPermission = frontmatter.permission_edit || 'deny';
    const todoPermission = frontmatter.permission_todowrite || 'deny';

    const agent = {
      description,
      mode: 'subagent',
      prompt,
      permission: {
        edit: editPermission === 'allow' ? 'allow' : 'deny',
        todowrite: todoPermission === 'allow' ? 'allow' : 'deny'
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

  const configGuidance = `OpenCode mapping: use native tools; \`TodoWrite\` means \`todowrite\`, \`Task\` means OpenCode task/subagent support, and \`Skill\` means OpenCode's skill tool. Configuration is manual and project-local: when workflow defaults matter, read \`superduperpowers.json[c]\` or \`sdp.json[c]\` from the project root or \`.opencode/\`, summarize only relevant settings, and pass them explicitly to subagents. No \`sdp_*\` runtime tools or plugin-managed session state are available.`;

  return `<EXTREMELY_IMPORTANT>
You have SuperDuperPowers.

SuperDuperPowers is opt-in by default. Aliases include \`/sdp\`, \`superpowers\`, \`superduperpowers\`, \`/superpowers\`, \`/superduperpowers\`, and \`/brainstorm\`.

Use the full workflow only when the user explicitly invokes SuperDuperPowers, names a SuperDuperPowers skill, or the request is clearly deep, ambiguous, high-risk, investigation-heavy, or plan-heavy. For small reviews, small code changes, wording edits, config tweaks, and bounded tasks, use ordinary behavior or a lightweight quick flow.

If SuperDuperPowers routing is unclear, ask the user to choose Full Brainstorming, Quick Implementation, or No SuperDuperPowers before loading heavy workflow skills. Load \`using-superpowers\` only when you need detailed routing rules.

${configGuidance}
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
