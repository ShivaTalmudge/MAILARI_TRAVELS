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
- **Prisma ORM** for type-safe database access
- **MySQL** as the primary relational database
- **JWT** (JSON Web Tokens) for stateless authentication
- **Zod** for request payload validation
- **Bcrypt** for secure password hashing

## Architecture Highlights
This application enforces strict security and architectural patterns:
1. **Server-Side Pricing Engine:** Clients cannot dictate prices. Fares are calculated dynamically on the server based on `vehicleType` and `tripType` utilizing a centralized `PricingService`.
2. **Booking State Machine:** A robust finite state machine controls booking transitions (`CONFIRMED` -> `DRIVER_ASSIGNED` -> `TRIP_STARTED` -> `TRIP_COMPLETED`). Invalid transitions are blocked at the controller layer.
3. **Layered Architecture:** Controllers parse requests, Services execute domain logic, and Prisma handles persistence.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)

### 1. Database Setup
1. Create a MySQL database (e.g., `mailaritravels`).
2. Update the `DATABASE_URL` in `server/.env`.

### 2. Server Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your local/production credentials
npm run prisma:generate
npm run prisma:push
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
cp .env.example .env
# Ensure VITE_API_URL points to your server (default: http://localhost:5000/api)
npm run dev
```

### 4. Default Admin User
Run the database seed script to populate default data, including the admin user:
```bash
cd server
npm run prisma:seed
```
**Admin Credentials:**
- **Email:** admin@mailari.com
- **Password:** Admin@123

---

## Production Deployment (Hostinger Web Apps)

### Preparing the Build
1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. Build the backend:
   ```bash
   cd server
   npx tsc
   ```

### Hostinger Configuration
- Upload the `server/dist` folder alongside your `package.json` and `prisma` folder to your Hostinger Web App root.
- Run `npm install --production` and `npx prisma generate` on the server.
- Serve the `client/dist` folder using a static web server or host it on Hostinger's standard web hosting panel.
- Ensure your `.env` secrets on Hostinger match your production environment.
