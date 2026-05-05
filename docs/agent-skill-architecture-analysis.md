# Agent And Skill Architecture Analysis

## Purpose

This analysis compares SuperDuperPowers' current hybrid model of skills plus named workflow agents against a simpler model of skills plus a general-purpose agent loaded with full prompt text. The goal is to minimize token usage while preserving strong orchestration, execution context, review independence, and practical OpenCode behavior.

## Current Architecture

SuperDuperPowers currently uses three instruction layers:

1. **Bootstrap:** A compact first-user-message injection that explains when to use SuperDuperPowers, maps OpenCode tools, and points to live settings/profile tools.
2. **Skills:** The canonical workflow sources under `skills/`. These are lazily loaded through OpenCode's native skill discovery.
3. **Named workflow agents:** Role prompts under `agents/`, registered as OpenCode subagent types with edit and todo permissions.

The included OpenCode plugin registers:

- One bundled skills path through `config.skills.paths`.
- Eleven named workflow agents through `config.agent`.
- Runtime tools for live settings, profile state, setup hygiene, branch context, diagnostics, and initialization.
- A compaction hook that re-injects compact profile state after context compaction.

Important current guardrails:

- `tests/opencode/test-workflow-policy.sh` caps bootstrap size at 220 words and verifies that heavy routing content is not injected by default.
- `tests/opencode/test-plugin-loading.sh` verifies all named agents register as `mode: subagent`.
- Writable workflow agents are limited to `brainstorming-facilitator`, `plan-writer`, `implementer`, and `tdd-implementer`.
- All registered workflow agents have `permission_todowrite: deny`; the main agent owns visible todos.

## Measured Instruction Footprint

These measurements were taken from the current repository.

| Surface | Files | Words | Lines | Bytes |
|---|---:|---:|---:|---:|
| Bootstrap injection | 1 generated string | 142 | 11 | 1,191 |
| All `SKILL.md` files | 17 | 20,818 | 3,345 | 143,410 |
| All agent definitions | 11 | 2,734 | 432 | 19,309 |
| Common full workflow skills selected together | 10 | 11,682 | 1,821 | n/a |

Agent prompt sizes:

| Agent | Words | Permission |
|---|---:|---|
| `parallelization-advisor` | 139 | read-only |
| `plan-reviewer` | 173 | read-only |
| `lite-code-reviewer` | 183 | read-only |
| `debugging-investigator` | 185 | read-only |
| `lite-spec-reviewer` | 207 | read-only |
| `brainstorming-facilitator` | 211 | writable |
| `tdd-implementer` | 224 | writable |
| `plan-writer` | 228 | writable |
| `implementer` | 276 | writable |
| `spec-reviewer` | 329 | read-only |
| `code-reviewer` | 475 | read-only |

Large skills:

| Skill | Words | Lines |
|---|---:|---:|
| `writing-skills` | 3,227 | 657 |
| `subagent-driven-development` | 2,091 | 234 |
| `writing-plans` | 2,090 | 228 |
| `test-driven-development` | 1,958 | 411 |
| `systematic-debugging` | 1,623 | 296 |
| `brainstorming` | 1,493 | 161 |
| `finishing-a-development-branch` | 1,416 | 238 |

The key finding is that the agent layer is small compared with the skills layer. The entire named-agent set is roughly the size of one large skill. The expensive path is not "agents exist"; the expensive path is loading many skill bodies or pasting fallback prompts repeatedly.

## External Baseline: Upstream Superpowers

The upstream `obra/superpowers` project has moved more strongly toward skills as the portable source of truth. Its v5.1.0 release notes say the named `superpowers:code-reviewer` agent was removed, with the persona/checklist merged into a skill-local generic Task dispatch template. The same release notes describe context-isolation updates across delegation skills. GitHub issue discussion also shows a concrete failure mode where workflow skills and Agent/subagent types are easy to confuse when both concepts are present.

Practical implication: upstream's direction argues for skills as canonical, portable workflow definitions, not necessarily for avoiding every subagent. The lesson for SuperDuperPowers is to keep roles and routing unambiguous:

