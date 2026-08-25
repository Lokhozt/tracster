# Tracster

Tracster is a web application for dance and performance associations to plan rehearsals, manage choreographies, and collect participant availability.

## Stack

- **Frontend & API:** [Next.js](https://nextjs.org/) (App Router, React, TypeScript)
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io/)
- **Auth:** Email/password with secure HTTP-only session cookies

## Core workflow

1. A user creates a **choreography** and becomes a choreographer on it.
2. Choreographers can add other choreographers and **assign participants** from the user base.
3. A choreographer schedules a **repetition** (date, time, optional location).
4. Assigned participants respond with **availability** (available, unavailable, maybe).
5. Choreographers view repetition details and see who is available.

## Getting started

### Prerequisites

- **Node.js 20+** (22 LTS recommended — Prisma 7 will not run on Node 12/14/16)
- Docker (for local PostgreSQL)

Check your version:

```bash
node --version   # must be v20.0.0 or higher
```

If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm install` in the project root (see `.nvmrc`).

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Run migrations and generate Prisma client
npm run db:migrate
npm run db:generate

# 5. (Optional) Load demo data
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

After running the seed script, you can sign in with:

| Email | Role | Password |
|-------|------|----------|
| alice@example.com | Creator / choreographer | password123 |
| bob@example.com | Choreographer | password123 |
| claire@example.com | Participant | password123 |

## Project structure

```
src/
  app/              # Pages and API routes
  components/       # UI components
  lib/              # Auth, database, permissions, validation
prisma/
  schema.prisma     # Data model
  seed.ts           # Demo data
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/choreographies` | List choreographies |
| POST | `/api/choreographies` | Create choreography |
| GET | `/api/choreographies/:id` | Choreography details |
| POST | `/api/choreographies/:id/members` | Assign participant |
| POST | `/api/choreographies/:id/choreographers` | Add choreographer |
| POST | `/api/choreographies/:id/repetitions` | Schedule repetition |
| GET | `/api/repetitions/:id` | Repetition details |
| POST | `/api/repetitions/:id/availability` | Submit availability |

## Data model

- **User** — association members
- **Choreography** — a piece being rehearsed
- **ChoreographyChoreographer** — users who can edit and manage
- **ChoreographyMember** — assigned participants
- **RepetitionEvent** — a scheduled rehearsal
- **AvailabilityResponse** — participant response per repetition

## Next steps

Possible future extensions:

- Email notifications for new repetitions
- Calendar view across choreographies
- Role-based admin for the association
- Recurring repetitions
- Mobile-friendly push reminders

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Open Prisma Studio |

## Troubleshooting

### `SyntaxError: Unexpected token '.'` when running `npm run db:migrate`

This means your shell is using an old Node.js (often v12 from the system package manager). Prisma 7 requires Node 20+.

Fix:

```bash
node --version          # if below v20, upgrade Node
nvm install 22 && nvm use   # with nvm
# or install from https://nodejs.org/
```

Then rerun `npm run db:migrate`.
