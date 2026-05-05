---
name: requesting-code-review
description: Use when code changes need a lightweight or full code-quality review checkpoint.
category: review
---

# Requesting Code Review

Dispatch the right code-review subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation, never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review at meaningful boundaries. Use lite code review for normal task-scope checkpoints, and reserve full code review for high-risk tasks, escalations, final validation, and pre-merge review.

## When to Request Review

**Mandatory:**
- After each parent task scope in subagent-driven development
- After any high-risk task
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## Reviewer Router

Choose the cheapest reviewer that matches the risk:

| Situation | Agent |
|---|---|
| Small, mechanical, or low-risk checkpoint | `lite-code-reviewer` |
| Normal parent task-scope checkpoint | `lite-code-reviewer` |
| Task grew larger or riskier than expected | `code-reviewer` |
| High-risk task | `code-reviewer` |
| Final implementation or pre-merge review | `code-reviewer` |

High-risk includes security, auth, data loss, migrations, cross-cutting behavior, broad refactors, unclear requirements, unexpected file changes, or failures during validation.

If unsure, use `code-reviewer`.

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch the routed reviewer subagent:**

Use the active harness's subagent or worker-dispatch mechanism with the selected reviewer. If named reviewer agents are unavailable, use the fallback prompt content and run the review as an inline or generic-worker review. For full reviews, fill template at `code-reviewer.md`.

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary
- `{PROFILE_SUMMARY}` - compact workflow profile summary including generated-doc policy, path policy, branch policy, execution strategy, and testing intensity when relevant.

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Suggestions for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch lite-code-reviewer subagent because this is a normal parent task-scope boundary]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: Task 2 from {DOCS_ROOT}/superduperpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Lite code checkpoint: Escalate
  - Reason: Unexpected unrelated file change detected; task grew beyond a simple local checkpoint.

You: [Escalate to code-reviewer or remove the unrelated file change before proceeding]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Lite checkpoint after simple tasks
- Lite code review at normal parent task scope when plan, settings, or risk call for it
- Full code review for high-risk task scopes, escalations, and final task-set review
- Catch issues before they compound
- Fix before moving to next parent task scope

**Executing Plans:**
- Review after parent task scopes only when plan, settings, or risk call for it
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip the review required by the task-scope policy
- Send small mechanical checkpoints to full review by default when lite review is sufficient
- Send high-risk, final, or pre-merge work to lite review
- Send normal parent task-scope code review to full review by default when lite review is sufficient
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md
