# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is a **CV ATS Generator** web app called "BuatCV" — a free tool that helps users create professional ATS-friendly resumes by filling out a simple step-by-step form.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/cv-ats)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components

## Features

- Multi-step CV builder form (Personal Info, Summary & Skills, Work Experience, Education, Extra Sections, Review)
- ATS-optimized CV preview with clean HTML output — section headings bilingual (English or Indonesian per CV)
- ATS Readiness Score in the Review step — checklist of 11 key completeness checks with visual progress bar
- Custom extra CV sections for certifications, awards, organizations, projects, training, publications, etc.
- Live side-by-side CV preview that updates as the user types
- Print/Download as PDF via browser print
- Save and manage multiple CVs
- Edit existing CVs
- Bilingual UI (Indonesian / English toggle in navbar) via LanguageContext + i18n.ts
- Bilingual CV documents: each CV stores a `cvLanguage` ("en" or "id") that controls section heading language in the generated HTML/PDF
- Free to use, no account required


## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run build:vercel` — build frontend for Vercel deployment
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/cv-ats run dev` — run frontend locally

## Vercel Deployment

The project is configured for Vercel with full frontend + serverless API:

- **Frontend**: React/Vite static build → `artifacts/cv-ats/dist/`
- **Serverless API**: `api/index.ts` wraps the Express app, routed via `/api/*`
- **SPA routing**: All non-API routes rewrite to `index.html`
- **Config**: `vercel.json` at root
- **Build command (Vercel)**: `pnpm build:vercel`
- **Output directory (Vercel)**: `artifacts/cv-ats/dist`

### Environment Variables (required on Vercel)
- `DATABASE_URL` — PostgreSQL connection string (e.g. from Neon, Supabase, etc.)

## Routes

- `/` — Landing page
- `/cv` — List of saved CVs
- `/cv/new` — Multi-step CV builder form
- `/cv/:id` — CV detail/preview with print button
- `/cv/:id/edit` — Edit existing CV

## API Endpoints

- `GET /api/cv` — List all CVs
- `POST /api/cv` — Create new CV
- `GET /api/cv/:id` — Get CV by ID
- `PATCH /api/cv/:id` — Update CV
- `DELETE /api/cv/:id` — Delete CV
- `GET /api/cv/:id/html` — Get CV as HTML for preview/print

## DB Schema

- Development PostgreSQL database is provisioned and synced with Drizzle schema.
- `cvs` table: id, fullName, email, phone, location, jobTitle, summary, skills (jsonb), languages (jsonb), workExperience (jsonb), education (jsonb), extraSections (jsonb), linkedinUrl, portfolioUrl, createdAt, updatedAt

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
