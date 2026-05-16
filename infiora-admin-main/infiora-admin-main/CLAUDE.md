# Infiora Admin Panel — CLAUDE.md

## Stack
- Next.js (Pages Router), TypeScript
- Redux Toolkit (RTK Query) for API calls
- Located at `src/`

## Routing (Pages Router — `src/pages/`)
| Route | Purpose |
|-------|---------|
| `/login` | Admin login |
| `/hotels` | Hotel list + management |
| `/rooms` | Room list + management |
| `/users` | User management |
| `/tickets` | Support tickets |
| `/account` | Account settings |

## State management (`src/redux/`)
- `store.ts` — Redux store setup
- `api/` — RTK Query API slices
- `features/` — Redux slices for local state

## Key files
| File | Purpose |
|------|---------|
| `src/pages/_app.tsx` | App wrapper with Redux provider |
| `src/pages/ReduxProvider.tsx` | Redux Provider component |
| `src/redux/store.ts` | Store configuration |

## Notes
- This is the super-admin panel, not the hotel-staff dashboard (that's `infiora-dash-main`)
- Uses Pages Router (not App Router), so no `layout.tsx` — wrapping is done in `_app.tsx`
