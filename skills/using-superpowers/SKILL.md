---
name: using-superpowers
description: Use when routing an explicit or ambiguous SuperDuperPowers request between full flow, quick flow, and no SuperDuperPowers.
category: routing
---

<SUBAGENT-STOP>
If you were dispatched as a subagent for a specific task, skip this skill.
</SUBAGENT-STOP>

# Using SuperDuperPowers

SuperDuperPowers is opt-in by default. `superpowers`, `Superpowers`, `SuperPowers`, `superduperpowers`, `SuperDuperPowers`, `/superpowers`, `/superduperpowers`, `/sdp`, and `/brainstorm` invoke this routing family. Use `SuperDuperPowers` in user-facing prose; keep `superpowers:*` only as the compatibility namespace for concrete skills.

User instructions always win over this workflow. If the user asks for quick work, no process, no TDD, or no docs, honor that unless safety or correctness requires a brief escalation.

## Architecture Boundary

Skills are the canonical, harness-neutral workflow source. Named agents are thin adapter roles for harnesses that support subagents, especially the included OpenCode config. Use named agents for role isolation, permissions, parallelism, and independent review; use generic fallback prompts only when named agents are unavailable. Do not turn named agents into workflow owners: the main agent owns todos, route decisions, branch flow, commits, review gates, validation gates, and next-step decisions.

## Route

Use full workflow when the user explicitly invokes SuperDuperPowers, names a SuperDuperPowers skill/workflow, asks for brainstorming, planning, execution workflow, TDD, systematic debugging, root-cause investigation, or gives work that is clearly broad, ambiguous, high-risk, multi-system, or decomposition-heavy.

Use quick flow for bounded changes where lightweight process helps: small reviews, small code changes, wording edits, config tweaks, and similar tasks.

Use no SuperDuperPowers for trivial work, ordinary agent behavior, or explicit requests to avoid SuperDuperPowers.

If the route is unclear, ask one structured question before loading heavy workflow skills:

1. Full Brainstorming
2. Quick Implementation
3. No SuperDuperPowers

## Runtime State

When available, use `sdp_settings` once at the first meaningful route decision to read live defaults. Use it again only when settings may have changed or before major gates that depend on configuration. Use `sdp_profile` to initialize or update route, docs path, branch policy, generated-doc policy, workflow commit policy, testing intensity, and execution strategy when those decisions matter.

Do not call runtime tools just to restate already-known values. Carry the compact profile summary in prompts instead of making every subagent read state again.

## Context Discipline

Frontier models can handle very large contexts, but SuperDuperPowers should still preserve attention and cacheability:

- Put stable workflow rules and repeated project conventions in reusable skills, specs, plans, or profile summaries instead of pasting them into every worker prompt.
- Keep worker handoffs narrow: include the assigned task, relevant acceptance criteria, exact files, recent evidence, and validation commands; omit unrelated transcript history.
- Put static instructions before dynamic task data in prompts so provider-side prompt caching can reuse the shared prefix.
- Summarize exploration as facts with file paths and line references. Do not paste whole files when a path plus focused excerpt is enough.
- When context grows large, checkpoint the current state into the spec, plan, profile, or final handoff before continuing.
- Prefer a small number of high-signal reviewer passes over repeated broad reviews with unchanged context.

## Full Workflow

After the user selects or clearly requests full workflow, load only the next necessary skill:

- `brainstorming` for design discovery.
- `frontend-design` during brainstorming, planning, or implementation when the task includes web/app UI, visual design, interaction design, frontend component work, or user-facing layout.
- `systematic-debugging` for complex bugs or failures.
- `writing-plans` after an approved design or when a plan is requested.
- `executing-plans` or `subagent-driven-development` after an approved plan exists.
- Review and verification skills only when requested or required by the active workflow.

Prefer final full reviews plus targeted task-boundary reviews over review-after-every-small-change. Escalate to full review for security, auth, data loss, migrations, broad refactors, cross-cutting behavior, unresolved design judgment, or unexpected file changes.

## Quick Flow

For quick flow:

1. Gather only enough local context to avoid guessing.
2. Ask up to five focused questions if needed.
3. Propose the intended approach and wait for user approval or adjustment before editing files.
4. Make the smallest correct change.
5. Run targeted validation when practical.
6. Do a brief self-review for obvious regressions, missed call sites, and formatting.
7. Report changes and validation.

Quick flow does not require TDD, generated specs, implementation plans, subagents, branch-finalization workflows, or exhaustive review unless the task escalates.

Use subagents for independence, not ritual. Prefer inline work for small, tightly coupled, or low-risk tasks where a fresh worker would spend more context rediscovering the problem than executing it.

## Re-Evaluation Gates

Avoid vicious loops. When an approach fails, do not bounce between variants without changing the underlying plan.

- **One failed attempt:** capture the evidence, state the hypothesis that failed, and choose the next smallest different hypothesis.
- **Two failed attempts in the same scope:** stop implementation and re-evaluate the approach against the spec/plan. Update the plan/spec if the change is light and preserves user-approved intent, then continue.
- **Major design, dependency, architecture, data-model, security, or product-scope decision:** do not decide silently. Placeholder-code the seam when useful, finish all independent work that is still valid, and report what remains with the decision needed.
- **Same tool or file-discovery path fails twice:** switch tactics, narrow the query, or ask for targeted context instead of repeating the same operation.
- **Review loops:** for each review scope, group findings, fix them once, and request one focused re-review. If material issues remain, escalate reviewer capability or ask the user for direction.

Do not repeatedly re-run the same worker, reviewer, command, or prompt with unchanged context.

## Generated Docs And Commits

Generated SuperDuperPowers specs and plans are local-only by default. Do not commit or force-add generated docs unless the user explicitly asks or repo instructions require it. When workflow commits are enabled, commit verified implementation task scopes and final verified implementation changes locally. Never push unless explicitly requested.
