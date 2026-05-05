---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute implementation plans with subagents while keeping harness todos compact, using proportional review at meaningful task boundaries, and committing locally at verified task-scope boundaries when workflow commits are enabled.

If the active harness does not support subagents or worker dispatch, use `executing-plans` in the main session and preserve the same compact parent-scope todo shape.

**Why subagents:** You delegate work to specialized agents with isolated context. By precisely crafting their instructions and context, you keep them focused while preserving your own context for coordination.

**Core principle:** Compact parent-scope todos + proportional review = readable orchestration without cold-start review loops on tiny tasks.

## When to Use

```dot
digraph when_to_use {
    "Have implementation plan?" [shape=diamond];
    "Tasks mostly independent?" [shape=diamond];
    "Stay in this session?" [shape=diamond];
    "subagent-driven-development" [shape=box];
    "executing-plans" [shape=box];
    "Manual execution or brainstorm first" [shape=box];

    "Have implementation plan?" -> "Tasks mostly independent?" [label="yes"];
    "Have implementation plan?" -> "Manual execution or brainstorm first" [label="no"];
    "Tasks mostly independent?" -> "Stay in this session?" [label="yes"];
    "Tasks mostly independent?" -> "Manual execution or brainstorm first" [label="no - tightly coupled"];
    "Stay in this session?" -> "subagent-driven-development" [label="yes"];
    "Stay in this session?" -> "executing-plans" [label="no - parallel session"];
}
```

**vs. Executing Plans:**
- Same session coordination
- Fresh subagents where they add value
- Lite checkpoints after simple tasks, full task-scope spec review plus lite task-scope code review at task boundaries
- Faster iteration without human-in-loop between every small task

## The Process

1. Read the plan once.
2. Read the active workflow profile before dispatching implementation work.
3. If `executionStrategy` is missing, ask the execution-strategy question before dispatching subagents.
4. After strategy is known, run branch preflight and invoke the selected setup skill before any implementation subagent dispatch: `using-git-worktrees` for `worktree`, `using-feature-branches` for `feature-branch`, or stop if the strategy is `hold`.
5. Record the resulting branch/worktree context in the workflow profile, including execution method, execution strategy, parent/source branch, selected durable branch, task branch, worktree path, and original workspace when relevant.
6. Pass a compact profile summary into implementer and reviewer prompts.
7. Extract task groups, tasks, dependencies, validation commands, and review policies.
8. Replace any prior planning/brainstorming todos with one compact harness todo list.
9. Execute each compact todo in dependency order.
10. For each parent `Task N`, execute the plan-defined `Task N.M` subtasks and lite checkpoints.
11. Run task-scope review at parent task boundaries only when the plan, live settings, or risk calls for it; otherwise rely on validation plus the final full reviews.
12. Commit the verified parent task scope locally when workflow commits are enabled.
13. Run final full implementation review and validation across all tasks.
14. Commit verified remaining changes locally when workflow commits are enabled.
15. Invoke `superpowers:finishing-a-development-branch`, preserving whether execution happened on the current branch or in a temporary worktree/task branch.

Subagents honor the profile's testing intensity. For `major-behavior`, they test important behavior and integration points without creating exhaustive or obvious tests.

## Todo Status Discipline

Keep the compact harness todo list current throughout orchestration:

1. Mark exactly one compact todo `in_progress` immediately before starting or dispatching that work.
2. Mark it `completed` immediately after its implementation, review, or validation is done.
3. Do not start the next todo, dispatch the next subagent, or report completion while the previous todo is still stale.

## Compact Todo Shape

Most harnesses do not support nested todos, and long visible todo lists become cluttered. Preserve detailed `Task N.M` subtasks in the plan, and use one visible harness todo per parent task scope:

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1: Login Flow - execute Task 1.1-1.N, review, validate, commit if enabled
- Task 2: Password Reset - execute Task 2.1-2.N, review, validate, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Each visible `Task N` todo includes all plan-defined subtasks, lite checkpoints, task-scope reviews, validation commands, and task-scope commit steps for that parent scope. Do not create nested todo structures. Do not use `Group N` in harness todos. Do not expand every plan checkbox, `Task N.M`, lite checkpoint, or review command into a harness todo unless it is a real dependency boundary, high-risk checkpoint, or blocker-resolution step.

## Review Policy

Use the cheapest review that matches the risk:

| Work type | Review |
|---|---|
| Mechanical or simple task | One lite review checkpoint, using `lite-spec-reviewer` and/or `lite-code-reviewer` only when useful |
| Normal task scope | Validation + lite code review when useful; full spec review only when plan-required or settings require per-chunk review |
| High-risk task | Full spec review + full code review before moving on |
| Final implementation | Full task-set spec review + full task-set code review + validation |

High-risk means security, auth, data loss, migrations, broad refactors, cross-cutting behavior, unresolved design judgment, or unexpected file changes.

If a lite review finds a material concern, escalate that task scope to full spec and/or full code review before moving on.

