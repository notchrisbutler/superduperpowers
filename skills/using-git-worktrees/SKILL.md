---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans.
metadata:
  category: action
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Use a user-level SuperDuperPowers worktree root by default, create worktrees from a safe parent/source feature branch, and finalize back to that parent/source branch.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Default to the active harness's user-level SuperDuperPowers worktree root. For the included OpenCode adapter, this is `{OPENCODE_CONFIG_DIR}/superduperpowers/worktrees/{projectKey}/`.

Do not use a project-local OpenCode worktree directory by default. Because the default is outside the project, do not add project `.gitignore` or `.ignore` entries for default worktrees.

If the user or repo instructions specify a directory, use that directory after checking whether it is project-local or external. Ask only when repo instructions conflict or the directed location is unsafe/unclear.

## Branch Preflight

Before creating worktrees, run branch preflight. Use the active harness's branch-context tool when available.

- If currently on `main`, `master`, or the detected default branch, ask for or create a parent/source feature branch before spawning worktrees.
- If the branch is dirty, behind, detached, missing, or has likely unrelated changes, ask before continuing.
- Record the complete execution handoff in the workflow profile when available: `executionMethod`, `executionStrategy: worktree`, `parentSourceBranch`, `selectedDurableBranch`, `taskBranch`, `worktreePath`, and original workspace.

## Custom Project-Local Safety

If the user explicitly chooses a project-local worktree root, add that custom root to `.gitignore` and add a matching `!` entry to `.ignore` before creating it. This custom-path rule does not apply to the default user-level OpenCode worktree root.

After updating ignore files for a custom project-local root, verify the custom root is ignored:

```bash
git check-ignore -q <custom-worktree-root>
```

Do not commit ignore-file changes unless the user explicitly asks for a commit.

## Creation Steps

1. Identify the repository root, original workspace, selected durable branch, and parent/source branch.
2. Resolve the worktree path under the selected worktree root and choose the task branch name.
3. Create a new task branch worktree from the parent/source feature branch.
4. Store `executionStrategy: worktree`, selected durable branch, parent/source branch, task branch, worktree path, and original workspace in the workflow profile when possible.
5. Switch execution to the worktree workspace when the harness supports it.
6. Run project setup and baseline validation appropriate for the repository.

Example:

```bash
repo_root=$(git rev-parse --show-toplevel)
parent_branch=$(git branch --show-current)
git worktree add "$WORKTREE_PATH" -b "$TASK_BRANCH" "$parent_branch"
```

For user-level worktrees, ensure execution happens with the worktree as the active workspace when the harness supports it. If the harness treats the user-level worktree as external to the original workspace, ask for external-path permission before reading or editing files there.

## Finalization

When work in one or more worktrees is complete, stop and ask the user how to proceed before merging, deleting worktrees, pushing, or creating any non-workflow commit. Verified task-scope commits created during the selected SuperDuperPowers workflow can already exist on the worktree branch.

Default recommendation:

- Merge completed worktree branches into the parent/source feature branch they were spawned from.
- Commit verified merge results locally when workflow commits are enabled; otherwise confirm before committing the parent/source feature branch if the merge creates new uncommitted changes.
- Do not push unless the user explicitly directs you to push.
- Do not merge to `main`, `master`, or the default branch unless that branch was the explicit parent/source branch or the user chooses it.

## Red Flags

Never:

- Create worktrees directly from `main`, `master`, or the detected default branch unless explicitly approved.
- Use a project-local default worktree root for the included OpenCode adapter.
- Add project ignore-file entries for default user-level worktrees.
- Skip branch preflight.
- Proceed with failing baseline tests without asking.
- Merge, clean up, push, or create non-workflow commits without user approval.
- Merge worktree branches to the default branch by default instead of their parent/source branch.

## Integration

- Called by `brainstorming`, `writing-plans`, `subagent-driven-development`, and `executing-plans` when isolated implementation follows.
- Pairs with `finishing-a-development-branch` after implementation is verified.
