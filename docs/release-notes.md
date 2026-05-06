**SuperDuperPowers 2026.5.6** tightens full-workflow execution after dogfood feedback from 2026.5.5-3. This release adds explicit loop termination, re-evaluation gates, frontend design guidance, and context-budget discipline across the canonical skills and OpenCode agent definitions.

## Highlights

- Added a new `frontend-design` support skill for responsive, accessible, codebase-native UI work.
- Added explicit re-evaluation gates so workers stop after repeated failed attempts instead of cycling between variants.
- Added placeholder-seam guidance for major unresolved decisions: preserve independent progress without pretending blocked behavior is complete.
- Added context-discipline guidance for compact worker handoffs, cache-friendly prompt structure, and evidence-based summaries.
- Updated brainstorming, planning, execution, debugging, TDD, implementer, and plan-writer guidance to carry the new guardrails.
- Updated OpenCode policy tests so future drift removes these guardrails only intentionally.
- Deleted the local dogfood feedback log after folding its findings into the workflow source.

## Loop Termination And Re-Evaluation

The core execution rule is now explicit: one failed attempt can produce a revised hypothesis; two failed attempts in the same scope force re-evaluation against the spec or plan.

For light changes, the coordinator may update the plan/spec note and continue autonomously. For major design, dependency, architecture, data-model, security, or product decisions, the workflow now tells agents to stop silent decision-making, ask the user, or create a minimal explicit placeholder seam while completing independent work that remains valid.

This affects:

- `using-superpowers`
- `writing-plans`
- `subagent-driven-development`
- `executing-plans`
- `systematic-debugging`
- `test-driven-development`
- `implementer` and `tdd-implementer`
- fallback implementer prompt templates

The goal is to prevent loops such as “try approach A, revert, try B, revert, return to A” without losing useful progress.

## Frontend Design

The new `frontend-design` skill is loaded when work includes web/app UI, visual design, interaction design, frontend components, responsive layout, screenshots, or user-facing screens.

It requires agents to inspect the existing UI groundwork before proposing visual changes: design tokens, CSS variables, component libraries, typography, spacing, icon systems, assets, page structure, and nearby screens. It also makes visual quality concrete by requiring responsive behavior, accessibility states, interaction states, real assets/data where applicable, and manual or screenshot validation for major UI changes.

The skill explicitly avoids common AI-generated UI defaults:

- Purple/blue gradient defaults
- Glassy floating-card layouts without product rationale
- Oversized rounded cards and decorative blobs
- Vague centered hero copy
- Uniform spacing and flat hierarchy
- New palettes, fonts, libraries, or visual systems that ignore the current codebase

The guidance is based on current web.dev responsive/accessibility guidance and established open design-system practices from GitHub Primer, Shopify Polaris, IBM Carbon, and GOV.UK Design System.

## Context And Token Discipline

The suite now treats large context windows as capacity, not permission to dump everything into every worker prompt.

New guidance tells agents to:

- Keep stable workflow rules in skills and agent definitions.
- Put repeated project conventions in specs, plans, or profile summaries instead of every dispatch prompt.
- Send workers only the assigned task, acceptance criteria, exact file ownership, relevant evidence, and validation commands.
- Prefer file paths and focused excerpts over full transcript or full-file dumps.
- Put static instructions before dynamic task data to improve provider-side prompt caching.
- Checkpoint decisions and evidence at parent task boundaries so later work does not depend on memory.

This aligns the workflow with current OpenAI prompt caching/context guidance and Anthropic Claude guidance around compacting, prompt caching, explicit instructions, and long-running agentic work.

## Agent Alignment

Named OpenCode agents now mirror the same behavior:

- `brainstorming-facilitator` audits frontend systems and changes tactics after repeated discovery failures.
- `plan-writer` includes re-evaluation gates, safe placeholder seams, frontend validation, and compact worker handoffs.
- `implementer` stops after two failed attempts in the same scope and reports evidence instead of cycling.
- `tdd-implementer` stops after repeated failed red/green attempts and reports the failed approaches.

Fallback prompts were updated so harnesses without named agents keep the same bounded behavior.

## Documentation And Tests

Documentation updates:

- README now lists frontend design guidance and the repeated-failure re-evaluation rule.
- Workflow map now includes `frontend-design`, loop guardrails, and compact handoff expectations.
- OpenCode install notes mention bounded-attempt behavior in quick-flow verification.

Validation updates:

- `tests/opencode/test-agent-skill-drift.sh` checks the new loop, context, and frontend-design guardrails.
- `tests/opencode/test-workflow-policy.sh` checks the broadened re-evaluation policy text.

Verified locally:

```bash
npm run context:check
tests/opencode/test-agent-skill-drift.sh
tests/opencode/run-tests.sh
```