Review loop budget: after a reviewer reports issues, group the findings, fix them once, and request one focused re-review of the changed scope. If material issues remain, escalate once to the stronger reviewer or ask the human; do not repeat the same reviewer prompt with unchanged context.

## Commit Cadence

When workflow commits are enabled, the coordinator commits locally after each parent task scope passes its required reviews and validation. This is the normal feature-branch cadence: small, reviewable commits for each verified task scope, then a final commit for any verified remaining changes.

Implementer subagents do not commit directly. They report changed files and verification results; the coordinator reviews the aggregate diff, writes the commit message, and commits only after the task boundary is clean. In worktree or temporary task-branch execution, keep commits on that branch and let finishing-a-development-branch handle integration back to the parent/source branch. Do not push unless the user explicitly requests it.

## Reviewer Routing

- Lite review checkpoint: dispatch `lite-spec-reviewer`, `lite-code-reviewer`, both, or neither based on the task's risk and the implementer's report. Do not split lite checks into visible harness todos unless they are real dependency boundaries.
- Lite code review: dispatch `lite-code-reviewer` across the completed parent task scope.
- Full spec review: dispatch `spec-reviewer`.
- Full code review: dispatch `code-reviewer`.

For platforms without named agents, use the matching prompt templates in this skill directory.

## Model Selection

Use the least powerful model that can handle each role to conserve cost and increase speed.

**Mechanical implementation tasks** (isolated functions, clear specs, 1-2 files): use a fast, cheap model.

**Integration and judgment tasks** (multi-file coordination, pattern matching, debugging): use a standard model.

**Architecture, design, and full review tasks**: use the most capable available model.

## Handling Implementer Status

Implementer subagents report one of four statuses. Handle each appropriately:

**DONE:** Proceed to the task's review policy: lite checkpoint for simple work, full review for high-risk work, or task-scope review when the parent task boundary is reached.

**DONE_WITH_CONCERNS:** Read the concerns before proceeding. If they affect correctness, scope, or validation, escalate to full review before moving on.

**NEEDS_CONTEXT:** Provide the missing context and re-dispatch.

**BLOCKED:** Assess the blocker:
1. If it's a context problem, provide more context and re-dispatch with the same model
2. If the task requires more reasoning, re-dispatch with a more capable model
3. If the task is too large, break it into smaller pieces
4. If the plan itself is wrong, escalate to the human

**Never** ignore an escalation or force the same model to retry without changes.

## Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent
- `./spec-reviewer-prompt.md` - Full spec compliance review fallback
- `./code-quality-reviewer-prompt.md` - Full code quality review fallback
- `./lite-spec-reviewer-prompt.md` - Lite spec checkpoint fallback
- `./lite-code-reviewer-prompt.md` - Lite code checkpoint fallback

## Example Workflow

```markdown
You: I'm using Subagent-Driven Development to execute this plan.

[Read plan file once: {DOCS_ROOT}/superduperpowers/plans/feature-plan.md]
[Extract groups and tasks with full text and context]
[Create compact harness todos with setup, one visible todo per parent Task N scope, Review, and Finalize]

Task 1: Hook installation workflow
[Dispatch implementation subagent with full task text + context]
Implementer: DONE, tests passing, changed files reported.

Within Task 1: Lite review checkpoint from the plan
[Dispatch lite-spec-reviewer and/or lite-code-reviewer if useful]
Lite checkpoint: Pass

Within Task 1: Optional task-scope review when plan/risk/settings require it
[Dispatch lite-code-reviewer or spec-reviewer against the Task 1 diff]
Result: Approved

Review: final full task-set spec review, code review, and validation
Finalize: invoke finishing-a-development-branch
```

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Treat current-branch execution as a worktree cleanup/merge flow
- Create nested or overly expanded harness todo structures; use compact parent task scopes instead
- Skip the review required by the task review policy
- Proceed with unfixed full-review issues
- Dispatch multiple implementation subagents in parallel if they can conflict
- Make subagents read the plan file; provide full text instead
- Skip scene-setting context
- Ignore subagent questions
- Let implementer self-review replace required task-scope or final review
- Move past a task scope while required review has open issues
- Let implementer subagents create their own commits instead of coordinator-owned task-scope commits

**If reviewer finds issues:**
- Implementer or fix subagent fixes them
- Reviewer gets one focused re-review of the changed scope
- If material issues remain, escalate once to the stronger reviewer or the human

## Integration

**Required workflow skills:**
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:using-feature-branches** - Required setup for feature-branch execution before dispatch
- **superpowers:using-git-worktrees** - Required setup for worktree execution before dispatch
- **superpowers:requesting-spec-review** - Spec compliance review routing for lite and full spec reviews
- **superpowers:requesting-code-review** - Code review guidance for full code reviews
- **superpowers:finishing-a-development-branch** - Complete development after all tasks

**Subagents should use:**
- **superpowers:test-driven-development** - Subagents follow TDD for implementation tasks when the plan requires it

**Alternative workflow:**
- **superpowers:executing-plans** - Use for inline execution instead of subagent-driven execution
