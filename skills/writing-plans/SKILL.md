---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase or local conventions. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as grouped, dependency-ordered task scopes with detailed subtasks. DRY. YAGNI. Use the workflow profile's testing intensity to scale test requirements. Include local commit steps at verified implementation task-scope boundaries when workflow commits are enabled.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Prefer a dedicated worktree when the user wants isolated execution. If the user explicitly directs work to happen on the current branch, write the plan for current-branch execution and do not assume worktree setup or cleanup.

Read live settings and the active workflow profile when available. Inherit docs paths, generated-doc policy, branch policy, workflow commit policy, question policy, and testing intensity from the current JSON/JSONC settings unless the profile or user explicitly overrides them. If no settings/profile tool exists, carry these decisions explicitly in the plan header and execution handoff.

Use `testingIntensity` to scale test requirements. `major-behavior` is the default: plan tests for important behavior and integration points, but avoid exhaustive or obvious tests.

If testing intensity is missing before execution handoff, ask through the active harness's structured question tool and persist the answer before offering execution method choices:

1. Full regression
2. Major behavior only
3. Existing tests only

**Save plans to:** `{DOCS_ROOT}/{SDP_DOCS_DIR}/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)
- Generated plans follow the live `generatedDocsPolicy`. The default is local-only. Do not commit or force-add the generated plan unless live settings, repo instructions, or the user explicitly require committing approved generated docs.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Grouped Task Granularity

Plan in parent task scopes that share one useful validation boundary. Keep detailed execution steps in the plan, but keep harness todo lists compact by showing only the parent task scopes and final orchestration steps.

**Each task should be small enough to execute safely, but not so small that it forces a cold-start review loop for mechanical work:**
- Good task scope: `Task 1: Login Flow` with test, implementation, and validation subtasks
- Good task: `Task 1.1: Write failing login validation tests`
- Good lite checkpoint: `Task 1.1: Lite review checkpoint` using lite spec/code reviewers as needed
- Good task-scope review: `Task 1: Full spec review` and `Task 1: Lite code review`
- Good harness todo: `Task 1: Login Flow - execute Task 1.1-1.N, review, validate, commit if enabled`
- Bad harness todo default: separate visible todos for every `Task N.M`, lite checkpoint, and review command
- Bad review default: full spec review and full code review after every tiny task

Use task-level full review only for high-risk, ambiguous, or cross-cutting work.

## Harness Todo Shape

Plan documents may contain detailed `Task N.M` subtasks. Harness todo lists should stay readable and flat by folding those details into one visible todo per parent task scope:

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1: <parent task goal> - execute Task 1.1-1.N, review, validate, commit if enabled
- Task 2: <parent task goal> - execute Task 2.1-2.N, review, validate, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Each visible `Task N` todo includes all plan-defined subtasks, lite checkpoints, task-scope reviews, validation commands, and task-scope commit steps for that parent scope. Only split a `Task N.M` into its own harness todo when it is a real dependency boundary, high-risk checkpoint, or blocker-resolution step that must be tracked separately.

`Finalize` means:
- In a worktree or temporary task branch, integrate back into the parent/source feature branch and clean up according to `finishing-a-development-branch`.
- On the current branch, ensure verified changes are committed locally and the feature branch is ready for PR.
- Never push unless the user explicitly requests it.

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan in dependency-ordered parent task scopes. Steps use checkbox (`- [ ]`) syntax for plan tracking; harness todos should stay compact with one visible todo per parent `Task N` scope plus `Review` and `Finalize`.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

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

Report the files changed in this task and whether tests passed. The coordinator commits at the parent task boundary when workflow commits are enabled.

#### Task N Review

- [ ] Run full spec review for Task N
- [ ] Run lite code review for Task N
- [ ] Run task-scope validation command: `pytest tests/path -v`
- [ ] Commit Task N changes locally if workflow commits are enabled
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, testing-intensity-aware validation, and local commits at verified implementation task-scope boundaries when workflow commits are enabled
- Conceptual groups and `Task N.M` subtasks belong in plan docs; harness todos should be compact, flat, and ordered by parent task dependency
- Include an explicit review policy per group

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Execution shape:** Does the plan support compact, dependency-ordered harness todos with labels like `Task 0: Execution setup`, `Task 1: <goal> - execute Task 1.1-1.N, review, validate, commit if enabled`, `Review: final full-scope spec review, code review, and validation`, and `Finalize: finish branch according to current execution mode`? If the plan requires visible todos for every subtask, lite checkpoint, or tiny review, fix it.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Plan Review And Commit Gate

After saving and self-reviewing the plan, ask the user to review it before execution:

> "Plan written to `<path>`. Please review it and let me know if you want changes before execution."

Wait for the user's response. If they request changes, update the plan and re-run self-review. Only proceed to execution handoff once the user approves the written plan.

After user approval, re-read live settings, then update the workflow profile or explicit handoff context with the approved plan path before offering execution choices. Do not commit or force-add the generated plan unless `generatedDocsPolicy` or explicit user/repo instructions require it. If generated docs are committed, commit only after approval.

## Execution Handoff

After the user approves the written plan, ask execution method through the active harness's structured question tool:

1. Subagent Driven Development
2. Inline Execution, all in the main agent with no subagents
3. Hold off on implementing for now

If the user chooses Hold off, record `executionMethod: hold` and stop cleanly.

If the user chooses Inline Execution, record `executionMethod: inline`, run branch preflight, use `using-feature-branches` unless current-branch execution was explicitly approved, then invoke `executing-plans`.

If the user chooses Subagent Driven Development, record `executionMethod: subagent-driven`, then ask execution strategy through the structured question tool:

1. User-level worktree route using `using-git-worktrees`
2. Feature branch route using `using-feature-branches`
3. Hold off on implementing for now

Only invoke execution skills after the profile contains the required execution choices and branch/setup preflight passes.
