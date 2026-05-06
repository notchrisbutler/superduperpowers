# Full Task Template

Use this long template when writing a detailed implementation plan. The main `writing-plans` skill contains the required structure; this file provides the expanded form.

````markdown
### Task N: [Feature/Validation Boundary]

**Review policy:** [lite task checkpoints + full task-scope spec review + lite task-scope code review, or full spec/code review for high-risk work]

#### Task N.1: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`

Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`

Expected: PASS

- [ ] **Step 5: Report changed files**

Report the files changed in this task and whether tests passed. Do not continue into later tasks. The coordinator commits at the parent task boundary only when workflow commits are enabled by the approved execution workflow.

#### Task N Review

- [ ] Run full spec review for Task N.
- [ ] Run lite code review for Task N.
- [ ] Run task-scope validation command: `pytest tests/path -v`.
- [ ] Commit Task N implementation changes locally if workflow commits are enabled by the approved execution workflow.
````

## Granularity Examples

Good parent task scope: `Task 1: Login Flow` with test, implementation, validation, and review subtasks.

Good dispatch subtasks:
- `Task 1.1: Write failing login validation tests` routed to `tdd-implementer`.
- `Task 1.2: Implement login form behavior` routed to `implementer`.

Good harness todos:
- `Task 1.2: Implement login form behavior - dispatch implementer`.
- `Task 1 Review - validate Task 1, run required reviewers, commit if enabled`.

Bad defaults:
- Separate visible todos for every mechanical command.
- One broad parent task handed entirely to one implementer.
- Full spec and full code review after every tiny task when risk does not justify it.

Use task-level full review for high-risk, ambiguous, or cross-cutting work. Otherwise use lite checkpoints and parent review gates sized to actual risk.
