---
name: frontend-design
description: Use when SuperDuperPowers work includes web/app UI, visual design, interaction design, frontend components, responsive layout, or user-facing screens.
metadata:
  category: guidance
---

# Frontend Design

## Overview

Make frontend work feel intentional, grounded in the product, and native to the existing codebase. This skill is a support skill for `brainstorming`, `writing-plans`, `subagent-driven-development`, and `executing-plans`; it is not a standalone route.

Use current project UI patterns first. Add visual novelty only when it fits the product, audience, and existing system.

## Research Basis

This workflow follows stable guidance from:

- web.dev responsive and accessible design guidance: flexible layouts, user zoom, content-driven breakpoints, semantic HTML, keyboard access, sufficient contrast, reduced motion, and real-device viewport checks.
- Established open-source design systems such as GitHub Primer, Shopify Polaris, IBM Carbon, and GOV.UK Design System: cohesive foundations, documented component usage, accessible defaults, repeatable patterns, and context-specific product fit.
- Modern frontier-model frontend prompting guidance: specify desired hierarchy, contrast, balance, movement, states, and interactions explicitly; do not rely on generic "make it modern" prompts.

## When To Use

Use this skill when the request includes:

- A page, app, dashboard, landing page, form, modal, navigation, component library, or visual refresh.
- User-facing copy/layout choices that affect comprehension or trust.
- Responsive behavior, accessibility, interaction states, animation, or frontend polish.
- Screenshots, mockups, design-system migration, or "make this look better" work.

Do not use this skill for backend-only work, CLI tools, tests with no visible UI, or tiny copy edits unless the copy changes interface behavior.

## Design Discovery

Before designing or coding UI:

1. Identify the product type and audience: operational tool, marketplace, consumer app, game, marketing site, docs, admin console, or internal workflow.
2. Inspect existing UI foundations: design tokens, component library, CSS variables, typography, spacing, icon system, layout patterns, and repeated components.
3. Audit nearby screens before inventing patterns. Reuse existing components when they are sound.
4. Decide the screen's job: scan, compare, create, decide, consume, configure, recover from error, or complete a transaction.
5. Name the primary and secondary actions, plus empty, loading, error, disabled, hover/focus, and narrow-viewport states.
6. For ambiguous visual direction, present 2-3 design approaches with trade-offs before writing a spec or code.

## Anti-Generic UI Rules

Avoid the common AI-generated look:

- Do not default to purple/blue gradients, glassy floating cards, oversized rounded cards, vague hero copy, centered text blocks, uniform spacing everywhere, or decorative blobs.
- Do not make all elements the same visual weight. Establish hierarchy through scale, density, alignment, contrast, and proximity.
- Do not introduce a new palette, font stack, animation style, or component library when the codebase already has a coherent groundwork.
- Do not turn operational tools into marketing pages. SaaS/admin/productivity surfaces should be dense, quiet, legible, and optimized for repeated work.
- Do not hide real product content behind atmospheric stock imagery, blurred screenshots, or abstract decoration.

Positive direction:

- Pick a visual language that belongs to the product domain.
- Use real data, product imagery, screenshots, or generated bitmap assets when visual assets are needed.
- Keep page sections unframed unless a card is representing a repeated item, modal, or genuinely framed tool.
- Use familiar controls: icons for tool buttons, segmented controls for modes, toggles for booleans, sliders/inputs for numeric values, menus for option sets, tabs for views, and clear buttons for commands.
- Keep component dimensions stable so labels, hover states, icons, and dynamic content do not shift layout.

## Accessibility And Responsiveness

Frontend specs and plans must include:

- Semantic HTML and correct labels for controls.
- Keyboard reachability and visible focus states.
- Color contrast that does not rely on hue alone.
- Support for user zoom; do not disable zoom.
- Content-driven breakpoints instead of device-specific assumptions.
- Reduced-motion handling for nonessential animation.
- Touch target sizing and spacing for mobile.
- Loading, empty, error, disabled, and long-content states.

When practical, validate with browser screenshots or manual checks at mobile and desktop widths. For complex interactive or canvas/3D work, verify the rendered pixels are nonblank and correctly framed.

## Spec And Plan Requirements

When `brainstorming` writes a UI spec, include:

- Existing design-system audit: what to reuse, extend, or avoid.
- Page/component responsibility and information hierarchy.
- Layout behavior at mobile and desktop widths.
- Interaction states and accessibility requirements.
- Visual assets needed and their source.
- Explicit anti-generic constraints for palette, typography, spacing, cards, and decoration.
- Validation checks, including responsive and accessibility checks.

When `writing-plans` writes a UI implementation plan, include:

- Exact files for components, styles, tests, and routes.
- Existing tokens/classes/components to reuse.
- Screens and states to implement.
- Browser/manual verification steps.
- Screenshot or visual validation instructions for major UI changes.
- A re-evaluation gate if the existing UI groundwork cannot support the approved design without a major dependency or architecture decision.

## Re-Evaluation Gate

If UI implementation starts to drift from the existing codebase or fails twice in the same screen/component:

1. Stop changing styles by trial and error.
2. Compare the current render against the approved spec and existing design system.
3. Decide whether the issue is a small styling gap, missing component abstraction, missing asset/data, or a larger design-system decision.
4. For a small styling gap, update the local plan/spec note and continue.
5. For a larger decision, add placeholder code or a clearly marked visual fallback only where it preserves the rest of the work, finish independent implementation, and report the decision needed.

Do not keep swapping palettes, layouts, or component libraries without an updated design rationale.
