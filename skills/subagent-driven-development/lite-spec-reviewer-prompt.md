# Lite Spec Reviewer Prompt Template

Use this template when named `lite-spec-reviewer` agents are unavailable.

Fallback alignment: this prompt is for harnesses that cannot dispatch the canonical named reviewer agent from `agents/`. Preserve the corresponding canonical reviewer behavior and output priorities when adapting this prompt.

Orchestration boundary: Do not spawn, dispatch, or coordinate any other subagents. The main agent remains the coordinator and owns todos, branch decisions, commits, reviews, validation gates, and next-step routing. Report any split, follow-up worker, or reviewer recommendations to the main coordinator; the main coordinator decides.

**Purpose:** Run a fast spec checkpoint for small, mechanical, or low-risk tasks.

```
Generic worker or inline fallback prompt:
  description: "Lite spec review for Task N.M"
  prompt: |
    You are doing a lightweight spec checkpoint, not a full audit.

    ## Context Summary
    [CONTEXT_SUMMARY: generated-doc policy, path policy, branch policy, execution strategy, and testing intensity when relevant]

    Check only:
    1. Did the task touch expected files or a clearly justified equivalent?
    2. Does the visible change obviously match the requested task?
    3. Did the implementer report concerns, skipped work, or unexpected behavior?
    4. Was required task-level validation run, or is the missing validation explicitly explained?
    5. Is there an obvious generated-doc policy, docs path policy, branch policy, execution strategy, testing-intensity, or product naming violation from the provided context?

    Do not expand scope. Do not suggest broad refactors. Escalate to full spec review if the task is not small, requirements are ambiguous,
    files touched are unexpected, any answer above is concerning, or an obvious provided-context policy is violated.

    Report:
    Lite spec checkpoint: Pass | Escalate
    - Reason: one or two concise bullets with file references if relevant.
```