- Skills define workflow.
- Agents define bounded execution/review roles for harnesses that support them.
- Generic workers plus fallback prompts remain the compatibility path.

## Option A: Current Hybrid Model

This model keeps skills as the canonical workflow source and uses named agents as short role wrappers.

### Strengths

- **Low baseline token cost:** Bootstrap is only 142 words and heavy skill content is loaded only when needed.
- **Strong role isolation:** Reviewer, investigator, planner, and implementer roles start with constrained prompts rather than inheriting the coordinator's full working context.
- **Permission separation:** OpenCode can enforce edit permissions by role. Reviewers and investigators are read-only. Implementers can edit but cannot mutate todos.
- **Coordinator discipline:** The main agent keeps todo ownership, dispatch ordering, integration, validation, and commits.
- **Cheaper dispatch prompts:** A named `implementer` static prompt is about 276 words. The fallback implementer prompt is about 778 words before task-specific context.
- **Clearer output contracts:** Each agent has a stable report format.
- **Review independence:** Named reviewers make it harder for the same execution context to rationalize its own work.
- **Parallelism:** Parallel implementation or investigation can happen with isolated worker contexts.

### Costs

- **More moving parts:** Skills, fallback prompts, agent definitions, and plugin registration can drift.
- **Harness dependence:** Named agents are an OpenCode adapter surface. They are not the harness-neutral workflow source.
- **Potential hidden prompt cost:** OpenCode registers full agent prompts in config. The tests prove registration, but they do not prove whether OpenCode exposes all prompt bodies to the main model during normal turns.
- **Dispatch overhead:** Subagents cost extra model calls. For small work, the overhead can exceed the benefit.
- **Coordination complexity:** Bad task boundaries can create context fragmentation, merge conflicts, or repeated validation costs.

### Best Fit

Use this model for:

- Multi-step plan execution.
- Review gates where independence matters.
- TDD or debugging work with specific process constraints.
- Parallelizable work streams.
- Any task where bounded worker scope protects the main context.

## Option B: Skills Only Plus General-Purpose Agent

This model removes named role agents and dispatches a generic worker with role instructions copied from skill templates, or keeps all work in the main session with loaded skills.

### Strengths

- **Portable across harnesses:** Skills and generic dispatch work where named agents do not.
- **Fewer adapter surfaces:** No agent registration layer, no named-agent permission mapping, fewer OpenCode-specific files to test.
- **One canonical source:** Less risk that `agents/*.md` and fallback prompt templates diverge.
- **Simpler mental model:** The agent loads a skill and follows it.

### Costs

- **Higher per-dispatch prompt cost:** Generic workers need the full role prompt pasted each time. For implementer dispatch, the fallback prompt is around 778 words versus the named agent's 276-word static role.
- **Weaker permission boundaries:** A general-purpose worker may have broader tool access unless the harness supports tool restrictions another way.
- **Weaker role affordance:** The model must infer "be a reviewer" or "be an implementer" from a pasted prompt rather than a named agent type with a stable role.
- **More context leakage risk:** Main-session execution with fully loaded skills keeps orchestration, implementation, review, and reasoning in one context.
- **Harder review independence:** A general-purpose worker can review, implement, and summarize from the same loaded workflow unless the coordinator is disciplined about separate dispatches.
- **More repeated instruction text:** Full skill files or fallback prompts tend to be pasted or loaded repeatedly at task boundaries.

### Best Fit

Use this model for:

- Harnesses without named subagents.
- Small tasks where subagent setup is wasteful.
- Read-only guidance where the skill itself is sufficient.
- Portable workflow behavior that must not depend on OpenCode.

## Option C: Fully Loaded Skill File In Main Context

This is the most aggressive skills-only version: load one large skill or many workflow skills into the main context and let a general-purpose agent do everything.

### Strengths

- **Lowest orchestration overhead:** No dispatch mechanics or agent handoffs.
- **Maximum local continuity:** The same context sees all decisions and file exploration.
- **Good for narrow edits:** Works well when the task is simple and a subagent would be ceremony.

