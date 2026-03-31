# K-PAI Web

K-PAI (Korean Private AI) community seminar management platform. Handles seminar RSVP, waitlist, check-in, attendance tracking, and membership email notifications.

## Tech Stack

### Backend

- **FastAPI** + **Uvicorn** (async Python web framework)
- **SQLAlchemy 2.0** with async support (`aiosqlite` + SQLite)
- **JWT** authentication (`PyJWT`)
- **bcrypt** password hashing via `passlib`
- SMTP email delivery (Mailhog for local dev)

### Frontend

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **React Router 7** (SPA routing)
- **TanStack React Query 5** (server state management)
- **Axios** (HTTP client)
- **Styled Components** (CSS-in-JS)
- **qrcode.react** (QR code generation for check-in tokens)

### Infrastructure

- **Docker Compose** (multi-container orchestration)
- **Nginx** (frontend reverse proxy)
- **Mailhog** (local SMTP mock server)

## Getting Started

### Prerequisites

- Docker & Docker Compose

### Run

```bash
docker compose up --build
```

| Service  | URL                      | Description             |
|----------|--------------------------|-------------------------|
| Frontend | http://localhost:3001     | React SPA               |
| Backend  | http://localhost:8000     | FastAPI (Swagger at `/docs`) |
| Mailhog  | http://localhost:8025     | Email testing web UI    |

### Environment Variables

**Backend** (`be/.env`):

```env
PORT=8000
ALLOWED_ORIGINS=http://localhost:3001
SECRET_KEY=<password-hash-pepper>
JWT_SECRET=<jwt-signing-secret>
ALGORITHM=HS256
TOKEN_LIFETIME_MINUTE=120
STAFF_CODE=<code-for-staff-registration>
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@k-pai.org
```

