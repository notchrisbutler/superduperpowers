---
name: test-driven-development
description: Use when the user asks for TDD, when a SuperDuperPowers full workflow calls for TDD, or when a high-risk behavior change needs tests-first implementation.
metadata:
  category: guidance
---

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you did not watch the test fail, you do not know whether it tests the right thing.

## When to Use

Use this skill when the user asks for TDD/tests-first work, a SuperDuperPowers workflow calls for TDD, a behavior change is high-risk, or a regression fix needs a failing test to prove the bug.

Do not auto-trigger this skill for every quick flow, small feature, refactor, or config change. If the user asked for speed but the change looks risky, ask whether to switch to TDD.

## Agent Dispatch

When named agents are available and a bounded task requires tests-first implementation, dispatch `tdd-implementer` with the exact behavior, expected files, existing test tooling, validation commands, and compact profile summary. Use `implementer` only when TDD is not required.

The coordinator remains responsible for task-scope review, final validation, follow-up subagent dispatch, and commits. The `tdd-implementer` must report the red command/failure, green command/pass result, changed files, and concerns; it must not spawn, dispatch, or coordinate other subagents.

## Testing Intensity

Read testing intensity from the workflow profile when available:

- `full-regression`: cover every important behavior and regression surface.
- `major-behavior`: cover major behavior and integration points; avoid exhaustive or obvious tests.
- `existing-tests-only`: do not add new tests by default; update existing tests only when the change breaks them and rely on targeted validation/manual checks when appropriate.

TDD remains strict when selected: write the test first, watch it fail, then implement. Testing intensity changes coverage depth, not red-green-refactor order.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

If you wrote production code before the test, and it is only your own current-task implementation with no mixed user or other-agent changes, delete it and start over from tests. Do not keep it as reference, adapt it, or look at it while writing tests.

If the working tree includes user changes, other-agent changes, or unrelated work, stop and ask before deleting, reverting, or rewriting anything. Delete/restart applies only to work you created in this TDD task and can safely isolate.

## Test Tooling Discovery

Before writing the first failing test, inspect existing test files, package scripts, local validation commands, and language/framework conventions. Use the project's existing test module, suite, command, and style when clear.

If no test tooling exists, or you are unsure which module/suite/command the user wants, **STOP and ask** before creating tests or choosing tools. Do not add a new test framework, dependency, suite, or local script without explicit approval. Offer concrete options such as adding to the existing suite, creating an approved local-only spot check, using broader validation, or deferring automated setup.

## Red-Green-Refactor Loop

1. **RED:** Write one minimal test for one behavior with a clear name. Prefer real code; use mocks only when unavoidable.
2. **Verify RED:** Run the targeted project test command. Confirm the test fails for the expected reason because behavior is missing, not because of typos/setup errors. If it passes, fix the test.
3. **GREEN:** Write the simplest production code that passes the test. Do not add features, broad rewrites, unrelated refactors, or "while I'm here" improvements.
4. **Verify GREEN:** Run the targeted test and appropriate surrounding tests. Confirm pass output is clean.
5. **REFACTOR:** Only after green, remove duplication, improve names, and extract helpers without changing behavior. Keep tests green.
6. **Repeat:** Add the next failing test for the next behavior.

If the same test still fails after two implementation attempts without a new supported hypothesis, stop and re-evaluate the design or task boundary. Report failed attempts, evidence, and whether a plan/spec update or user decision is needed.

## Red Flags - Stop

- Code before test, tests added later, or test passes immediately.
- You cannot explain why the test failed.
- You are rationalizing "just this once," "spirit not ritual," or "I manually tested it."
- You want to keep/adapt non-TDD code as reference.
- You want to pick Jest/Vitest/pytest, add a framework, or create a local spot-check script without approval.

All of these mean: stop using the non-TDD implementation. Delete and restart only for safely isolated current-task changes; otherwise ask before rewriting anything.

## Verification Checklist

Before marking work complete:

- [ ] New tests match the profile's testing intensity.
- [ ] Each test was watched failing before implementation.
- [ ] Each red failure proved the intended missing behavior.
- [ ] Minimal code made each test pass.
- [ ] Targeted and relevant surrounding tests pass with clean output.
- [ ] Tests use real code where practical; mocks are justified.
- [ ] Edge cases/errors required by the task are covered.

Can't check all boxes? You skipped TDD. Restart only within your own isolated task changes, or stop and ask if changes are mixed.

## Debugging Integration

Bug found? Write a failing test that reproduces it, then follow the TDD loop. Never fix bugs without a test unless the user explicitly approves a non-TDD exception.

## Testing Anti-Patterns

When adding mocks or test utilities, read [testing-anti-patterns.md](testing-anti-patterns.md) to avoid testing mock behavior, adding test-only production APIs, or mocking without understanding dependencies.

For extended examples/details, read [TDD examples and recovery](references/tdd-examples-and-recovery.md) when this extra detail is needed.

## Final Rule

```
Production code -> test exists and failed first
Otherwise -> not TDD
```

No exceptions without the user's permission.
