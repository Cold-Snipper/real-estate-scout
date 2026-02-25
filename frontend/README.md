# Immo Snippy — Frontend

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · pnpm

## Quick start

```bash
cd frontend
pnpm install
pnpm dev
```

App runs at **http://localhost:3000**. The backend API must be running at **http://localhost:8000** (see root `start.sh`).

## Routes

| Path | Description |
|------|-------------|
| `/login` | Login page |
| `/signup` | Signup page |
| `/` | Dashboard overview |
| `/crm` | CRM — lead and contact management |
| `/available` | Available listings browser |
| `/settings` | User / app settings |

## Stack

- **Framework:** Next.js 16, App Router, React 19
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix UI primitives)
- **Forms:** react-hook-form + zod
- **Charts:** Recharts
- **Icons:** Lucide React
- **Package manager:** pnpm

## Key files

```
frontend/
├── app/
│   ├── (dashboard)/        # Authenticated layout group
│   │   ├── page.tsx        # Dashboard home
│   │   ├── crm/            # CRM page
│   │   ├── available/      # Listings page
│   │   └── settings/       # Settings page
│   ├── login/page.tsx
│   └── signup/page.tsx
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── app-sidebar.tsx
│   ├── dashboard.tsx
│   ├── crm-page.tsx
│   ├── available-listings-page.tsx
│   └── ...
└── next.config.mjs
```

## Environment

Create a `.env.local` in this folder if you need to override API endpoints:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```
