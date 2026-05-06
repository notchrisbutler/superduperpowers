# TDD Examples and Recovery

Use this reference when the inline TDD rules are not enough and you need examples, recovery language, or rationale for a hard stop.

## Minimal Red/Green Example

**Bug:** Empty email is accepted.

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

Refactor only after green, and only without adding behavior.

## Good and Bad Test Shape

Good tests are minimal, behavior-focused, and clear:

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

Avoid vague tests that mostly verify mocks:

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

## Minimal Green Code

Prefer the smallest code that satisfies the red test:

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

Do not jump to generalized options, callbacks, backoff strategies, or unrelated refactors unless a failing test requires them.

## Why the Order Matters

Tests written after code pass immediately and prove little: they may test the implementation instead of required behavior, miss forgotten edge cases, or never demonstrate that they catch the bug. Tests-first asks "what should this do?" before the implementation biases the answer.

Manual testing is not a substitute for repeatable proof. It has no durable record, is easy to forget under pressure, and must be redone after every change.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks; the test is cheap. |
| "I'll test after" | Immediate pass proves nothing. |
| "Already manually tested" | Manual checks are not repeatable evidence. |
| "Keep as reference" | You will adapt it; that is tests-after. |
| "Need to explore first" | Fine; throw away exploration and start TDD. |
| "Test hard = design unclear" | Listen to the test and simplify the interface. |
| "Existing code has no tests" | Ask before adding tooling or choosing spot checks. |

## When Stuck

| Problem | Response |
|---------|----------|
| Unknown test tooling | Stop and ask before creating tests. |
| Hard to test in known tooling | Write wished-for API/assertion first; ask if still unclear. |
| Test setup huge | Extract helpers; if still complex, simplify design. |
| Must mock everything | Code may be too coupled; consider dependency injection. |
| Same test fails after two implementation attempts | Stop and re-evaluate design, plan, or task boundary. |

## Recovery After a TDD Violation

If the agent wrote production code first, identify whether those changes are only the agent's own current-task work and can be safely isolated. If yes, discard that implementation and restart from a failing test. If user work, other-agent work, or unrelated changes are mixed in, stop and ask before deleting or rewriting anything. Report exactly what was created, what was not verified, and what permission or separation is needed.
