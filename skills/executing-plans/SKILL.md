---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
category: action
---

# Executing Plans

## Overview

Load plan, review critically, execute compact parent task scopes using the plan's detailed subtasks, commit locally at verified task-scope boundaries when workflow commits are enabled, report when complete.

If the active harness does not support subagents or worker dispatch, use `executing-plans` in the main session and preserve the same compact parent-scope todo shape.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Use `subagent-driven-development` when the user chose same-session subagents and the harness supports them. Use this skill for inline execution, separate-session execution, or harnesses without workable subagent dispatch.

Before execution, read live settings and the workflow profile. Run branch preflight. Prefer feature branches when live settings or the profile say to prefer them, and use the current branch only when the user or profile explicitly approves it. Honor `testingIntensity` exactly as the plan describes.

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with the user before starting
4. If no concerns: Re-read live settings, determine whether workflow commits are enabled, create a compact, dependency-ordered harness todo list, and proceed

### Step 2: Execute Tasks

Build the harness todo list flat and compact, even when the plan has detailed subtasks. Use one visible todo per parent task scope, then final review and finalize todos:

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1: <parent task goal> - execute Task 1.1-1.N, review, validate, commit if enabled
- Task 2: <parent task goal> - execute Task 2.1-2.N, review, validate, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

For each compact todo:
1. Mark as in_progress immediately before starting that todo
2. For `Task N`, execute all plan-defined `Task N.M` subtasks, lite checkpoints, task-scope reviews, validation commands, and task-scope commit steps for that parent scope
3. For `Review`, run final full-scope spec review, final full-scope code review, and final validation across all completed tasks
4. For `Finalize`, complete branch handling according to the current execution mode
5. Mark as completed immediately before moving to the next todo

Do not create nested todos. Do not use `Group N` in harness todos. Do not expand every plan `Task N.M`, lite checkpoint, review, or validation command into separate visible todos unless one is a real dependency boundary, high-risk checkpoint, or blocker-resolution step that must be tracked separately.

At each parent task boundary, run validation and only the review required by the plan, live settings, or risk. Reserve full code review for high-risk task scopes, escalations from lite code review, and the final full task-set review.

When workflow commits are enabled, commit locally after each parent task todo only after task-scope validation and required reviews pass. On current feature branches this is the normal early-and-often cadence. In worktree or temporary task-branch execution, keep commits on the temporary branch and let finishing-a-development-branch handle integration back to the parent/source branch. Do not push unless the user explicitly requests it.

For inline task execution, apply the same worker-role boundaries locally: use `test-driven-development` for TDD-required subtasks, use `systematic-debugging` before fixing unclear bugs, and use `dispatching-parallel-agents` only to plan safe delegation if the harness later gains subagents. Do not collapse review feedback handling into informal agreement; use `receiving-spec-review` and `receiving-code-review` when findings return.

### Step 3: Complete Development

After all tasks complete and verified:
- Run final full-scope spec review across all completed tasks.
- If final spec review finds issues, group them, fix them once, and run one focused re-review of the changed scope. If material issues remain, escalate or ask the user.
- Run final full-scope code review across all completed tasks.
- If final code review finds issues, group them, fix them once, and run one focused re-review of the changed scope. If material issues remain, escalate or ask the user.
- If workflow commits are enabled and verified changes remain uncommitted, commit them locally before finishing the branch.
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Keep harness todos compact and flat; preserve detailed `Task N.M` execution steps in the plan, not the visible todo list
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
- Respect explicit user direction to execute on the current branch; do not force a worktree in that case
- Commit early and often at verified task-scope boundaries when workflow commits are enabled; keep pushes explicit

## Integration

**Required workflow skills:**
- **superpowers:using-feature-branches** - Default setup for non-worktree inline execution unless the profile records explicit current-branch approval
- **superpowers:using-git-worktrees** - Use before starting when work should be isolated; skip when the user explicitly directs execution on the current branch
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:receiving-spec-review** - Evaluate returned spec-review findings before fixing or escalating
- **superpowers:receiving-code-review** - Evaluate returned code-review findings before fixing or escalating
- **superpowers:finishing-a-development-branch** - Complete development after all tasks
