---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
category: guidance
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase or local conventions. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as dependency-ordered parent task scopes with dispatchable subtasks. DRY. YAGNI. Use the workflow profile's testing intensity to scale test requirements. Include local commit steps at verified implementation task-scope boundaries when workflow commits are enabled.

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

## Agent Dispatch

When named agents are available and the plan is substantial, dispatch `plan-writer` with the approved spec, compact workflow profile summary, repo conventions, docs path, generated-doc policy, testing intensity, and execution constraints. The `plan-writer` may write the plan document but must not implement code.

Named agents are adapter roles, not workflow sources. Keep plan rules in this skill and use `plan-writer` only to produce or revise the bounded plan artifact. If named agents are unavailable, use the fallback prompt template and preserve this skill's task granularity, review policy, and execution handoff requirements.

After the plan is written, use `plan-reviewer` for broad or high-risk plans, plans with many files, plans that will dispatch multiple workers, or any plan whose execution shape is uncertain. For small plans, inline self-review is enough unless the user or profile requires review.

If `plan-reviewer` returns changes required, update the plan once, then request one focused re-review of the changed scope. If material issues remain, ask the user before execution.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Dispatchable Task Granularity

Plan in parent task scopes that share one useful validation boundary, but make the executable subtasks small enough for separate worker dispatch. The main agent will own the todo list and hand each dispatchable implementation unit to the appropriate agent.

**Each task should be small enough to execute safely, but not so small that it forces a cold-start review loop for mechanical work:**
- Good task scope: `Task 1: Login Flow` with test, implementation, and validation subtasks
- Good dispatch task: `Task 1.1: Write failing login validation tests` routed to `tdd-implementer`
- Good dispatch task: `Task 1.2: Implement login form behavior` routed to `implementer`
- Good lite checkpoint: `Task 1.1: Lite review checkpoint` using lite spec/code reviewers as needed
- Good task-scope review: `Task 1: Full spec review` and `Task 1: Lite code review`
- Good harness todo: `Task 1.2: Implement login form behavior - dispatch implementer`
- Good harness todo: `Task 1 Review - validate Task 1, run required reviewers, commit if enabled`
- Bad harness todo default: separate visible todos for every `Task N.M`, lite checkpoint, and review command
- Bad harness todo default: one broad `Task 1` todo that hands all of Login Flow to a single implementer
- Bad review default: full spec review and full code review after every tiny task

Use task-level full review only for high-risk, ambiguous, or cross-cutting work.

## Harness Todo Shape

Plan documents should contain detailed `Task N.M` subtasks that are suitable for bounded worker dispatch. Harness todo lists should stay readable and flat by showing coordinator-owned dispatch and gate decisions:

```markdown
- Task 0: Execution setup - read plan, classify task scopes, prepare context
- Task 1.1: <bounded implementation unit> - dispatch <worker role>
- Task 1.2: <bounded implementation unit> - dispatch <worker role>
- Task 1 Review: validate Task 1, run required reviewers, commit if enabled
- Task 2.1: <bounded implementation unit> - dispatch <worker role>
- Task 2 Review: validate Task 2, run required reviewers, commit if enabled
- Review: final full-scope spec review, code review, and validation
- Finalize: finish branch according to current execution mode
```

Each visible implementation todo should map to one worker assignment, unless several adjacent mechanical steps touch the same files and have one obvious validation command. Parent `Task N Review` todos collect task-scope validation, required reviewers, and coordinator-owned commits. Do not expand every checkbox or mechanical command into a harness todo; expand at worker dispatch, review, validation, dependency, and blocker-resolution boundaries.

`Finalize` means:
- In a worktree or temporary task branch, integrate back into the parent/source feature branch and clean up according to `finishing-a-development-branch`.
- On the current branch, ensure verified changes are committed locally and the feature branch is ready for PR.
- Never push unless the user explicitly requests it.

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan. The main agent is the coordinator: it owns todos, dispatches each bounded `Task N.M` implementation unit to the appropriate worker, runs reviews/validation, and decides the next step from worker reports. Steps use checkbox (`- [ ]`) syntax for plan tracking; harness todos should stay flat and dispatch-scoped, with parent `Task N Review` gates plus final `Review` and `Finalize`.

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

Report the files changed in this task and whether tests passed. Do not continue into later tasks. The coordinator commits at the parent task boundary when workflow commits are enabled.

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
- Parent task scopes and `Task N.M` subtasks belong in plan docs; harness todos should be flat, dispatch-scoped, and ordered by dependency
- Include an explicit review policy per parent task scope

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

If a `plan-reviewer` agent is used, this self-review still runs first. The reviewer is an independent readiness check, not a replacement for author responsibility.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Execution shape:** Does the plan support flat, dependency-ordered harness todos with labels like `Task 0: Execution setup`, `Task 1.1: <bounded implementation unit> - dispatch <worker role>`, `Task 1 Review: validate Task 1, run required reviewers, commit if enabled`, `Review: final full-scope spec review, code review, and validation`, and `Finalize: finish branch according to current execution mode`? If the plan collapses a parent task into one broad implementer assignment or requires visible todos for every tiny command, fix it.

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