**Frontend** (`fe/.env`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Project Structure

```
kpai-web/
├── be/                          # FastAPI backend
│   ├── src/
│   │   ├── config/              # DB, env, CORS settings
│   │   ├── model/               # SQLAlchemy models
│   │   ├── schema/              # Pydantic request/response schemas
│   │   ├── service/             # Business logic layer
│   │   ├── route/v1/            # API route handlers
│   │   ├── util/                # Email, datetime, security helpers
│   │   └── middleware/          # CORS middleware
│   ├── data/                    # SQLite DB file (volume-mounted)
│   ├── requirements.txt
│   └── Dockerfile
├── fe/                          # React frontend
│   ├── src/
│   │   ├── apis/                # Axios instance & endpoint definitions
│   │   ├── pages/               # Page components
│   │   ├── components/          # Shared components (Header, Footer)
│   │   ├── router/              # Route definitions
│   │   └── utils/               # DateTime utilities
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Database Models

- **User** &mdash; email (unique), username, password (nullable for temp accounts), role (`member` | `staff`), `is_temporary`, `full_member_email_sent`
- **Seminar** &mdash; title, description, start/end time, location, max_capacity, host, cover_image, rsvp_enabled, waitlist_enabled
- **SeminarRSVP** &mdash; links user to seminar, tracks `checked_in` status and timestamp
- **SeminarWaitlist** &mdash; FIFO queue per seminar, auto-promoted when RSVP slots open
- **CheckInToken** &mdash; UUID-based token with expiry for time-boxed check-in sessions

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Path          | Auth     | Description                  |
|--------|---------------|----------|------------------------------|
| POST   | `/auth/login` | &mdash;  | Login, returns JWT token     |

### Users

| Method | Path                  | Auth     | Description                              |
|--------|-----------------------|----------|------------------------------------------|
| GET    | `/users`              | Required | Get current user profile                 |
| PUT    | `/users`              | Required | Update current user                      |
| POST   | `/users`              | &mdash;  | Register new user                        |
| DELETE | `/users`              | Required | Delete (withdraw) current user           |
| POST   | `/users/set-password` | &mdash;  | Set password for temporary account       |
| GET    | `/users/list`         | Staff    | List all users (admin view)              |

### Seminars

| Method | Path                                          | Auth     | Description                              |
|--------|-----------------------------------------------|----------|------------------------------------------|
| GET    | `/seminars`                                   | &mdash;  | List all seminars                        |
| GET    | `/seminars/{id}`                              | &mdash;  | Seminar detail with RSVP & waitlist      |
| POST   | `/seminars`                                   | Staff    | Create seminar                           |
| PUT    | `/seminars/{id}`                              | Staff    | Modify seminar                           |
| DELETE | `/seminars/{id}`                              | Staff    | Delete seminar                           |
| POST   | `/seminars/{id}/rsvp`                         | Required | RSVP (auto-waitlist if full)             |
| DELETE | `/seminars/{id}/rsvp`                         | Required | Cancel RSVP (auto-promotes waitlist)     |
| DELETE | `/seminars/{id}/waitlist`                     | Required | Cancel waitlist entry                    |
| POST   | `/seminars/{id}/checkin-token`                | Staff    | Create check-in token with duration      |
| GET    | `/seminars/{id}/checkin-token`                | Staff    | Get active check-in token                |
| DELETE | `/seminars/{id}/checkin-token`                | Staff    | Stop check-in session                    |
| PATCH  | `/seminars/{id}/users/{user_id}/checkin`      | Staff    | Manually toggle user check-in            |
| POST   | `/seminars/{id}/reminder`                     | Staff    | Send reminder email to all RSVPs         |

### Check-in

| Method | Path         | Auth     | Description                        |
|--------|--------------|----------|------------------------------------|
| POST   | `/check-in`  | Required | Token-based check-in               |

### CSV Import

| Method | Path              | Auth  | Description                            |
|--------|-------------------|-------|----------------------------------------|
| POST   | `/import/{id}`    | Staff | Import attendees from CSV file         |

### System

| Method | Path                      | Auth     | Description        |
|--------|---------------------------|----------|--------------------|
| GET    | `/system/healthcheck`     | &mdash;  | Health check       |

## Key Features

### RSVP & Waitlist

Seminars have configurable max capacity. When full and `waitlist_enabled` is true, additional RSVPs are placed on a FIFO waitlist. When someone cancels their RSVP, the first waitlisted person is automatically promoted and notified via email.

### Token-based Check-in

Staff creates a time-limited check-in token (UUID) for a seminar. The frontend displays the token as a QR code. Attendees scan and check in. Tokens can be stopped manually or expire automatically.

### CSV Import

Staff uploads a CSV file containing attendee data. The system matches users by email:

- **Existing user found** &rarr; links RSVP record to that user
- **No match** &rarr; creates a temporary user (no password, `is_temporary=true`) and links the RSVP

Temporary users can later set a password via the sign-up page to claim their account.

### Membership Email

When a user accumulates 2 or more seminar check-ins, the system automatically sends a K-PAI full membership congratulation email. The `full_member_email_sent` flag on the User model prevents duplicate sends. This triggers from check-in via token, manual staff toggle, and CSV import.

### Email Notifications

The platform sends three types of email:

1. **Membership congratulation** &mdash; auto-triggered on 2nd check-in
2. **Seminar reminder** &mdash; staff-triggered, sent to all RSVPed users with seminar details
3. **Waitlist promotion** &mdash; auto-triggered when a waitlisted user is promoted to confirmed RSVP

### Staff Admin

Staff users (registered with a `STAFF_CODE`) can access `/admin` to view all users with their registration date, role, temporary status, and membership email status.

## Frontend Pages

| Route           | Page              | Description                                |
|-----------------|-------------------|--------------------------------------------|
| `/`             | MainPage          | Landing page                               |
| `/signin`       | SignInPage         | Email + password login                     |
| `/signup`       | SignUpPage         | Registration (with temp account detection) |
| `/seminar`      | SeminarListPage   | Browse all seminars                        |
| `/seminar/:id`  | SeminarDetailPage | Detail, RSVP, check-in, CSV upload, reminder |
| `/check-in`     | CheckInPage       | Token-based check-in                       |
| `/admin`        | AdminPage         | Staff-only user management                 |

## License

Private project for K-PAI community use.
