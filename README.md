# Mailari Travels — Commercial Platform

A full-stack, scalable commercial travel and fleet management platform designed for Indian travel operations.

## Architecture & Tech Stack

### Frontend
- **React 18** with Vite
- **TypeScript** for end-to-end type safety
- **Tailwind CSS** for responsive styling
- **React Hook Form & Zod** for client-side form validation
- **Lucide React** for modern iconography
- **Zustand** for lightweight state management
- **Axios** for API communication

### Backend
- **Node.js** with **Express.js**
- **TypeScript** with strict compiler checks
- **mysql2** with raw parameterized SQL for database access (no ORM)
- **MySQL** as the primary relational database
- **JWT** (JSON Web Tokens) for stateless authentication
- **Zod** for request payload validation
- **Bcrypt** for secure password hashing

## Architecture Highlights
This application enforces strict security and architectural patterns:
1. **Server-Side Pricing Engine:** Clients cannot dictate prices. Fares are calculated dynamically on the server based on `vehicleType` and `tripType`.
2. **Booking State Machine:** A finite state machine controls booking transitions (`CONFIRMED` -> `DRIVER_ASSIGNED` -> `TRIP_STARTED` -> `TRIP_COMPLETED`). Invalid transitions are blocked at the controller layer.
3. **Layered Architecture:** Controllers parse requests and validate access; the mysql2 connection pool (`server/src/config/db.ts`) handles persistence via parameterized queries.
4. **SQL migrations, not an ORM:** Schema changes live as sequential files in `database/migrations/`, applied by a small runner script — see below.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)

### 1. Database Setup
1. Create a MySQL database (e.g., `mailaritravels`).
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` (or the discrete `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_PORT` variables).
3. Apply the schema:
   ```bash
   npm run db:migrate
   ```
   This runs every file under `database/migrations/` in order and tracks what's been applied in a `schema_migrations` table, so it's safe to re-run after pulling new migrations.

### 2. Server Setup
```bash
cd server
npm install
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
npm run dev
```

### 4. Seeding accounts

**Development** — demo admin/driver/customer accounts (all password `password123`):
```bash
npm run db:seed:dev
```
This refuses to run when `NODE_ENV=production`.

**Production** — create a real admin account with your own credentials (never a checked-in password):
```bash
ADMIN_EMAIL=you@company.com ADMIN_MOBILE=9999999999 ADMIN_PASSWORD='a-strong-password' npm run db:create-admin
```

---

## Production Deployment (Hostinger Web Apps)

### Preparing the Build
From the repo root:
```bash
npm run build
```
This builds the client (`client/dist`) and compiles the server (`server/dist`).

### Hostinger Configuration
1. Upload the repo (excluding `.git`, `node_modules`, and any `.env*` file) to the Hostinger Web App root. `.gitignore` already excludes these from version control.
2. Set environment variables in the Hostinger Node app panel — see `.env.example` / `server/.env.example` for the full list (database, `JWT_SECRET`, `CLIENT_URL`, SMTP, WhatsApp, upload directory, rate limits). Do not reuse any placeholder value from the example files.
3. Run `npm run install:all` (or let Hostinger's build step run `npm install`, which triggers `postinstall`).
4. Apply the schema: `npm run db:migrate`.
5. Create the first admin account: `npm run db:create-admin` (see above) — do **not** run `db:seed:dev` in production.
6. Set the app's start command to `node server.js` (the root `server.js` requires the compiled `server/dist/index.js`). In production the server also serves `client/dist` as static files and handles SPA routing for non-`/api` paths.
7. Verify `GET /api/health` (process liveness) and `GET /api/health/ready` (confirms the database is actually reachable) both return 200 before pointing traffic at the app.
