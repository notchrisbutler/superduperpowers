# Parallelization Examples

## Independent Failure Split

Scenario: six test failures across three files after a refactor.

- `agent-tool-abort.test.ts`: three timing-related failures.
- `batch-completion-behavior.test.ts`: two tool-execution failures.
- `tool-approval-race-conditions.test.ts`: one execution-count failure.

Decision: split only if abort logic, batch completion, and race-condition handling can be investigated without overlapping file edits or shared validation state.

```markdown
Agent 1 → Fix agent-tool-abort.test.ts
Agent 2 → Fix batch-completion-behavior.test.ts
Agent 3 → Fix tool-approval-race-conditions.test.ts
```

Possible results:

- Agent 1 replaces arbitrary timeouts with event-based waiting.
- Agent 2 fixes an event structure bug.
- Agent 3 waits for async tool execution to complete.

Integration gate: read each summary, inspect changed files for overlap, run the targeted tests, then run the suite required by the parent task before review.

## Worker Dispatch Pseudo-Code

```typescript
// In the active harness's worker-dispatch mechanism
dispatchWorker("Fix agent-tool-abort.test.ts failures")
dispatchWorker("Fix batch-completion-behavior.test.ts failures")
dispatchWorker("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently only after independence is confirmed.
```

## Focused Prompt Example

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These may be timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by replacing arbitrary timeouts with event-based waiting, fixing abort bugs if found, or adjusting expectations only when behavior intentionally changed

Do NOT just increase timeouts - find the real issue.

Return: summary of root cause, changed files, validation commands and results, concerns.
```

## Real-World Impact Pattern

Parallel dispatch saves time only when integration remains safe: independent investigations complete concurrently, all fixes integrate without conflicts, and the combined validation suite passes. If any worker reports overlapping ownership or a shared root cause, stop parallel work and regroup sequentially.
