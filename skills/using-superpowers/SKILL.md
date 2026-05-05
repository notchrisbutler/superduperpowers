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

## Full Workflow

After the user selects or clearly requests full workflow, load only the next necessary skill:

- `brainstorming` for design discovery.
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

## Review Loop Limits

Avoid vicious review loops. For each review scope, group findings, fix them once, and request one focused re-review of the changed scope. If material issues remain after that, either escalate to a higher-capability reviewer with the unresolved findings or ask the user for direction. Do not repeatedly re-run the same reviewer with the same prompt and unchanged context.

## Generated Docs And Commits

Generated SuperDuperPowers specs and plans are local-only by default. Do not commit or force-add generated docs unless the user explicitly asks or repo instructions require it. When workflow commits are enabled, commit verified implementation task scopes and final verified implementation changes locally. Never push unless explicitly requested.
