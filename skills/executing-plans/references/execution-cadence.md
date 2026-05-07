# Executing Plans Cadence Details

## Flat Todo Example

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1.1: <bounded implementation unit> - execute locally or dispatch if available
- Task 1.2: <bounded implementation unit> - execute locally or dispatch if available
- Task 1 Review: validate Task 1, run required reviewers, commit if enabled
- Task 2.1: <bounded implementation unit> - execute locally or dispatch if available
- Task 2 Review: validate Task 2, run required reviewers, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Use `Task N.M` for bounded implementation units and `Task N Review` for task-scope validation, required reviewers, and commit-if-enabled handling. Keep nested structure in the plan, not the visible harness todo list.

## Review Cadence

At each parent task boundary, run task-scope validation and the least expensive review that matches the plan, project config, explicit handoff, and risk. Reserve full code/spec review for high-risk task scopes, escalations from lite review, plan-required gates, and the final completed task set.

If review finds issues, group findings, fix them once, and run one focused re-review of the changed scope. If material issues remain, escalate or ask the user instead of repeating the same review loop.

## Commit Cadence

When workflow commits are enabled by the approved execution workflow, commit locally only after a parent task scope passes validation and required reviews. Ordinary sessions do not commit unasked. Worktree or temporary task-branch commits remain on that branch until `finishing-a-development-branch` handles integration. Never push without explicit user request.

## Finalization Handoff

After all tasks are complete, run final full-scope spec review, final full-scope code review, and final validation. If verified implementation changes remain uncommitted and workflow commits are enabled, commit them locally. Then load `finishing-a-development-branch`, report the execution mode and branch/worktree context, and follow that skill to verify tests, present options, and execute the user's choice.
