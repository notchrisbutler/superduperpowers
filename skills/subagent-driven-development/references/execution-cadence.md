# Subagent Execution Cadence Details

## Flat Todo Example

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1.1: Login validation tests - dispatch tdd-implementer
- Task 1.2: Login form behavior - dispatch implementer
- Task 1 Review: validate Task 1, run required reviewers, commit if enabled
- Task 2.1: Password reset token model - dispatch implementer
- Task 2.2: Password reset email flow - dispatch implementer
- Task 2 Review: validate Task 2, run required reviewers, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Each implementation todo names the exact plan unit, expected worker role, and bounded ownership scope. Parent `Task N Review` todos collect validation, required reviewers, and coordinator-owned commit handling after child implementation reports return. Keep mechanical plan checkboxes in the plan unless they are true dispatch, dependency, review, validation, or blocker-resolution boundaries.

## Review Cadence

Complete all dispatchable `Task N.M` items for a parent task before the parent `Task N Review` gate unless the plan requires an earlier high-risk checkpoint. Use lite checkpoints for mechanical or low-risk work, escalate material lite-review findings to full review, and reserve final full spec/code review for the whole completed task set unless settings or risk require more.

After reviewer findings, group them, fix once, and request one focused re-review of only the changed scope. If material issues remain, escalate once to the stronger reviewer or ask the human instead of looping.

## Commit Cadence

When workflow commits are enabled, the coordinator reviews the aggregate diff and commits locally after each verified parent task scope. This creates small task-scope commits plus a final commit for any verified remaining implementation changes. Workers never commit directly. In worktree or temporary branch execution, commits stay on that branch until `finishing-a-development-branch` handles integration. Pushing always requires explicit user instruction.

## Example Workflow

```markdown
You: I'm using Subagent-Driven Development to execute this plan.

[Read plan file once: {DOCS_ROOT}/superduperpowers/plans/feature-plan.md]
[Extract groups and tasks with full text and context]
[Create flat coordinator-owned todos with setup, one visible todo per bounded worker dispatch or review gate, Review, and Finalize]

Task 1.1: Hook installation model
[Dispatch implementer with Task 1.1 text + context]
Implementer: DONE, tests passing, changed files reported.

Task 1.2: Hook installation command flow
[Dispatch implementer with Task 1.2 text + context]
Implementer: DONE, tests passing, changed files reported.

Task 1 Review: Optional task-scope review when plan/risk/settings require it
[Dispatch lite-code-reviewer or spec-reviewer against the Task 1 diff]
Result: Approved

Review: final full task-set spec review, code review, and validation
Finalize: invoke finishing-a-development-branch
```

## Finalization Handoff

After final full-scope spec/code reviews and validation pass, invoke `finishing-a-development-branch` with the execution context: current-branch, feature-branch, worktree, or temporary task-branch mode; parent/source branch; task branch; worktree path; and any uncommitted verified changes. That skill owns the final branch handling choices and cleanup guidance.
