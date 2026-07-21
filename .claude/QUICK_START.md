# Quick Start Commands

---

## Development

```bash
npm run dev      # Start dev server (vite)
npm run test     # Run tests (vitest run)
npm run build    # Build for production
npm run lint     # eslint .
npm run format   # prettier --write .
```

## Database

Supabase project — migrations live under `supabase/migrations` (check `ls supabase` if absent). RLS policies gate all portal data; check policy on any table before assuming access works.

---

**Last Updated**: 2026-07-22
