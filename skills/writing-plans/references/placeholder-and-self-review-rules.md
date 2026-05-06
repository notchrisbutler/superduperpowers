# Placeholder And Self-Review Rules

This reference expands the placeholder, repeated-failure, and self-review guidance for `writing-plans`. The main skill contains the immediate gates.

## Placeholder Failures

These are plan failures:

- `TBD`, `TODO`, `implement later`, `fill in details`.
- “Add appropriate error handling,” “add validation,” or “handle edge cases” without concrete cases and code.
- “Write tests for the above” without actual test code or precise assertions.
- “Similar to Task N” when the worker may read tasks out of order.
- Steps that describe what to do without showing how when code changes are required.
- References to types, functions, methods, commands, files, or config that are never defined in the plan.

## Allowed Discovery Substeps

Discovery is allowed only when the architecture decision is already made but exact codebase geography needs one bounded lookup.

Allowed:

```markdown
Run `rg -n "401|403|UNAUTHORIZED" src/notifiers` and use the file containing the existing HTTP error mapping in Step 2.
```

Not allowed:

```markdown
Figure out where this goes.
```

The discovery step must include:
- Exact command or file-read target.
- Expected kind of output.
- How the output feeds the next step.

## Re-Evaluation And Placeholder Seams

Plans must prevent workers from cycling through variants:

- After two failed implementation attempts in one task scope, the worker reports failed approaches and evidence instead of trying a third variant.
- The coordinator owns spec/plan updates and user escalation.
- Light approach updates are allowed only when they preserve the approved design.
- Major design, dependency, architecture, data-model, security, or product decisions go back to the user.

Placeholder seams may preserve independent progress, but they must be explicit, minimal, and testable. They are appropriate for integration boundaries, feature flags, adapter interfaces, or disabled UI states. They are not allowed to fake completed behavior.

## Expanded Self-Review Checklist

Run this yourself after writing the complete plan and before asking for user approval or reviewer help.

1. **Spec coverage:** Skim each spec section and requirement. Can you point to a task that implements it? Add missing tasks.
2. **Placeholder scan:** Search for the failure phrases above. Replace them with concrete instructions, code, commands, or explicit bounded discovery.
3. **Type consistency:** Check method names, property names, task outputs, filenames, schemas, and signatures across tasks.
4. **Execution shape:** Confirm the plan supports flat harness todos such as `Task 0`, `Task 1.1 - dispatch`, `Task 1 Review`, `Review`, and `Finalize`.
5. **Loop prevention:** Confirm repeated failed attempts, escalation points, and any safe placeholder seams are explicit.
6. **Context budget:** Confirm each worker can execute from a compact handoff without needing the full conversation.
7. **Frontend quality:** When applicable, verify existing UI patterns, visible states, responsive/accessibility checks, screenshots/manual validation, and anti-generic constraints are explicit.

If you find issues, fix them inline. No separate self-review approval is needed after the fix, but user plan approval is still required before execution.
