# Design System - Material Learning Converter

## Product Context

This is a workbench for deep reading. The user brings one source material, then the product turns it into a visible structure, a learning path, active practice, and a review loop.

The interface must feel like a focused study instrument, not a course marketplace, chat toy, or abstract dashboard.

## Product Promise

```text
Input material -> Retrieve structure -> Convert to learning path -> Practice and review
```

Every screen should answer three questions quickly:

- What material am I working on?
- What is the system doing with it now?
- What is the one next action?

## Aesthetic Direction

Quiet, precise, and work-focused. Use a light editorial workbench style with restrained color, visible structure, and direct task language.

Avoid:

- Decorative hero sections after the user is inside the app.
- Dense nested card stacks.
- Playful gimmicks in the main learning flow.
- Long explanatory paragraphs where a state, result, or action would be clearer.

## Typography

- Display: system sans, bold, compact line height.
- Body: system sans, readable line height.
- Labels: small uppercase only for section identity, not marketing decoration.
- Data and step numbers: monospace only where it helps scanning.

## Color

- Background: near-white green-gray.
- Surface: true white and soft green-gray.
- Primary action: muted mint.
- Secondary action: white with mint text.
- Information: soft blue.
- Risk or warning: warm amber.
- Error: muted red.

Color should communicate state and action priority. It should not become a decorative gradient theme.

## Layout

- Logged-out first viewport: promise, sample start, and a minimal account path.
- Logged-in workspace: no hero. Show next action, flow state, then the work surface.
- Desktop: input, retrieval, and learning can sit side by side; review/history stays lower priority.
- Mobile: one clear vertical task sequence, with no horizontal overflow.

## Component Rules

- Primary button appears once per task area.
- Empty states must include the next useful action when one exists.
- Inputs show readiness, not just a blank box.
- Generated results should be inspectable before the next transformation step.
- Review/history should not compete with the current material task.

## Motion

Use only subtle hover and state feedback. No decorative motion in the core learning flow.

## App-Store-Readiness Heuristics

This project is not App Store ready until these are true:

- A first-time user can start a full sample lesson in one click.
- The product category is understandable in the first viewport.
- The logged-in workspace always exposes one primary next action.
- The source material, retrieval result, learning activity, and review state are visually separated.
- Mobile layout is a designed sequence, not a compressed desktop dashboard.
- The core loop has automated smoke tests and browser-level QA evidence.
