---
name: systematic-debugging
description: Use when the user asks for debugging/root-cause analysis, when an issue is complex or non-reproducible, when multiple components are involved, or when prior fixes failed.
metadata:
  category: guidance
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask root issues.

**Core principle:** Always find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If Phase 1 is not complete, you cannot propose fixes.

## When to Use

Use this skill when the user asks for debugging/diagnosis/root-cause analysis, the issue is intermittent or poorly understood, multiple components are involved, a previous fix failed, or the failure is high-risk/production-facing.

Do not auto-trigger this skill for every small bug report or obvious localized fix. If the issue might need root-cause work but the user asked for quick flow or No SuperDuperPowers, ask whether to switch to systematic debugging.

## Agent Dispatch

When named agents are available and the issue is complex, intermittent, multi-component, or already had failed fixes, dispatch `debugging-investigator` before implementation. Give it symptoms, reproduction notes, logs/errors, relevant files, recent changes, and compact profile summary. The investigator is read-only.

If independent failure domains exist, use `dispatching-parallel-agents` and `parallelization-advisor` before dispatching multiple investigators. Dispatch `implementer` or `tdd-implementer` only after root-cause evidence exists and the smallest fix task is clear.

## The Four Phases

Complete each phase before proceeding.

### Phase 1: Root Cause Investigation

Before any fix:

1. **Read errors fully.** Capture stack traces, file paths, line numbers, error codes, warnings, and exact messages.
2. **Reproduce consistently.** Record exact steps and whether the issue is deterministic. If not reproducible, gather more data; do not guess.
3. **Check recent changes.** Inspect diffs, commits, dependencies, config, and environment differences that could explain the timing.
4. **Gather boundary evidence.** In multi-component systems, instrument each boundary: data in/out, config propagation, state, and environment. Run once to identify where it breaks, then investigate that component.
5. **Trace data flow.** For deep stack failures, trace the bad value backward until you find its source. Fix at the source, not the symptom. See `root-cause-tracing.md` for the complete technique.

### Phase 2: Pattern Analysis

Find working examples in the same codebase, read relevant references completely, list differences between working and broken paths, and identify required dependencies/config/assumptions. Do not dismiss small differences without evidence.

### Phase 3: Hypothesis and Testing

State one specific hypothesis: "I think X is the root cause because Y." Test it with the smallest possible change or measurement, one variable at a time. If it fails, record the evidence and form a new hypothesis; do not stack more fixes on top.

When you do not understand something, say so, research more, or ask for help. Do not pretend certainty.

### Phase 4: Implementation

Fix the root cause, not the symptom:

1. Create a failing test or simplest reproducible check before fixing. Use existing project tooling where possible and `test-driven-development` for proper failing tests. With `major-behavior`, cover the main regression/integration point without adding exhaustive tests. If no suitable tooling exists, ask before creating scripts or adding dependencies.
2. Implement one root-cause fix. No bundled refactoring or "while I'm here" work.
3. Verify the fix and surrounding behavior.
4. If the first fix fails, return to Phase 1 with the new evidence and state a new hypothesis before changing code again.
5. If a second fix fails in the same scope, stop and re-evaluate the plan/spec before changing code again. Do not attempt a third variant without new evidence, a changed plan, or explicit user direction.

If repeated fixes reveal shared state, coupling, massive refactoring needs, or new symptoms elsewhere, stop and question the architecture with the user. A minimal placeholder seam is allowed only when explicit, disabled or fallback-backed, and not pretending blocked behavior works.

## Red Flags - Stop

- "Quick fix for now, investigate later."
- "Just try changing X."
- Multiple changes before testing.
- Manual verification instead of a test/reproduction.
- Proposing fixes before tracing data flow.
- "One more fix attempt" after two failures.
- Each fix reveals a different problem.

Return to Phase 1. If repeated fixes require a major design, dependency, architecture, data-model, security, or product decision, escalate before more implementation.

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| 1. Root Cause | Read errors, reproduce, check changes, gather evidence | Understand what failed and why |
| 2. Pattern | Find working examples, compare | Identify relevant differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals No Root Cause

If the issue is truly environmental, timing-dependent, or external, document what you investigated, implement appropriate handling such as retry/timeout/error messaging, and add monitoring/logging for future diagnosis. Treat this as rare; most "no root cause" cases are incomplete investigation.

## Supporting Techniques

- `root-cause-tracing.md` - Trace bugs backward through the call stack.
- `defense-in-depth.md` - Add validation at multiple layers after finding root cause.
- `condition-based-waiting.md` - Replace arbitrary timeouts with condition polling.

Related skills: `test-driven-development` for Phase 4 tests and `verification-before-completion` before claiming a fix works.

For extended examples/details, read [debugging examples and transcripts](references/debugging-examples-and-transcripts.md) when this extra detail is needed.
