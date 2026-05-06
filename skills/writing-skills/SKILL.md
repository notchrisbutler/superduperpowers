---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
metadata:
  category: maintainer
---

# Writing Skills

## Overview

**Writing skills is Test-Driven Development applied to process documentation.** Write pressure scenarios, watch agents fail without the skill, write or edit the skill, verify agents comply with it, then refactor loopholes.

**Core principle:** if you did not watch an agent fail without the skill, you do not know whether the skill teaches the right thing.

**Required background:** understand `test-driven-development` before using this skill. The same RED → GREEN → REFACTOR discipline applies to documentation.

Personal skills live in the active harness's documented skill directory. Project-specific conventions belong in repo instructions such as `AGENTS.md`, not reusable skills.

## What Is A Skill?

A skill is a reusable reference guide for proven techniques, patterns, or tools.

**Skills are:** reusable techniques, patterns, tools, reference guides.

**Skills are not:** one-off narratives, standard practices already well documented elsewhere, project-only conventions, or mechanical constraints better enforced by validation.

## When To Create Or Edit A Skill

Create or edit when:
- The technique was not intuitively obvious.
- You would reference it again across projects.
- The pattern applies broadly and others would benefit.
- Current skill behavior fails under realistic pressure.

Do not create or edit when the need is one-off, project-specific, already covered by official docs, or enforceable with a deterministic script or validator.

## Iron Law And Editing Safety

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to new skills and edits to existing skills.

Write or edit a skill before testing? If it is only your own current skill-edit work and no user or other-agent changes are mixed in, delete that current-task change and start over. If user changes, other-agent changes, or unrelated work are mixed in, stop and ask before deleting, reverting, or rewriting anything.

No exceptions: not for simple additions, documentation updates, reference tweaks, or batching multiple skills. Do not keep untested changes as “reference,” and do not adapt untested text while running tests.

## Skill Shape

Directory structure:

```text
skills/
  skill-name/
    SKILL.md              # required main reference
    references/*.md       # heavy examples/checklists only when needed
    scripts/*             # deterministic tools only when helpful
```

Frontmatter requirements:
- `name`: letters, numbers, and hyphens only.
- `description`: starts with “Use when...”, third-person, trigger conditions only, no workflow summary, under 500 characters when possible.
- Keep all frontmatter within the active skill specification limits; validate before completion.

Keep inline: triggers, gates, safety rules, short checklists, core patterns, and small examples. Move heavy examples, long checklists, benchmark details, or reusable tool instructions to `references/` or script help.

Use deterministic scripts only for repeated mechanical checks whose output can be validated with exit codes, files, or stable text. Keep judgment-heavy workflow decisions in prose.

## Agent Search Optimization

Descriptions decide whether future agents load the skill. Describe **when to use** the skill, not what workflow it performs. A workflow-summary description can cause agents to follow the summary instead of reading the skill.

Inline ASO rules:
- Start with `Use when...`.
- Include concrete triggers, symptoms, error text, tools, file types, and synonyms agents might search for.
- Describe the problem, not a narrow implementation symptom, unless the skill is technology-specific.
- Use third person and active, descriptive skill names.
- Never summarize the skill process or promise outcomes in the description.
- Avoid `@` file links to other skills; use plain skill names with explicit requirement markers such as `**REQUIRED SUB-SKILL:** Use test-driven-development`.

For extended examples/details, read [ASO examples and rationalization hardening](references/aso-examples-and-hardening.md) when this extra detail is needed.

### Description Optimization Routing

When tuning whether a skill triggers for realistic prompts:
- Build representative queries in `evals/evals.json`.
- Use `skill_eval` for trigger checks and `skill_improve_description` or `skill_optimize_loop` when optimizing descriptions.
- Use `skill_generate_report` or `skill_serve_review` so a human can inspect representative eval behavior.
- Do not optimize solely for trigger rate if it causes over-triggering or behavior shortcuts.

## Flowcharts, Examples, And Organization

Use flowcharts only for non-obvious decisions, process loops where agents might stop too early, or “when to use A vs B” choices. Use tables/lists for reference material and Markdown/code blocks for linear instructions or copyable examples. See `graphviz-conventions.dot` and `render-graphs.js` only when rendering diagrams is useful.

One excellent complete, runnable, well-commented example beats many mediocre examples. Choose the most relevant language and avoid multi-language dilution, fill-in-the-blank templates, contrived examples, or narrative session stories.

## Testing Skills

Test every skill type with scenarios that match its purpose:
- **Discipline skills:** academic questions, pressure scenarios, combined pressures, rationalization capture.
- **Technique skills:** application scenarios, variations, missing-information tests.
- **Pattern skills:** recognition, application, and counter-example scenarios.
- **Reference skills:** retrieval, application, and gap tests.

Success means an agent uses the skill correctly under realistic pressure, not merely that the document reads clearly.

## RED-GREEN-REFACTOR For Skills

**RED:** Run pressure scenarios without the skill. Document baseline behavior and verbatim rationalizations.

**GREEN:** Write the minimal skill or edit that addresses the observed failures. Run the same scenarios with the skill and verify compliance.

**REFACTOR:** When agents find new loopholes, add explicit counters and retest until the important pressure cases pass.

Use `testing-skills-with-subagents.md` for pressure-scenario methodology when needed.

## Bulletproofing Discipline Skills

Discipline-enforcing skills must explicitly close loopholes. Capture rationalizations from baseline testing and counter them in the skill. Add red flags that tell the agent when to stop, and make destructive recovery rules safe: delete/rewrite only the agent's own current-task changes when they can be isolated; otherwise stop and ask.

For extended examples/details, read [ASO examples and rationalization hardening](references/aso-examples-and-hardening.md) when this extra detail is needed.

## Mandatory Skill Creation Checklist

Use the active harness's todo-tracking tool for each checklist item.

**RED**
- [ ] Create realistic pressure scenarios; use 3+ combined pressures for discipline skills.
- [ ] Run scenarios without the skill and document baseline behavior verbatim.
- [ ] Identify failure patterns and rationalizations.

**GREEN**
- [ ] Write minimal skill content addressing observed failures.
- [ ] Validate frontmatter, name, description, and Markdown shape.
- [ ] Keep trigger conditions and immediate gates inline.
- [ ] Add keywords for search without summarizing workflow in description.
- [ ] Run scenarios with the skill and verify agents comply.

**REFACTOR**
- [ ] Add explicit counters for new rationalizations.
- [ ] Re-run targeted scenarios until important behavior passes.
- [ ] Remove redundant text and move heavy detail to references.

**Deployment and eval**
- [ ] Run skill validation before declaring completion.
- [ ] Run representative evals from `evals/evals.json` when behavior or triggering is affected.
- [ ] Use `skill_serve_review` for human review of representative eval outputs when optimizing or comparing skill behavior.
- [ ] Document project-local verification performed.
- [ ] Commit only when the project owner or approved workflow explicitly requests it.

For extended examples/details, read [deployment and eval checklists](references/deployment-and-eval-checklists.md) when this extra detail is needed.

## Stop Before Moving To Another Skill

After writing or editing any skill, stop and complete validation/eval/deployment checks for that skill before starting the next one. Batching unverified skills is the documentation equivalent of deploying untested code.

## Bottom Line

Creating skills is TDD for process documentation: RED baseline failure, GREEN minimal guidance, REFACTOR loopholes, then validated deployment.
