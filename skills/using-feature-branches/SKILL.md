---
name: using-feature-branches
description: Use when executing approved plans safely on a feature branch without git worktrees.
metadata:
  category: action
---

# Using Feature Branches

## Overview

Use a durable feature branch for SuperDuperPowers execution when work should happen without git worktrees.

**Core principle:** Do not implement, commit, or push directly on `main`, `master`, or the detected default branch without explicit user consent.

## Startup Checks

1. Read the active workflow profile when available.
2. Use the active harness's branch-context tool when available; otherwise inspect git state with normal git commands.
3. Check current branch, default branch, remote tracking branch, ahead/behind state, dirty state, and likely unrelated changes.
4. If no git repository exists, report that branch safety cannot be enforced and ask before execution.

## Branch Decisions

- If on `main`, `master`, or the detected default branch, do not implement there unless the user explicitly approves current-branch/default-branch execution. The safe default is to ask, create, and switch to a feature branch before execution.
- If already on a clean feature branch aligned with the profile, continue.
- If the branch is stale, behind, dirty with unrelated changes, or unclear, ask a structured branch question.
- Store the complete execution handoff in the workflow profile when possible: `executionStrategy: feature-branch`, selected durable branch, current/default-branch approval if explicitly granted, branch preflight result, and original workspace.

## Suggested Branch Names

Use concise branch names that match the plan:

- `feat/workflow-profile`
- `fix/router-profile`
- `docs/superduperpowers-profile`

## Red Flags

Never:

- Work directly on `main`, `master`, or the default branch without explicit approval.
- Pull, merge, push, reset, or delete branches without clear user instruction or workflow approval.
- Mix unrelated user changes into workflow commits.
- Continue when branch state is unclear.

## Integration

- Called by `writing-plans`, `executing-plans`, and `subagent-driven-development` for non-worktree execution.
- Pairs with `finishing-a-development-branch` after implementation is verified.
