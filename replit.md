# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── pharmatel/          # PharmaTel Expo mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## PharmaTel App (artifacts/pharmatel)

A patient medication management mobile app built with Expo + React Native.

### Features
- Login screen with AsyncStorage token persistence
- Today's medications dashboard with progress tracking
- Prescription schedule list with expandable dose times
- Mark dose as taken with personal note
- Medication detail screen (dose, frequency, food requirement, adherence)
- Upcoming doses notification UI
- Symptom diary (observation sessions with numeric/boolean/text entries)

### Structure
- `app/_layout.tsx` - Root layout with providers (AppProvider, QueryClient, etc.)
- `app/index.tsx` - Auth redirect
- `app/login.tsx` - Login screen
- `app/(tabs)/` - Tab screens: Today, Schedule, Upcoming, Profile
- `app/dose/[id].tsx` - Dose detail modal
- `app/medicine/[id].tsx` - Medication detail screen
- `app/observation/[doseId].tsx` - Symptom diary screen
- `context/AppContext.tsx` - Global state (auth, prescriptions, observations)
- `models/index.ts` - TypeScript interfaces
- `services/mockData.ts` - Mock patient data
- `services/storage.ts` - AsyncStorage API
- `utils/time.ts` - Time formatting utilities
- `components/` - Reusable UI components

### Demo Credentials
- Username: john.doe
- Password: password123

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