### Costs

- **Highest sustained context pressure:** A realistic full workflow can load more than 11k words of skill instructions before code context and user/project instructions.
- **Lower independence:** The same context plans, implements, and reviews, which increases self-confirmation risk.
- **Todo ownership can blur:** If one general-purpose context is doing everything, it is easy to collapse orchestration and implementation.
- **Compaction risk:** Long-running workflows are more likely to lose nuanced workflow state or review rationale.
- **Less scalable parallelism:** Parallel investigation and implementation become harder or impossible.

### Best Fit

Use this only for small or medium work where:

- The user has not requested full workflow.
- There is no need for independent review.
- The implementation is tightly coupled enough that dispatching would cause more confusion than focus.

## Token-Efficiency Analysis

The efficient design is not "agents instead of skills" or "skills instead of agents." The efficient design is progressive disclosure:

1. Keep the bootstrap tiny.
2. Load one workflow skill only when routing requires it.
3. Dispatch named agents with short stable role prompts when role isolation matters.
4. Pass only the exact task text, compact profile summary, relevant files, and validation commands to workers.
5. Use fallback prompt templates only when named agents are unavailable.
6. Avoid loading multiple large workflow skills into the main context unless they are actually active.

Under this model, named agents are a token optimization for repeated role dispatches. A named agent's static role prompt is registered once in the harness and selected by name. A generic worker needs more role text in every dispatch prompt. Even if OpenCode includes some agent metadata in the main model context, the total registered agent body is still only about 2.7k words, while the skills corpus is about 20.8k words.

The bigger token risk is not the named agent layer. It is:

- Loading `writing-skills`, `test-driven-development`, `subagent-driven-development`, and `writing-plans` together when only one is active.
- Using fallback prompts even when named agents exist.
- Asking subagents to read full plans instead of passing bounded excerpts.
- Letting worker subagents inherit or reconstruct coordinator context.
- Re-running reviewers with unchanged context.
- Broad parent-task dispatches that make implementers load too much code and too much plan text.

## Orchestration-Quality Analysis

The named-agent layer materially improves orchestration when it is kept subordinate to skills:

- Skills say **when** and **why** to route.
- Agents say **who** the worker is for one bounded assignment.
- Runtime tools provide **current state** without bloating the prompt.
- The coordinator owns **todos, dependencies, integration, reviews, validation, and commits**.

Removing agents entirely would simplify packaging but would weaken the exact behavior SuperDuperPowers recently tightened: the main agent as orchestrator, subagents as bounded workers, and reviewers as independent read-only checks.

The strongest argument against agents is not token cost. It is drift and portability. The current repo already compensates for this by keeping fallback prompts and skill guidance. The remaining risk is that `agents/*.md` and fallback prompt templates can diverge.

## Recommendation

Keep the hybrid model, but make it more explicitly "skills first, agents as adapters."

Recommended policy:

1. **Keep skills canonical.** Every workflow rule belongs first in `skills/`.
2. **Keep named agents for role isolation.** They are worth the small static footprint for implementation, TDD, review, plan writing, plan review, debugging investigation, and parallelization advice.
3. **Do not make agents orchestrators.** Agents should not own todos, branch flow, commits, or next-step decisions.
4. **Use fallback prompts only for harnesses without named agents.** Treat them as generated or mirrored adapter content, not independent doctrine.
5. **Prefer inline skills for small work.** For quick flow, ordinary reviews, and tightly coupled edits, avoid subagent overhead.
6. **Use subagents for independence, not ritual.** Dispatch when context isolation, permissions, parallelism, or review independence matters.
7. **Measure loaded context, not repository size.** The repo can contain many skills if only metadata and selected bodies are loaded.

## Proposed Architecture Rules

