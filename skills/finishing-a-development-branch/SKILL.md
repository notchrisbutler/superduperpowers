---
name: finishing-a-development-branch
description: Use when implementation is complete, tests have been verified, and local branch or worktree completion needs an explicit next-step decision.
metadata:
  category: completion
---

# Finishing a Development Branch

## Overview

Guide completion of development work by choosing the correct local context before presenting next-step options.

**Core principle:** Verify tests -> commit verified local work when workflow commits are enabled -> identify durable branch vs temporary worktree branch -> present local-first options -> execute choice.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

Before claiming implementation is complete, invoke `verification-before-completion` as the final evidence gate. This skill handles branch/worktree completion decisions; `verification-before-completion` handles proof that completion claims are supported.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Commit Verified Local Work

If workflow commits are enabled and verified changes remain uncommitted, create a local commit before presenting completion options. This preserves the early-and-often workflow on feature branches and gives worktree merges a concrete commit boundary.

Do not commit unrelated user changes, ignored secret files, or generated files that should stay local. If unrelated changes are mixed with completed work and cannot be safely separated, stop and ask the user how to proceed. Do not push unless the user explicitly requests it.

### Step 3: Determine Completion Context

Determine whether the completed work is already on the user's durable branch, or whether it lives on a temporary worktree/task branch that must be integrated somewhere else.

When a workflow profile is available, use it to identify execution method, execution strategy, parent/source branch, selected durable branch, and user-level worktree paths. Do not infer these from memory when profile data exists.

Priority order for the integration target:
- Explicit user instruction from this session
- Recorded parent/source branch used to spawn the worktree
- Current durable feature branch, if no worktree/task branch is involved
- Ask the user; do not guess main/master

Do not infer main/master as the merge target just because it is the repository default branch. Only use main/master when the user explicitly instructed work to land there.

### Step 4: Present Options

If already on the user-directed branch and the work is locally committed, do not present the 4-option prompt, offer a local merge, or ask worktree cleanup questions. Report the branch, commit(s), and verification performed, then leave it ready for the user to push or request a PR.

If worktrees or per-subagent temporary branches were used, first explain that the recommended next step is to merge completed work back into the parent/source feature branch, then clean up temporary worktrees and local task branches. Do not merge temporary worktree branches directly to main/master unless the user explicitly chose main/master as the parent/source branch.

When a worktree, temporary task branch, uncommitted work, or discard decision requires user choice, present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge temporary branch into parent/source branch locally
2. Prepare Pull Request summary and commands (you push when ready)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 5: Execute Choice

#### Option 1: Merge Temporary Branch Into Parent/Source Branch

Use only when finishing from a worktree or temporary task branch. Merge back into the parent/source branch the temporary branch was spawned from, unless the user explicitly selected a different local target.

If finishing from a durable feature branch, do not merge anywhere. If workflow commits are enabled and verified changes remain, commit locally before reporting readiness. Leave push/PR creation to the user unless they explicitly request it.

```bash
# Switch to target local branch
git checkout <target-local-branch>

# Merge completed work
git merge <completed-work-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <completed-work-branch>
```

Then: Cleanup worktree or temporary branch only if one exists (Step 6)

#### Option 2: Prepare PR Summary and Commands

Do not push automatically. Prepare the summary and exact commands for the user to run, unless the user explicitly asks you to push. Check whether the completed work is tracked by GitHub issues or another issue tracker. When a GitHub issue is fully resolved by the branch, include a closing keyword such as `Closes #123`, `Fixes #123`, or `Resolves #123` in the PR body. If the branch only partially addresses an issue, mention it without a closing keyword.

```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Closes
<!-- Omit this section if no GitHub issue is fully resolved. -->
Closes #<issue-number>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Ask whether to clean up local worktrees and temporary task branches now or keep them until after the user pushes/opens the PR. If no worktree or temporary task branch exists, do not ask cleanup questions.

#### Option 3: Keep As-Is

Report: "Keeping branch <name> as-is." If a worktree exists, include: "Worktree preserved at <path>."

**Don't cleanup worktree or temporary branches.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Temporary branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <temporary-branch>
```

Then: Cleanup worktree or temporary branch only if one exists (Step 6)

### Step 6: Cleanup Worktrees And Temporary Branches

**For Options 1 and 4:** clean up worktrees and completed temporary branches after verification or typed discard confirmation. Never delete the durable feature branch that the user will push or use for PR creation.

**For Option 2:** ask before cleanup. The user may want to keep worktrees or temporary branches until after they push/open the PR.

**For Option 3:** keep worktrees and branches.

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge temp branch | temp -> parent/source | - | - | temp only |
| 2. Prepare PR | - | user-run | ask | ask |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | temp/feature only after typed confirmation |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Leaving verified workflow changes uncommitted**
- **Problem:** Feature branches lose the intended checkpoint history and worktree merges lack clean boundaries
- **Fix:** When workflow commits are enabled, commit verified local work before completion options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Cleanup automatically only for Options 1 and 4. For Option 2, ask first.

**Treating a normal feature branch like a worktree**
- **Problem:** Prompt to merge back to main/master or clean up worktrees when the user worked directly on a branch.
- **Fix:** If work is already committed on the user-directed branch, report readiness and wait for push/PR instructions.

**Wrong merge target for worktrees**
- **Problem:** Merge temporary worktree branches to main/master because it is the default branch.
- **Fix:** Merge worktree/task branches into their parent/source feature branch unless the user explicitly chose main/master.

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Push without explicit request
- Merge to main/master unless the user explicitly requested main/master as the integration target
- Delete a durable feature branch while finalizing temporary worktree branches

**Always:**
- Verify tests before offering options
- Commit verified local work before completion options when workflow commits are enabled
- Identify whether work is on a durable branch or temporary worktree/task branch before presenting options
- Present exactly 4 options when a decision is needed
- Get typed confirmation for Option 4
- Clean up worktrees automatically for Options 1 & 4 only when a worktree exists; ask before cleanup for Option 2

## Integration

**Called by:**
- **subagent-driven-development** - After all tasks complete
- **executing-plans** - After all batches complete

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill
