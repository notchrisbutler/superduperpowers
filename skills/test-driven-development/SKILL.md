---
name: test-driven-development
description: Use when the user asks for TDD, when a SuperDuperPowers full workflow calls for TDD, or when a high-risk behavior change needs tests-first implementation.
metadata:
  category: guidance
---

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

Use this skill when:

- The user asks for TDD or tests-first work.
- A SuperDuperPowers full workflow calls for TDD.
- A behavior change is high-risk enough that tests-first work is the safest path.
- You are implementing a regression fix where a failing test is needed to prove the bug.

Do not auto-trigger this skill for every quick flow, small feature, refactor, or config change. If the user asked for quick flow or no SuperDuperPowers, keep the work lightweight unless the task escalates.

If the change looks risky but the user asked for speed, ask whether to switch to TDD rather than silently invoking this skill.

## Agent Dispatch

When named agents are available and a bounded task requires tests-first implementation, dispatch `tdd-implementer` with the exact behavior, expected files, existing test tooling, validation commands, and compact profile summary. Use `implementer` only for tasks where TDD is not required.

The coordinator remains responsible for task-scope review, final validation, and commits. The `tdd-implementer` must report the red command and failure, the green command and pass result, changed files, and concerns.

## Testing Intensity

Read testing intensity from the workflow profile when available:

- `full-regression`: write or update tests for every important behavior and regression surface.
- `major-behavior`: write or update tests for major behavior and integration points; avoid exhaustive or obvious tests.
- `existing-tests-only`: do not add new tests by default; update existing tests only when the change breaks them and rely on targeted validation or manual checks when appropriate.

TDD remains strict when selected: write the test first, watch it fail, then implement. Testing intensity changes how much coverage is expected, not the red-green-refactor order.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? If it is only your own current-task implementation and no user or other-agent changes are mixed in, delete it and start over.

If the working tree includes user changes, other-agent changes, or unrelated work, stop and ask before deleting, reverting, or rewriting anything.

**No exceptions for your own current-task implementation:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete only for work you created in this TDD task and can safely isolate

Implement fresh from tests. Period.

## Test Tooling Discovery

Before writing the first failing test, inspect the codebase for existing test tooling and conventions.

Check for project signals such as:
- Existing test files and directories (`test`, `tests`, `spec`, `__tests__`)
- Package scripts and config (`package.json`, `vitest`, `jest`, `pytest`, `go test`, `cargo test`, language-specific test config)
- Existing local validation scripts or harness-specific commands

Use the project's existing test module, suite, command, and style when they are clear.

If no test tooling exists, or you are unsure which module/suite/command the user wants, **STOP and ask the user how to proceed** before creating tests or choosing tools. Do not add a new test framework, dependency, or local script without explicit approval.

Offer concrete options when possible:
- Add to the existing formal suite
- Create an approved local-only spot-check script for the logic
- Use a broader validation command
- Defer automated test setup and get explicit permission for a manual check

Never unilaterally introduce a test framework, dependency, create a new suite, or decide between local spot checks and full-suite validation.

## Red-Green-Refactor

```dot
digraph tdd_cycle {
    rankdir=LR;
    red [label="RED\nWrite failing test", shape=box, style=filled, fillcolor="#ffcccc"];
    verify_red [label="Verify fails\ncorrectly", shape=diamond];
    green [label="GREEN\nMinimal code", shape=box, style=filled, fillcolor="#ccffcc"];
    verify_green [label="Verify passes\nAll green", shape=diamond];
    refactor [label="REFACTOR\nClean up", shape=box, style=filled, fillcolor="#ccccff"];
    next [label="Next", shape=ellipse];

    red -> verify_red;
    verify_red -> green [label="yes"];
    verify_red -> red [label="wrong\nfailure"];
    green -> verify_green;
    verify_green -> refactor [label="yes"];
    verify_green -> green [label="no"];
    refactor -> verify_green [label="stay\ngreen"];
    verify_green -> next;
    next -> red;
}
```

### RED - Write Failing Test

Write one minimal test showing what should happen.

<Good>
```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```
Clear name, tests real behavior, one thing
</Good>

<Bad>
```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```
Vague name, tests mock not code
</Bad>

**Requirements:**
- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
<project test command> path/to/test
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code

Write simplest code to pass the test.

<Good>
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```
Just enough to pass
</Good>

<Bad>
```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI
}
```
Over-engineered
</Bad>

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
<project test command> path/to/test
```

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

If two implementation attempts fail for the same test without producing a new supported hypothesis, stop and re-evaluate the design or task boundary. Do not keep alternating between test edits and production edits. Report the failed attempts, the evidence, and whether the next step needs a plan/spec update or user decision.

**Other tests fail?** Fix now.

### REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Why Order Matters

**"I'll write tests after to verify it works"**

Tests written after code pass immediately. Passing immediately proves nothing:
- Might test wrong thing
- Might test implementation, not behavior
- Might miss edge cases you forgot
- You never saw it catch the bug

Test-first forces you to see the test fail, proving it actually tests something.

**"I already manually tested all the edge cases"**

Manual testing is ad-hoc. You think you tested everything but:
- No record of what you tested
- Can't re-run when code changes
- Easy to forget cases under pressure
- "It worked when I tried it" ≠ comprehensive

Automated tests are systematic. They run the same way every time.

**"Deleting X hours of work is wasteful"**

Sunk cost fallacy. The time is already gone. Your choice now:
- Delete and rewrite with TDD (X more hours, high confidence)
- Keep it and add tests after (30 min, low confidence, likely bugs)

The "waste" is keeping code you can't trust. Working code without real tests is technical debt.

**"TDD is dogmatic, being pragmatic means adapting"**

TDD IS pragmatic:
- Finds bugs before commit (faster than debugging after)
- Prevents regressions (tests catch breaks immediately)
- Documents behavior (tests show how to use code)
- Enables refactoring (change freely, tests catch breaks)

"Pragmatic" shortcuts = debugging in production = slower.

**"Tests after achieve the same goals - it's spirit not ritual"**

No. Tests-after answer "What does this do?" Tests-first answer "What should this do?"

Tests-after are biased by your implementation. You test what you built, not what's required. You verify remembered edge cases, not discovered ones.

Tests-first force edge case discovery before implementing. Tests-after verify you remembered everything (you didn't).

30 minutes of tests after ≠ TDD. You get coverage, lose proof tests work.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete your own current-task implementation only when it is safe to isolate. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |
| "Existing code has no tests" | Stop and ask before adding tooling or choosing local spot checks. |

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "This is different because..."
- "I'll just pick Jest/Vitest/pytest for them"
- "A quick local script is good enough" without user approval

**All of these mean: stop using the non-TDD implementation. Delete and start over only for your own current-task changes when they can be safely isolated. If user changes, other-agent changes, or unrelated work are mixed in, stop and ask before deleting or rewriting anything.**

## Example: Bug Fix

**Bug:** Empty email accepted

**RED**
```typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

**Verify RED**
```bash
$ npm test
FAIL: expected 'Email required', got undefined
```

**GREEN**
```typescript
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ...
}
```

**Verify GREEN**
```bash
$ npm test
PASS
```

**REFACTOR**
Extract validation for multiple fields if needed.

## Verification Checklist

Before marking work complete:

- [ ] New tests match the profile's testing intensity; for `major-behavior`, cover major behavior and integration points without exhaustive or obvious tests.
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over only within your own current-task implementation, or stop and ask if changes are mixed with user or other-agent work.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know which test tooling to use | Stop and ask the user before creating tests. |
| Don't know how to test within known tooling | Write wished-for API. Write assertion first. Ask the user if still unclear. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |
| Same test still fails after two implementation attempts | Stop. Re-evaluate the design, plan, or task boundary before changing code again. |

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Test proves fix and prevents regression.

Never fix bugs without a test.

## Testing Anti-Patterns

When adding mocks or test utilities, read [testing-anti-patterns.md](testing-anti-patterns.md) to avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without the user's permission.
