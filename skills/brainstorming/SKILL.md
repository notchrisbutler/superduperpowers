---
name: brainstorming
description: "Use when the user explicitly asks for SuperDuperPowers brainstorming or when a request clearly needs design discovery, decomposition, or an approved spec before implementation."
metadata:
  category: guidance
---

# Brainstorming Ideas Into Designs

Help turn ideas into approved designs and specs through collaborative discovery.

<HARD-GATE>
Once this skill is intentionally selected, do NOT invoke any implementation skill, write code, scaffold a project, or take implementation action until you have presented a design and the user has approved it.
</HARD-GATE>

## When To Use

Use for explicit SuperDuperPowers brainstorming requests and work that clearly needs design discovery before implementation. Do not use for quick flow, small reviews, wording edits, simple config tweaks, bounded code changes, or no-SuperDuperPowers work unless the user asks for brainstorming.

If the request includes UI, frontend components, page layout, interaction design, visual polish, or screenshots, also use `frontend-design` as a support skill while exploring and writing the spec.

Keep brainstorming replies concise and user-facing: ask the next useful question or present the current design section. Do not append route explanations, review notes, or lists of skipped implementation actions unless the user asks why the workflow chose this route or there is a safety concern.

## Agent Dispatch

When named agents are available and isolated context helps, dispatch `brainstorming-facilitator` with the user request, compact workflow profile, relevant project context, docs policy, and an explicit “may write approved spec, must not implement code” instruction.

Keep direct collaboration in the main session when the design is small, the user is actively answering questions, or dispatch would obscure approval gates.

## Required Flow

Create and complete tasks in this order when this skill is selected:

1. Read compact workflow context with `sdp_settings`/`sdp_profile` only when needed for unknown docs, branch, commit, question, or test policy.
2. Explore current project context: files, docs, recent commits, existing patterns.
3. Ask clarifying questions one topic at a time until ambiguity is low enough to write a useful spec.
4. Propose 2-3 approaches with trade-offs and a recommendation grounded in project evidence or explicit assumptions.
5. Present the design in sections scaled to complexity and get user approval after each section.
6. Write the approved design to `{DOCS_ROOT}/{SDP_DOCS_DIR}/specs/YYYY-MM-DD-<topic>-design.md` unless user preferences override.
7. Self-review the spec for placeholders, contradictions, scope, ambiguity, and frontend quality when applicable; fix issues inline.
8. Ask the user to review the written spec and wait for approval.
9. Record the approved spec path in the workflow profile or explicit handoff context.
10. Transition to `writing-plans`; do not invoke implementation skills from brainstorming.

For extended examples/details, read [brainstorming flow details](references/brainstorming-flow-details.md) when this extra detail is needed.

## Discovery Rules

- Assess scope before detailed questions. If the request spans independent subsystems, decompose into sub-projects and brainstorm the first sub-project through its own spec → plan → implementation cycle.
- Ask only one question per message. Prefer multiple choice when possible, but use open-ended questions when needed.
- Focus on purpose, constraints, success criteria, data flow, error handling, testing, and operational boundaries.
- For frontend work, inspect current design system, component library, CSS variables/tokens, typography, spacing, assets, routes, page structure, and comparable screens before proposing visual changes.

## Approach And Design Rules

- Always propose 2-3 approaches before settling.
- Lead with your recommendation and reasoning.
- If evidence is thin, say what is unknown before recommending.
- If deferring work, identify a concrete successor artifact or task. If no successor exists, ask whether to add the work to this spec or create a follow-up artifact.
- Design for small units with clear responsibilities, interfaces, dependencies, and test boundaries.
- In existing codebases, follow established patterns and include only targeted improvements that serve the current goal.

## Design Approval Gate

When presenting the design:
- Cover architecture, components, data flow, error handling, and testing.
- For frontend work, also cover information hierarchy, responsive behavior, interaction states, accessibility, real asset/data usage, and anti-generic visual constraints from `frontend-design`.
- Ask after each section whether it looks right so far.
- Revise until the user approves the design before writing the spec.

## Spec Review And User Review Gate

After writing the spec:
- Scan for `TBD`, `TODO`, incomplete sections, vague requirements, contradictions, scope problems, and ambiguous requirements.
- For frontend specs, verify existing UI patterns, responsive/accessibility requirements, interaction states, visual assets, and what to avoid are named.
- Fix issues inline.

Then ask:

> "Spec written to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

Wait for the user's response. If they request changes, update the spec and re-run self-review. Only proceed after approval.

After approval, re-read live settings, record the spec path, and respect generated-doc policy. Do not commit or force-add generated specs unless live settings, repo instructions, or the user explicitly require it.

## Transition

The only next workflow skill after approved brainstorming is `writing-plans`. When execution begins later, replace brainstorming todos with the executor's compact, dependency-ordered task list; do not carry nested brainstorming todos into implementation.

## Key Principles

- One question at a time.
- Multiple choice preferred when practical.
- YAGNI ruthlessly.
- Explore alternatives.
- Get incremental approval.
- Be flexible and clarify when something does not make sense.
