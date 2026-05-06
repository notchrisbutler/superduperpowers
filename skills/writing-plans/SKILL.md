---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
metadata:
  category: guidance
---

# Writing Plans

## Overview

Write implementation plans for a skilled developer who has almost no project context. Include exact files, code, tests, docs to inspect, validation commands, dependency ordering, review gates, and execution handoff choices. DRY. YAGNI. Scale validation to the workflow profile's testing intensity. Include local commit steps only at verified implementation task-scope boundaries when workflow commits are enabled by an approved execution workflow.

Announce at start: “I'm using the writing-plans skill to create the implementation plan.”

Read live settings and the active workflow profile when available. Inherit docs paths, generated-doc policy, branch policy, workflow commit policy, question policy, and testing intensity unless the profile or user overrides them. If testing intensity is missing before execution handoff, ask and persist: full regression, major behavior only, or existing tests only.

Save plans to `{DOCS_ROOT}/{SDP_DOCS_DIR}/plans/YYYY-MM-DD-<feature-name>.md` unless user preferences override. Generated plans follow live `generatedDocsPolicy`; do not commit or force-add them unless settings, repo instructions, or the user explicitly require it.

## Agent Dispatch

For substantial plans, dispatch `plan-writer` with the approved spec, compact workflow profile, repo conventions, docs path, generated-doc policy, testing intensity, and execution constraints. It may write the plan document but must not implement code.

After the plan is written, use `plan-reviewer` for broad, high-risk, many-file, multi-worker, or uncertain execution shapes. For small plans, inline self-review is enough unless required by the user or profile. If review requires changes, update once, request one focused re-review, then ask the user if material issues remain.

## Scope Check

If the spec covers multiple independent subsystems, suggest separate plans, one per subsystem. Each plan should produce working, testable software on its own.

If the spec includes UI/frontend work, load `frontend-design` as a support skill and make frontend validation explicit; do not treat visual polish as a vague final pass.

## File Map Requirement

Before tasks, map every file to create/modify/test and each file's responsibility. This locks decomposition decisions.

- Design units with clear responsibilities, interfaces, and dependency boundaries.
- Prefer focused files over large files that do too much, while following existing codebase patterns.
- Split by responsibility and change coupling, not by technical layer alone.
- For frontend work, map existing tokens, component primitives, icons, routes, layout containers, state patterns, responsive behavior, accessibility, loading, empty, error, and interaction states.

## Plan Document Header

Every plan must start with this shape:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan. The main agent is the coordinator: it owns todos, dispatches each bounded `Task N.M` implementation unit to the appropriate worker, runs reviews/validation, and decides the next step from worker reports. Steps use checkbox (`- [ ]`) syntax for plan tracking; harness todos should stay flat and dispatch-scoped, with parent `Task N Review` gates plus final `Review` and `Finalize`.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Dependency-Ordered Tasks

Plan parent task scopes around useful validation boundaries. Make executable subtasks small enough for bounded worker dispatch and label them `Task N.M` in dependency order.

Each parent task must include:
- `**Review policy:** ...` stating lite/full spec and code review expectations.
- Dispatchable `#### Task N.M: ...` subtasks.
- Exact file paths for create/modify/test.
- Concrete steps with code blocks for code changes.
- Exact validation commands with expected outcomes.
- A worker stop/report instruction: report changed files and validation; do not continue into later tasks.
- `#### Task N Review` with task-scope validation, required reviewers, and commit-if-enabled gate.

For extended examples/details, read [full task template](references/full-task-template.md) when this extra detail is needed.

## Harness Todo Shape

Plan docs contain detailed `Task N.M` subtasks. Harness todos stay flat and readable at worker dispatch, parent review, final review, and finalization boundaries:

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1.1: <bounded implementation unit> - dispatch <worker role>
- Task 1.2: <bounded implementation unit> - dispatch <worker role>
- Task 1 Review: validate Task 1, run required reviewers, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Each visible implementation todo maps to one worker assignment unless adjacent mechanical steps touch the same files and share one obvious validation command. Do not expand every checkbox into a harness todo.

## Re-Evaluation And Placeholder Seams

Never write `TBD`, `TODO`, “implement later,” “add appropriate error handling,” “write tests for the above,” “similar to Task N,” undefined types/functions, or steps that describe code changes without showing the code.

Concrete discovery substeps are allowed only when the architecture decision is already made and codebase geography needs one bounded lookup with an exact command/file target, expected output, and how the result feeds the next step.

Workers must stop after two failed implementation attempts in the same task scope and report failed approaches and evidence instead of trying a third variant. The coordinator may make light plan/spec updates that preserve the approved design. Major design, dependency, architecture, data-model, security, or product decisions require user escalation. Safe placeholder seams must be explicit, minimal, testable, and must not fake completed behavior.

For extended examples/details, read [placeholder and self-review rules](references/placeholder-and-self-review-rules.md) when this extra detail is needed.

## Validation Expectations

Every task includes exact commands, expected output, and testing intensity alignment. `major-behavior` is the default: plan tests for important behavior and integration points, but avoid exhaustive or obvious tests. Do not invent new test frameworks or dependencies without explicit approval.

## Self-Review And Plan Review Gate

After writing the complete plan, self-review before using any reviewer:
- Spec coverage: every requirement maps to a task.
- Placeholder scan: red flags above are absent.
- Type consistency: names and signatures match across tasks.
- Execution shape: flat, dependency-ordered harness todos are possible.
- Loop prevention: repeated-failure and escalation behavior is explicit.
- Context budget: workers can execute from compact handoffs.
- Frontend quality when applicable: reuse patterns, states, responsive/accessibility checks, screenshots/manual validation.

Fix issues inline. Then ask the user to review the saved plan:

> "Plan written to `<path>`. Please review it and let me know if you want changes before execution."

Wait for approval. If changes are requested, update the plan and re-run self-review. After approval, re-read live settings, record the approved plan path, and respect generated-doc policy.

For extended examples/details, read [placeholder and self-review rules](references/placeholder-and-self-review-rules.md) when this extra detail is needed.

## Execution Handoff

After user approval, ask execution method through the active harness's structured question tool:

1. Subagent Driven Development, coordinated from this conversation.
2. Single-Agent Execution, all in the main agent with no subagents.
3. Hold off on implementing for now.

If the user chooses Hold off, record `executionMethod: hold` and stop.

If Single-Agent Execution, record `executionMethod: inline`, run branch preflight, use `using-feature-branches` unless current-branch execution was explicitly approved, then invoke `executing-plans`.

If Subagent Driven Development, record `executionMethod: subagent-driven`, then ask execution strategy:

1. User-level worktree route using `using-git-worktrees`.
2. Feature branch route using `using-feature-branches`.
3. Hold off on implementing for now.

Only invoke execution skills after the profile contains required execution choices and branch/setup preflight passes. Never push unless the user explicitly requests it.
