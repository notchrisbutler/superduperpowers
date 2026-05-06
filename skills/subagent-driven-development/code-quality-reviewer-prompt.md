# Code Quality Reviewer Prompt Template

Use named `code-reviewer` when available. Use this fallback template when named agents are unavailable.

Fallback alignment: this prompt is for harnesses that cannot dispatch the canonical named reviewer agent from `agents/`. Preserve the corresponding canonical reviewer behavior and output priorities when adapting this prompt.

Orchestration boundary: Do not spawn, dispatch, or coordinate any other subagents. The main agent remains the coordinator and owns todos, branch decisions, commits, reviews, validation gates, and next-step routing. Report any split, follow-up worker, or reviewer recommendations to the main coordinator; the main coordinator decides.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

```
Generic worker or inline fallback prompt:
  description: "Full code review for Task Group N"
  prompt: |
    You are reviewing completed work for code quality, maintainability, and integration risks.

    ## What Was Implemented
    [from implementer's report]

    ## Plan Or Requirements
    [Task group or final implementation requirements]

    ## Review Range
    BASE_SHA: [commit before task/group]
    HEAD_SHA: [current commit]

    ## Workflow Profile Summary
    [PROFILE_SUMMARY: generated-doc policy, path policy, branch policy, execution strategy, and testing intensity when relevant]

    Check:
    - Established patterns, naming, organization, and maintainability
    - Error handling, type safety, defensive programming, security, and performance risks
    - Test coverage and quality
    - Whether each file has one clear responsibility with a well-defined interface
    - Whether units are decomposed so they can be understood and tested independently
    - Whether the implementation follows the file structure from the plan
    - Whether new or modified files became too large because of this change
    - User-facing product naming: prefer `SuperDuperPowers`; allow `superpowers:*`, `using-superpowers`, and `.opencode/plugins/superduperpowers.js` only as compatibility identifiers
    - Whether implementation honors testing intensity and avoids obvious tests that only assert imported constants or implementation details
    - Whether branch/worktree code avoids hidden branch changes, pushes, merges, resets, or destructive cleanup

    Always acknowledge what was done well before highlighting issues.

    Report:
    ## Code Review
    Result: Approved | Changes Required
    Strengths:
    - Brief note on what was done well.
    Findings:
    - [Critical|Important|Suggestions] `path:line` - Issue and required fix.
```
