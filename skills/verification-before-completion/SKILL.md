---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
metadata:
  category: completion
---

# Verification Before Completion

## Overview

Claiming completion without fresh evidence is unreliable.

**Core principle:** Evidence before claims, always.

This completion gate is used by `executing-plans`, `subagent-driven-development`, and `finishing-a-development-branch` before final success claims, local commits, PR summaries, or branch completion options.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the relevant verification command in this message, you cannot claim it passes.

## Gate Function

Before any success/completion statement:

1. **Identify** the command or evidence that proves the claim.
2. **Run** the full command fresh, or gather fresh read-only evidence when you are not allowed to edit/run tests.
3. **Read** the complete output: exit code, pass/fail count, warnings, and errors.
4. **Verify** whether the output proves the claim.
5. **Report** the claim only with evidence. If not proven, state actual status and blockers.

Skipping a required step means the work is not verified.

## Evidence Requirements

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output with 0 failures | Previous run, "should pass" |
| Linter clean | Linter output with 0 errors | Partial check |
| Build succeeds | Build command exit 0 | Linter passing |
| Bug fixed | Original symptom/regression check passes | Code changed |
| Regression test works | Red and green behavior verified | Test passes once |
| Agent completed | VCS diff plus validation of changes | Agent says success |
| Requirements met | Checklist against plan/spec | Tests passing alone |

Editing agents must run targeted validation when practical and quote commands/results. Read-only reviewers or investigators must verify with allowed evidence such as diffs, file reads, logs, and checklist comparison, and must not claim tests pass unless they saw test output.

## Red Flags - Stop

- Saying "should," "probably," "seems," "done," "fixed," or similar before verification.
- Expressing satisfaction before evidence.
- Committing, pushing, creating a PR, moving to the next task, or delegating based on unverified assumptions.
- Trusting an agent success report without checking changes/evidence.
- Treating partial checks as proof.

## Good/Bad Patterns

**Tests:** Good: run the test command and report `34/34 pass`. Bad: "should pass now."

**Regression tests:** Good: show red failure, restore fix, show green pass. Bad: "I wrote a regression test" without red-green evidence.

**Build:** Good: run build and report exit 0. Bad: infer build success from lint success.

**Requirements:** Good: re-read plan, check each item, report gaps or completion. Bad: "tests pass, so phase complete."

**Delegation:** Good: agent report plus VCS diff/checklist/validation. Bad: trusting the report alone.

## When To Apply

Always before any variation or implication of success, completion, correctness, committing, PR creation, task completion, moving to another task, or branch finalization.

## Bottom Line

Run the command. Read the output. Then claim only what the evidence proves. If verification was not run or could not be run, say that clearly and refuse to claim verified success.
