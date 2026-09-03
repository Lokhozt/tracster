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
- **Rehearsals** — schedule rehearsals for a whole choreography or a specific group.
- **Representations** — schedule performances and attach choreographies to them (shown on the schedule).
- **Demonstrations** — schedule showcases linked to choreographies, with their own participant lists.
- **Competitions** — schedule competitions with their own participant lists.
- **Festivals** — schedule festivals with their own participant lists, not linked to choreographies.
- **Events** — general association events with their own participant lists.
- **Availability** — participants mark each rehearsal as available, unavailable, or maybe.
- **Unavailability** — members record personal timeframes they cannot attend; the calendar selection is date-accurate.
- **Conflict warnings** — when scheduling a rehearsal, choreographers are warned if participants are already engaged or marked unavailable.
- **Join & visibility** — choreographies and events can allow free join, join requests (accept/decline), and hiding from non-participants.
- **Account** — members can update their name and phone, and connect a personal Google calendar for rehearsals.
- **Google Calendar** — one-way sync from Tracster. Shared association events (everything except rehearsals) go to one Google calendar; each member can copy their own rehearsals to a personal calendar. Unavailability stays in the app.

## Core workflow

1. A user creates a **choreography** and becomes a choreographer on it.
2. Choreographers add other choreographers, **assign participants**, and optionally create **groups**.
3. They can let others **join** or **request to join**, and choose whether the piece is hidden from non-participants.
4. A choreographer schedules a **rehearsal** (date, time, optional location and group). Conflict warnings appear if the audience is already booked or unavailable.
5. Assigned participants respond with **availability** (available, unavailable, maybe) and can maintain a personal **unavailability** calendar.
6. Choreographers (or admins) schedule **representations** and **demonstrations** and attach choreographies, and can also create **competitions**, **festivals**, and standalone **events**.
7. The home **schedule** shows rehearsals, representations, and events the user is involved in.
8. Members can update their **name and phone** and connect a personal Google calendar on **Account**. The owner connects the association calendar in **Settings**.

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

### Google Calendar sync

Create a Google Cloud OAuth 2.0 **Web application** client with the Google Calendar API enabled.
Under **Authorized redirect URIs**, add the callback path for every origin you use (exact match,
no trailing slash):

```text
http://localhost:3000/api/google-calendar/callback
http://127.0.0.1:3000/api/google-calendar/callback
```

If you open the app from the LAN URL shown by `npm run dev` (for example `http://192.168.1.50:3000`),
add that origin’s callback as well. Do not put these URLs under Authorized JavaScript origins.

Then configure:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CALENDAR_CLIENT_ID="..."
GOOGLE_CALENDAR_CLIENT_SECRET="..."
SESSION_SECRET="a-long-random-production-secret"
GOOGLE_ASSOCIATION_CALENDAR_ID="...@group.calendar.google.com"
GOOGLE_ASSOCIATION_CALENDAR_TIMEZONE="Europe/Paris"
```

`GOOGLE_ASSOCIATION_CALENDAR_ID` is the public calendar shown by **Follow association's calendar**
on the schedule, account, and settings pages (a calendar id, or a full Google embed URL). Make that
calendar public in Google Calendar so members can open it.

The owner connects the association calendar under **Settings**. It receives every future event except
rehearsals. Each member can connect a personal calendar on **Account** to copy their upcoming
rehearsals. Sync is one-way from Tracster; personal unavailability is never sent to or read from
Google.

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
| GET / PATCH | `/api/users/:id` | User details / update (admin) |
| GET / PATCH | `/api/users/me` | Current user profile / update name and phone |
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
| POST | `/api/choreographies/:id/rehearsals` | Schedule rehearsal |
| POST | `/api/choreographies/:id/rehearsals/conflicts` | Preview participant conflicts |
| GET / PATCH / DELETE | `/api/rehearsals/:id` | Rehearsal details / update / delete |
| POST | `/api/rehearsals/:id/availability` | Submit availability |
| GET / POST | `/api/representations` | List / create representations |
| GET / PATCH / DELETE | `/api/representations/:id` | Representation details / update / delete |
| GET / POST / DELETE | `/api/representations/:id/choreographies` | Attach or detach choreographies |
| GET / POST | `/api/events` | List / create events |
| GET / PATCH / DELETE | `/api/events/:id` | Event details / update / delete |
| GET / POST / DELETE | `/api/events/:id/choreographies` | Attach or detach choreographies (representations and demonstrations) |
| POST / DELETE | `/api/events/:id/participants` | Assign or remove participants |
| POST | `/api/events/:id/join` | Join event |
| POST / PATCH / DELETE | `/api/events/:id/join-requests` | Request, accept, or withdraw join |
| GET / POST | `/api/users/me/unavailability` | List / create unavailability |
| PATCH / DELETE | `/api/unavailability/:id` | Update or delete unavailability |
| GET | `/api/google-calendar/connect` | Start Google OAuth (`kind=association` or `kind=user`) |
| GET | `/api/google-calendar/callback` | OAuth callback |
| GET | `/api/google-calendar/calendars` | List writable calendars for the connected account |
| PATCH / DELETE | `/api/google-calendar/connection` | Change destination calendar / disconnect |
| POST | `/api/google-calendar/sync` | Re-copy upcoming events for the connection |

## Data model

- **User** — association members (`USER`, `ADMIN`, `OWNER`)
- **Choreography** — a piece being rehearsed (join and visibility settings)
- **ChoreographyChoreographer** — users who can edit and manage
- **ChoreographyMember** — assigned participants
- **ChoreographyJoinRequest** — pending join requests
- **ChoreographyGroup** / **ChoreographyGroupMember** — subsets of participants; rehearsals can target a group
- **RehearsalEvent** — a scheduled rehearsal
- **AvailabilityResponse** — participant response per rehearsal
- **UserUnavailability** — personal unavailable timeframes
- **EventType** — includes immutable kinds: Event, Rehearsal, Representation, Competition, Demonstration, Festival
- **Event** / **EventChoreography** / **EventParticipant** / **EventJoinRequest** — scheduled items, linked pieces, and attendance
- **GoogleCalendarConnection** — association or per-user OAuth tokens and destination calendar
- **GoogleCalendarEvent** — mapping from a Tracster event to a Google event on a connection

## Next steps

Possible future extensions:

- Stronger rehearsal scheduling tools
- Email notifications for new rehearsals
- Recurring rehearsals
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

### Google Calendar `Error 400: redirect_uri_mismatch`

The URI Tracster sends must appear **exactly** on the OAuth client’s **Authorized redirect URIs**
list. Google’s error page shows “The redirect URI in the request”. Copy that value into the
client and save.

Common mismatches: registering only the site origin (`http://localhost:3000`), using `https` for
local dev, mixing `localhost` and `127.0.0.1`, or using the Network IP from `npm run dev` without
adding that IP’s callback URI. Changes in Google Cloud can take a minute to apply.
