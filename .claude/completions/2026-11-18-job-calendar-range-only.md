# Range-only calendar correction

Implemented the requested correction so month-calendar Sites entries require a valid explicit job date period. Shift-only jobs remain visible in day detail assignments but no longer create Sites chips.

Focused tests, typecheck, changed-file lint, and an independent read-only critic review passed. Production Worker `f8275756-2164-4c18-9a32-6c6b3254e4ce` is deployed and public endpoint checks returned HTTP 200.
