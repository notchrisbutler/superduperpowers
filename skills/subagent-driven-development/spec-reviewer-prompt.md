# Spec Compliance Reviewer Prompt Template

Use named `spec-reviewer` when available. Use this fallback template when named agents are unavailable.

Fallback alignment: this prompt is for harnesses that cannot dispatch the canonical named reviewer agent from `agents/`. Preserve the corresponding canonical reviewer behavior and output priorities when adapting this prompt.

Orchestration boundary: Do not spawn, dispatch, or coordinate any other subagents. The main agent remains the coordinator and owns todos, branch decisions, commits, reviews, validation gates, and next-step routing. Report any split, follow-up worker, or reviewer recommendations to the main coordinator; the main coordinator decides.

**Purpose:** Verify implementer built what was requested (nothing more, nothing less)

```
Generic worker or inline fallback prompt:
  description: "Review spec compliance for Task N"
  prompt: |
    You are reviewing whether an implementation matches its specification.

    ## What Was Requested

    [FULL TEXT of task requirements]

    ## What Implementer Claims They Built

    [From implementer's report]

    ## Workflow Profile Summary

    [PROFILE_SUMMARY: generated-doc policy, path policy, branch policy, execution strategy, and testing intensity when relevant]

    ## CRITICAL: Do Not Trust the Report

    The implementer's report may be incomplete, inaccurate, or optimistic.
    You MUST verify everything independently.

    **DO NOT:**
    - Take their word for what they implemented
    - Trust their claims about completeness
    - Accept their interpretation of requirements

    **DO:**
    - Read the actual code they wrote
    - Compare actual implementation to requirements line by line
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify:

    **Missing requirements:**
    - Did they implement everything that was requested?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?

    **Extra/unneeded work:**
    - Did they build things that weren't requested?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" that weren't in spec?

    **Misunderstandings:**
    - Did they interpret requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Validation evidence:**
    - Were required tests, commands, or manual validations run?
    - Treat missing validation as a spec issue when the plan required it.

    **Provided context compliance when in scope:**
    - Verify generated docs policy, docs path policy, branch policy, execution strategy, and testing intensity were followed when those requirements are part of the plan or context summary.
    - Flag user-facing `Superpowers` product naming unless it is a compatibility identifier such as `superpowers:*`, `using-superpowers`, a file path, plugin filename, or attribution/history reference.

    **Verify by reading code, not by trusting report.**

    Report:
    ## Spec Review

    Result: Approved | Changes Required

    Findings:
    - [Critical|Important|Minor] `path:line` - Issue and required fix.

    Coverage Notes:
    - Brief note on what matched the spec.
```
