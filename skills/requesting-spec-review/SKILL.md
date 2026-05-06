---
name: requesting-spec-review
description: Use when completed work needs a lightweight or full review against a spec, plan, task scope, or acceptance criteria.
metadata:
  category: review
---

# Requesting Spec Review

Dispatch the right spec-review subagent to verify the work matches what was requested, without expanding scope.

**Core principle:** Spec review checks compliance; code review checks implementation quality. Use both when the workflow calls for both. The main agent remains the coordinator and owns todos, branch decisions, commits, reviews, validation gates, and next-step routing. Do not spawn, dispatch, or coordinate any other subagents from inside a reviewer; report split, follow-up worker, or reviewer recommendations to the main coordinator, and the main coordinator decides.

## Reviewer Router

Choose the cheapest reviewer that matches the risk:

| Situation | Agent |
|---|---|
| Small, mechanical, or low-risk checkpoint | `lite-spec-reviewer` |
| Requirements ambiguous or files touched are unexpected | `spec-reviewer` |
| Normal parent task scope with clear requirements and expected files | `lite-spec-reviewer` when useful |
| Normal parent task scope requiring explicit compliance review by the plan/profile | `spec-reviewer` |
| High-risk task | `spec-reviewer` |
| Final implementation or pre-merge review | `spec-reviewer` |

High-risk includes security, auth, data loss, migrations, cross-cutting behavior, broad refactors, unresolved design judgment, skipped validation, or unexpected file changes.

If unsure, use `spec-reviewer`.

## How to Request

1. Identify the requirement source: design, spec, plan section, task scope, issue, or acceptance criteria.
2. Identify the reviewed change range: base SHA, head SHA, file list, or working-tree diff.
3. Use the active harness's subagent or worker-dispatch mechanism with the selected reviewer. If named reviewer agents are unavailable, use the fallback prompt content and run the review as an inline or generic-worker review.
4. If lite review says `Escalate`, request a full `spec-reviewer` review before proceeding.

Use this skill from `subagent-driven-development` and `executing-plans` at task boundaries only when the plan, live settings, or risk calls for spec review. Final implementation review always uses `spec-reviewer`.

## Prompt Inputs

- `REQUIREMENTS` - exact spec, plan, task, or acceptance criteria text
- `CHANGE_RANGE` - base/head SHA or working-tree scope
- `EXPECTED_FILES` - files expected to change, if known
- `VALIDATION` - commands run or explicit reason validation was skipped
- `CONCERNS` - implementer-reported concerns, skipped work, or unexpected behavior
- `PROFILE_SUMMARY` - compact workflow profile summary including generated-doc policy, path policy, branch policy, execution strategy, and testing intensity when relevant.

## Red Flags

- Do not let code review replace spec review.
- Do not ask a lite reviewer to approve ambiguous, broad, high-risk, or final work.
- Do not proceed when spec review finds missing requirements or unrequested scope.
- Do not summarize requirements from memory when exact text is available.

## Integration

- Use alongside `requesting-code-review` when both compliance and quality need review.
- Use `receiving-spec-review` to evaluate and act on returned spec findings.
