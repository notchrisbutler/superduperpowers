# SuperDuperPowers Workflow Map

SuperDuperPowers keeps skill directories flat for harness registration, then uses frontmatter `metadata.category` to make the workflow roles explicit.

Skills are the canonical harness-neutral workflow source. Named workflow agents are thin adapter roles for harnesses that support subagents, including the included OpenCode config. The main agent remains the coordinator: it owns todos, route decisions, branch flow, commits, review gates, validation gates, and next-step decisions.

## Routes

| Route | Typical flow |
|---|---|
| Full workflow | `using-superpowers` -> `brainstorming` -> `writing-plans` -> `subagent-driven-development` or `executing-plans` -> review agents -> `verification-before-completion` -> `finishing-a-development-branch` |
| Quick flow | `using-superpowers` -> lightweight context -> approval before edits -> smallest correct change -> targeted validation -> brief self-review |
| Frontend/UI support | `frontend-design` augments brainstorming, planning, and execution whenever work includes user-facing screens, responsive layout, interaction states, or visual polish |
| No SuperDuperPowers | Ordinary agent behavior for trivial work or explicit requests to avoid SDP |

## Skill Categories

| Category | Skills |
|---|---|
| Routing | `using-superpowers` |
| Guidance | `brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development`, `frontend-design` |
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

## Loop And Context Guardrails

Execution workflows should stop after repeated failed attempts in the same scope. A light approach adjustment can be recorded in the plan/spec and continued autonomously; major design, dependency, architecture, data-model, security, or product decisions require user direction or an explicit placeholder seam while independent work continues.

Worker prompts should carry compact task context: assigned task, acceptance criteria, file ownership, evidence, and validation commands. Stable rules remain in skills and agent definitions so repeated handoffs stay small and cache-friendly.

## Registration Constraint

The included OpenCode plugin registers the flat package `skills/` directory as one skills path. Do not move skills into nested category directories unless the plugin registration and tests are updated to register every category root.