| Work type | Main session | Named agent | General-purpose fallback |
|---|---|---|---|
| Trivial or small bounded edit | Yes | No | No |
| Quick flow with low risk | Yes | No | No |
| Brainstorming with active user collaboration | Yes | Optional for large designs | Yes |
| Plan writing for substantial scope | Coordinator loads `writing-plans` | `plan-writer` | Generic worker with plan-writer prompt |
| Plan review | Coordinator routes | `plan-reviewer` | Generic read-only reviewer prompt |
| Normal implementation unit | Coordinator owns todo | `implementer` | Generic worker with bounded prompt |
| Tests-first implementation | Coordinator owns todo | `tdd-implementer` | Generic worker plus TDD skill/prompt |
| Unclear bug | Coordinator routes | `debugging-investigator` first | Generic read-only investigator |
| Lite review | Coordinator routes | `lite-spec-reviewer` or `lite-code-reviewer` | Generic reviewer prompt |
| Final review | Coordinator routes | `spec-reviewer` and `code-reviewer` | Generic reviewer prompts |
| Harness without subagents | Main executes bounded todos | No | No or generic only if available |

## Concrete Improvements To Consider

These are worth doing, but they are not prerequisites for keeping the hybrid model:

1. **Add an agent/skill drift test.**
   - Check that each named agent has corresponding routing language in skills.
   - Check that each fallback prompt declares alignment with its canonical agent.
   - Check that writable/read-only expectations match skill routing.

2. **Reduce duplication between fallback prompts and agents.**
   - Either generate fallback prompt headers from `agents/*.md`, or add a test that key constraints appear in both.
   - Highest priority: `implementer`, `tdd-implementer`, `spec-reviewer`, and `code-reviewer`.

3. **Add a context-budget report script.**
   - Report bootstrap words, all skill words, top skill sizes, all agent words, and fallback prompt words.
   - Fail only on bootstrap size; warn on large skills.

4. **Split oversized skills with progressive disclosure.**
   - `writing-skills` is 657 lines and exceeds the 500-line best-practice threshold quoted in the bundled Anthropic guidance.
   - `test-driven-development` is 411 lines and still acceptable, but could push examples into references if it grows.

5. **Document dispatch thresholds.**
   - Add a short "when not to dispatch" section to `subagent-driven-development` and `dispatching-parallel-agents`.
   - This protects small tasks from subagent overhead.

6. **Clarify upstream compatibility language.**
   - Say explicitly that SuperDuperPowers keeps skills harness-neutral and treats named agents as OpenCode adapter support.
   - This reconciles upstream's skills-first direction with this repo's OpenCode-first agent registration.

## Decision

Do not remove named workflow agents right now.

The current hybrid architecture gives better orchestration and execution context than a fully loaded skill file in one general-purpose agent, with a relatively small static agent footprint. The named agents should remain thin role adapters, not workflow sources. Skills should remain canonical and portable. The main optimization work should focus on progressive disclosure, drift prevention, and avoiding unnecessary subagent dispatch for small tasks.

The highest-value implementation path is automated drift/context-budget checks, not collapsing the architecture back to skills-only.

## Implemented Follow-Up

The architecture decision above is now enforced in the repository:

- `skills/using-superpowers/SKILL.md` states that skills are canonical and named agents are adapter roles.
- `skills/subagent-driven-development/SKILL.md` and `skills/dispatching-parallel-agents/SKILL.md` document when not to dispatch.
- Fallback prompt templates now name their canonical agent alignment.
- `scripts/context-budget.mjs` reports bootstrap, skill, agent, and fallback-prompt footprint and fails only when bootstrap exceeds its budget.
- `tests/opencode/test-agent-skill-drift.sh` verifies agent routing, fallback alignment, key role constraints, writable/read-only expectations, and the context-budget check.
- `skills/writing-skills/SKILL.md` remains intact even though it exceeds the line warning threshold; this is an accepted exception.

## Sources

- Local repository measurements from `skills/`, `agents/`, `.opencode/plugins/superduperpowers/sdp-registration.js`, `.opencode/plugins/superduperpowers.js`, and `tests/opencode/`.
- Upstream Superpowers release notes: https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md
- Upstream Agent-type confusion issue: https://github.com/obra/superpowers/issues/1077
