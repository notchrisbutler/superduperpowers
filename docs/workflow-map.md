# SuperDuperPowers Workflow Map

SuperDuperPowers keeps skill directories flat for harness registration, then uses frontmatter `category` metadata to make the workflow roles explicit.

Skills are the canonical harness-neutral workflow source. Named workflow agents are thin adapter roles for harnesses that support subagents, including the included OpenCode config. The main agent remains the coordinator: it owns todos, route decisions, branch flow, commits, review gates, validation gates, and next-step decisions.

## Routes

| Route | Typical flow |
|---|---|
| Full workflow | `using-superpowers` -> `brainstorming` -> `writing-plans` -> `subagent-driven-development` or `executing-plans` -> review agents -> `verification-before-completion` -> `finishing-a-development-branch` |
| Quick flow | `using-superpowers` -> lightweight context -> approval before edits -> smallest correct change -> targeted validation -> brief self-review |
| No SuperDuperPowers | Ordinary agent behavior for trivial work or explicit requests to avoid SDP |

## Skill Categories

| Category | Skills |
|---|---|
| Routing | `using-superpowers` |
| Guidance | `brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development` |
| Action | `subagent-driven-development`, `executing-plans`, `dispatching-parallel-agents`, `using-feature-branches`, `using-git-worktrees` |
| Review | `requesting-spec-review`, `requesting-code-review`, `receiving-spec-review`, `receiving-code-review` |
| Completion | `verification-before-completion`, `finishing-a-development-branch` |
| Maintainer | `writing-skills` |

## Agent Roles

| Role | Agents |
|---|---|
| Design and planning | `brainstorming-facilitator`, `plan-writer`, `plan-reviewer` |
| Implementation | `implementer`, `tdd-implementer` |
| Investigation and coordination | `debugging-investigator`, `parallelization-advisor` |
| Review | `spec-reviewer`, `code-reviewer`, `lite-spec-reviewer`, `lite-code-reviewer` |

Writable agents are limited to roles that create specs, plans, or implementation changes. Review, investigation, and parallelization agents remain read-only.

Fallback prompts live beside the skills that use them and exist only for harnesses without named-agent support. Keep fallback prompts aligned with the canonical named agent behavior; do not let fallback prompt wording become a separate workflow source.

## Registration Constraint

The included OpenCode plugin registers the flat package `skills/` directory as one skills path. Do not move skills into nested category directories unless the plugin registration and tests are updated to register every category root.
