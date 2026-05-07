---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
metadata:
  category: action
---

# Executing Plans

## Overview

Load plan, review critically, execute flat coordinator-owned todos using the plan's dispatchable subtasks, commit locally only at verified implementation task-scope boundaries when workflow commits are enabled by the approved execution workflow, report when complete.

If the active harness does not support subagents or worker dispatch, use `executing-plans` in the main session and preserve the same coordinator-owned todo boundaries. Mark each bounded implementation unit yourself instead of handing an entire parent task to a generic worker.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Use `subagent-driven-development` when the user chose same-session subagents and the harness supports them. Use this skill for inline execution, separate-session execution, or harnesses without workable subagent dispatch.

Before execution, read the approved plan and explicit execution handoff. Use project-local config only for missing workflow defaults. Run branch preflight. Prefer feature branches when the handoff, plan, project config, or user instructions say to prefer them, and use the current branch only when the user explicitly approves it. Honor `testingIntensity` exactly as the plan describes.

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with the user before starting
4. If no concerns: determine from the plan, explicit handoff, and project-local config whether workflow commits are enabled by the approved execution workflow, create a flat, dependency-ordered harness todo list, and proceed

For fresh session resume requests, require an approved plan path before starting execution. Use an explicit plan path from the user or handoff. If none exists, stop and ask for the path or route the user back to planning. Do not reconstruct or continue a plan from memory, stale transcript context, or unverified assumptions.

### Step 2: Execute Tasks

Build the harness todo list flat and dependency ordered. Use one visible todo per bounded implementation unit, parent task review gate, final review, and finalize step:

`Task 0` covers setup/context, `Task N.M` covers one bounded implementation unit, `Task N Review` covers task-scope validation/review/commit-if-enabled, `Review` covers final full-scope review and validation, and `Finalize` finishes branch handling.

For each coordinator todo:
1. Mark as in_progress immediately before starting that todo
2. For `Task N.M`, execute only that bounded implementation unit, using the matching worker role locally when subagents are unavailable
3. For `Task N Review`, run task-scope validation, required reviewers, and the task-scope commit step only when workflow commits are enabled by the approved execution workflow
4. For `Review`, run final full-scope spec review, final full-scope code review, and final validation across all completed tasks
5. For `Finalize`, complete branch handling according to the current execution mode
6. Mark as completed immediately before moving to the next todo

Do not create nested todos. Do not use `Group N` in harness todos. Do not collapse a parent task into one broad implementation todo when it contains multiple dispatchable units. Do not expand every checkbox or mechanical command into separate visible todos unless one is a real worker dispatch, dependency boundary, review/validation gate, high-risk checkpoint, or blocker-resolution step.

For extended examples/details, read [execution cadence examples](references/execution-cadence.md) when this extra detail is needed.

At each parent task boundary, run validation and only the review required by the plan, project config, explicit handoff, or risk. Reserve full code review for high-risk task scopes, escalations from lite code review, and the final full task-set review.

When workflow commits are enabled by the approved execution workflow, commit locally after each parent `Task N Review` todo only after task-scope validation and required reviews pass. In worktree or temporary task-branch execution, keep commits on the temporary branch and let `finishing-a-development-branch` handle integration. Ordinary sessions must not commit unasked. Do not push unless the user explicitly requests it.

For extended examples/details, read [commit cadence details](references/execution-cadence.md) when this extra detail is needed.

For inline task execution, apply the same worker-role boundaries locally: use `test-driven-development` for TDD-required subtasks, use `systematic-debugging` before fixing unclear bugs, and use `dispatching-parallel-agents` only to plan safe delegation if the harness later gains subagents. Do not collapse review feedback handling into informal agreement; use `receiving-spec-review` and `receiving-code-review` when findings return.

## Context Discipline

Keep execution context compact:

- Re-read the approved plan and relevant files, not the entire brainstorming transcript.
- Carry forward decisions as short evidence-backed notes with paths, commands, and acceptance criteria.
- Keep stable workflow rules in skills; put only task-specific facts in prompts or handoffs.
- For large plans, checkpoint what changed at each parent task boundary so later work does not depend on memory.

### Step 3: Complete Development

After all tasks complete and verified:
- Run final full-scope spec review across all completed tasks.
- If final spec review finds issues, group them, fix them once, and run one focused re-review of the changed scope. If material issues remain, escalate or ask the user.
- Run final full-scope code review across all completed tasks.
- If final code review finds issues, group them, fix them once, and run one focused re-review of the changed scope. If material issues remain, escalate or ask the user.
- If workflow commits are enabled by the approved execution workflow and verified implementation changes remain uncommitted, commit them locally before finishing the branch.
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use `finishing-a-development-branch`
- Follow that skill to verify tests, present options, execute choice

For extended examples/details, read [finalization handoff details](references/execution-cadence.md) when this extra detail is needed.

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly
- Two implementation attempts fail in the same task scope without a new hypothesis
- The next fix would require a major design, dependency, architecture, data-model, security, or product decision

**Ask for clarification rather than guessing.**

If the unresolved issue is a major decision but other planned work is independent, create a minimal placeholder seam only when it is explicit, disabled or safely fallback-backed, and does not fake completed behavior. Finish the independent work that remains valid, then report the blocked decision and exact follow-up tasks.

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking
- Repeated failures show the plan/spec assumption is wrong

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Keep harness todos flat and dispatch-scoped; preserve tiny mechanical checkboxes in the plan, not the visible todo list
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
- Respect explicit user direction to execute on the current branch; do not force a worktree in that case
- Commit only at verified implementation task-scope boundaries when workflow commits are enabled by the approved workflow; keep pushes explicit

## Integration

**Required workflow skills:**
- **using-feature-branches** - Default setup for non-worktree inline execution unless explicit current-branch approval is present in the user instruction or execution handoff
- **using-git-worktrees** - Use before starting when work should be isolated; skip when the user explicitly directs execution on the current branch
- **writing-plans** - Creates the plan this skill executes
- **receiving-spec-review** - Evaluate returned spec-review findings before fixing or escalating
- **receiving-code-review** - Evaluate returned code-review findings before fixing or escalating
- **finishing-a-development-branch** - Complete development after all tasks
