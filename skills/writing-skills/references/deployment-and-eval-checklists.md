# Deployment And Eval Checklists

This reference expands deployment, benchmark, and eval details for `writing-skills`. The main skill contains the mandatory gates; use this file when preparing a fuller skill-quality run.

## Skill Creation Checklist

Create active-harness todos for each relevant checklist item.

### RED Phase

- [ ] Create pressure scenarios. For discipline skills, combine at least three pressures such as time pressure, sunk cost, authority pressure, or exhaustion.
- [ ] Run scenarios without the skill.
- [ ] Capture exact baseline behavior and rationalizations verbatim.
- [ ] Identify patterns the skill must counter.

### GREEN Phase

- [ ] Use a hyphenated lowercase name with letters, numbers, and hyphens only.
- [ ] Write valid YAML frontmatter with required `name` and `description` fields.
- [ ] Ensure description starts with `Use when...`, is third person, and states triggers only.
- [ ] Add searchable terms throughout the body.
- [ ] Include a clear overview and core principle.
- [ ] Address the observed RED failures.
- [ ] Keep small code/examples inline; move heavy reference or tools to separate files.
- [ ] Run the same scenarios with the skill and confirm compliance.

### REFACTOR Phase

- [ ] Identify new rationalizations from testing.
- [ ] Add explicit counters and red flags for discipline skills.
- [ ] Build or update a rationalization table from all test iterations.
- [ ] Remove redundant wording.
- [ ] Re-test until important cases pass.

### Quality Checks

- [ ] Run `skill_validate` on the skill directory.
- [ ] Confirm supporting files are only for tools, heavy examples, or heavy references.
- [ ] Confirm no narrative storytelling or project-only details were added.
- [ ] Confirm flowcharts are used only for non-obvious decisions.
- [ ] Confirm examples are high-quality and not diluted across many languages.

## Representative Eval Workflow

Use representative evals when trigger behavior, routing, discipline, or important workflow behavior changes.

1. Add or update realistic queries in `evals/evals.json`.
2. Run trigger checks with `skill_eval` when evaluating description behavior.
3. Use `skill_improve_description` or `skill_optimize_loop` only when the failure pattern is description-trigger related.
4. Generate review artifacts with `skill_generate_report` or launch human review with `skill_serve_review`.
5. Inspect both false negatives and false positives; do not optimize by making descriptions overly broad.

## Benchmark And Human Review Notes

For optimization comparisons, keep old-skill and with-skill outputs separated so reviewers can compare behavior. A common layout is:

```text
<workspace>/<eval-name>/old_skill/outputs/
<workspace>/<eval-name>/with_skill/outputs/
```

Then aggregate and review:

```text
skill_aggregate_benchmark(...)
skill_serve_review(...)
```

Use `skill_serve_review` for human review of representative eval output before declaring behavior-preserving optimization complete.

## Deployment Gate

Before moving on:

- [ ] Validation passed or blockers are documented.
- [ ] Representative evals were run when behavior or triggering changed.
- [ ] Human review was performed when optimizing descriptions or comparing skill behavior.
- [ ] Verification evidence is recorded.
- [ ] Commits are made only when explicitly requested by the user or approved workflow.

Never batch several unverified skill edits and call them complete together.
