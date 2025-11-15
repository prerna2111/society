## Society Connect MERN

Modern, full-stack recreation of the Society Connect housing society management platform built with a React frontend and Express + MongoDB backend. It replicates the functionality and design language of the original Django application while meeting the specified JavaScript OOP requirements.

### Features

- Secure authentication with role-based dashboards for owners, tenants, committee members, security staff, and admins.
- Virtual notice board with audience targeting, pinning, and email notifications.
- Maintenance billing with breakdowns, due dates, and payment tracking.
- Complaint management with prioritisation, assignment, and status workflows.
- Community polls with live voting analytics.
- Visitor scheduling and security desk check-in/out tracking.
- Simulated Razorpay-style maintenance payments and payment reconciliation.
- Admin member directory for role management and activation control.

### Tech Stack

- **Frontend:** React + Vite, React Router, React Bootstrap, custom EventBus + ApiClient ES6 classes, Recharts.
- **Backend:** Node.js, Express 5, MongoDB with Mongoose, JWT auth, Nodemailer, Helmet, Compression, CORS, Morgan.
- **Tooling:** npm, Vite dev server, Nodemon.

### Project Structure

```
backend/
  src/
    config/        # Mongo connection, request logging
    controllers/   # Auth, notices, maintenance, complaints, polls, visitors, payments, dashboard
    middleware/    # Authentication, authorisation, error handling
    models/        # Mongoose schemas
    routes/        # API route definitions
    services/      # Email notifications
    utils/         # ApiError, async wrapper, JWT helpers
  env.sample       # Backend environment variables

frontend/
  src/
    components/    # Layout, notification center
    context/       # Auth provider using ApiClient + EventBus classes
    hooks/         # Event bus hook
    pages/         # Dashboard, Notices, Maintenance, Complaints, Polls, Visitors, Payments, Users, Login
    services/      # ApiClient ES6 class for fetch-based API calls
    utils/         # EventBus ES6 class for custom events
  env.sample       # Frontend environment variables
```

### Prerequisites

- Node.js (Current release) + npm
- MongoDB (local instance or cloud connection string)

### Backend Setup

```bash
cd backend
cp env.sample .env         # update Mongo URI, JWT secret, and mail settings
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. The first administrator can be created once via:

```bash
curl -X POST http://localhost:4000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Admin","lastName":"User","email":"admin@society.local","password":"StrongPass123","flatNumber":"A-101"}'
```

Subsequent users can be added through the web UI or the authenticated `/api/auth/register` endpoint.

### Frontend Setup

```bash
cd frontend
cp env.sample .env          # ensure VITE_API_URL matches backend URL
npm install
npm run dev
```

Vite serves the UI on `http://localhost:5173`. The app uses `fetch()` under the hood (via `ApiClient`) and custom events (via `EventBus`) to satisfy the OOP requirements.

### Testing the Flow

1. Start MongoDB locally (default `mongodb://127.0.0.1:27017`).
2. Run the backend (`npm run dev`) and bootstrap an admin as shown above.
3. Start the frontend (`npm run dev`) and log in with the admin credentials.
4. Use the admin dashboard to add members, create notices, maintenance bills, polls, schedule visitors, and simulate payments.
5. Log in as owners/tenants/security to experience role-specific dashboards and permissions.

### Next Steps

- Integrate a real payment gateway (e.g., Razorpay) by extending `Payment` controller logic.
- Configure production-ready email transport (currently uses Nodemailer SMTP settings).
- Deploy the frontend (Netlify/Vercel) and backend (Render/Heroku/DigitalOcean) with environment variables aligned to hosting environments.

For reference design inspiration, see the original [Society Connect repository](https://github.com/adwait-hegde/society-connect) by Adwait Hegde and Yash Jagtap.

