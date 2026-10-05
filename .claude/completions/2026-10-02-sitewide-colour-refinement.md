# Site-wide colour refinement

Implemented the approved site-wide colour refinement without changing layout or behaviour.

## Changes

- Added muted semantic tokens for status, schedule actions, role colours, job colours, and avatars.
- Refined common Tailwind supporting hues so light and dark themes feel less bright and pastel.
- Updated site status badges/cards, calendar actions, role/job chips, staff compliance states, weather indicators, third-party portal states, navigation, help/contact panels, and avatar presets.
- Replaced broken `.light-theme_&` selectors and hard-coded help/contact theme colours.
- Kept the existing cream light theme, charcoal dark theme, and burnt-orange brand accent.

## Validation

- `npm run typecheck` passes.
- `npm run build` passes.
- Changed-file Prettier check passes.
- Changed-file ESLint has no errors; remaining output is existing warning-level debt.
- Semantic foreground/background pairs were checked for WCAG AA contrast.
