# Tracster

Tracster is a web application for dance and performance associations to plan rehearsals, manage choreographies, schedule representations and events, and collect participant availability.

## Stack

- **Frontend & API:** [Next.js](https://nextjs.org/) (App Router, React, TypeScript)
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io/)
- **Auth:** Email/password with secure HTTP-only session cookies
- **UI:** Responsive layout for desktop and mobile

## Features

- **Users & roles** — `USER`, `ADMIN`, and `OWNER`. Admins and owners can manage members; only the owner can transfer ownership.
- **Choreographies** — create pieces, assign choreographers and participants, and optionally split participants into **groups**.
- **Repetitions** — schedule rehearsals for a whole choreography or a specific group.
- **Representations** — schedule performances and attach choreographies to them (shown on the schedule).
- **Events** — general association events with their own participant lists.
- **Availability** — participants mark each repetition as available, unavailable, or maybe.
- **Unavailability** — members record personal timeframes they cannot attend; the calendar selection is date-accurate.
- **Conflict warnings** — when scheduling a repetition, choreographers are warned if participants are already engaged or marked unavailable.
- **Join & visibility** — choreographies and events can allow free join, join requests (accept/decline), and hiding from non-participants.

## Core workflow

1. A user creates a **choreography** and becomes a choreographer on it.
2. Choreographers add other choreographers, **assign participants**, and optionally create **groups**.
3. They can let others **join** or **request to join**, and choose whether the piece is hidden from non-participants.
4. A choreographer schedules a **repetition** (date, time, optional location and group). Conflict warnings appear if the audience is already booked or unavailable.
5. Assigned participants respond with **availability** (available, unavailable, maybe) and can maintain a personal **unavailability** calendar.
6. Choreographers (or admins) schedule **representations** and attach choreographies, and can also create standalone **events**.
7. The home **schedule** shows repetitions, representations, and events the user is involved in.

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
| alice@example.com | Owner | password123 |
| bob@example.com | Admin | password123 |
| claire@example.com | User / participant | password123 |

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
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/users` | List users / create user (admin) |
| GET / PATCH | `/api/users/:id` | User details / update |
| PATCH | `/api/users/:id/role` | Change role |
| POST | `/api/users/transfer-ownership` | Transfer owner role |
| GET / POST | `/api/choreographies` | List / create choreographies |
| GET / PATCH | `/api/choreographies/:id` | Details / update (including join & visibility) |
| POST / DELETE | `/api/choreographies/:id/members` | Assign or remove participant |
| POST / DELETE | `/api/choreographies/:id/choreographers` | Add or remove choreographer |
| GET / POST | `/api/choreographies/:id/groups` | List / create groups |
| PATCH / DELETE | `/api/choreographies/:id/groups/:groupId` | Update or delete group |
| POST | `/api/choreographies/:id/join` | Join as participant |
| POST / PATCH / DELETE | `/api/choreographies/:id/join-requests` | Request, accept, or withdraw join |
| GET / POST / DELETE | `/api/choreographies/:id/representations` | Link choreographies to representations |
| POST | `/api/choreographies/:id/repetitions` | Schedule repetition |
| POST | `/api/choreographies/:id/repetitions/conflicts` | Preview participant conflicts |
| GET / PATCH / DELETE | `/api/repetitions/:id` | Repetition details / update / delete |
| POST | `/api/repetitions/:id/availability` | Submit availability |
| GET / POST | `/api/representations` | List / create representations |
| GET / PATCH / DELETE | `/api/representations/:id` | Representation details / update / delete |
| GET / POST / DELETE | `/api/representations/:id/choreographies` | Attach or detach choreographies |
| GET / POST | `/api/events` | List / create events |
| GET / PATCH / DELETE | `/api/events/:id` | Event details / update / delete |
| POST / DELETE | `/api/events/:id/participants` | Assign or remove participants |
| POST | `/api/events/:id/join` | Join event |
| POST / PATCH / DELETE | `/api/events/:id/join-requests` | Request, accept, or withdraw join |
| GET / POST | `/api/users/me/unavailability` | List / create unavailability |
| PATCH / DELETE | `/api/unavailability/:id` | Update or delete unavailability |

## Data model

- **User** — association members (`USER`, `ADMIN`, `OWNER`)
- **Choreography** — a piece being rehearsed (join and visibility settings)
- **ChoreographyChoreographer** — users who can edit and manage
- **ChoreographyMember** — assigned participants
- **ChoreographyJoinRequest** — pending join requests
- **ChoreographyGroup** / **ChoreographyGroupMember** — subsets of participants; repetitions can target a group
- **RepetitionEvent** — a scheduled rehearsal
- **AvailabilityResponse** — participant response per repetition
- **UserUnavailability** — personal unavailable timeframes
- **Representation** — a performance date
- **ChoreographyRepresentation** — choreographies on a representation
- **Event** / **EventParticipant** / **EventJoinRequest** — association events and attendance

## Next steps

Possible future extensions:

- Export / sync to Google Calendar
- Stronger repetition scheduling tools
- Email notifications for new repetitions
- Recurring repetitions
- Mobile-friendly push reminders

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
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
