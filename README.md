# Onboardly

A multi-tenant user onboarding and administration platform with role-based access control, organization management, impersonation, and a full audit trail.

Built with **ASP.NET Core** + **PostgreSQL** (EF Core) on the backend and a **React 19 + TypeScript** SPA on the frontend.

---

## Features

- **Authentication & sessions** — cookie-based auth using an HTTP-only, SameSite cookie with a sliding 7-day expiry. Accounts are admin-created (no public self-registration).
- **User management** — create, edit, deactivate, and delete users with a server-driven data table (pagination, sorting, search). Assign users to organizations via a searchable, server-backed lookup.
- **Multi-tenancy** — first-class organizations with automatic tenant isolation (global EF Core query filters), tenant resolution per request, and organization switching for platform admins.
- **Roles & permissions** — three-layer authorization (platform → organization RBAC → resource/policy) with fine-grained, permission-based policies. Organization-scoped and shared/global roles.
- **Impersonation** — super admins can securely sign in as another user, with a visible banner and one-click stop.
- **Audit trail** — automatic change tracking (create/update/delete with old/new values, sensitive fields redacted) plus explicit login/impersonation events, with a searchable audit viewer.
- **Dashboard** — user and organization metrics, with a platform-wide aggregate view for global admins.
- **Internationalization** — English & French, including localized error messages. Light/dark theme.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | ASP.NET Core, Entity Framework Core, PostgreSQL (Npgsql) |
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS v4 |
| State/Data | TanStack Query, Zustand, Axios |
| i18n       | i18next / react-i18next |
| Auth       | Cookie-based (HTTP-only), claims + permission policies |
| Deployment | Docker Compose, Nginx (static client) |

## Project Structure

```
onboardly/
├── client/                 # React + Vite SPA
│   └── src/
│       ├── components/      # Reusable UI (FormInput, FormSelect, AppButton, DataTable, …)
│       ├── pages/           # Route pages (Login, Dashboard, Users, Roles, …)
│       ├── lib/             # API client, query hooks, i18n
│       ├── store/           # Zustand stores (auth)
│       └── locales/         # en.json / fr.json
├── server/                 # ASP.NET Core API
│   ├── Controllers/        # Auth, Users, Roles, Permissions, Organizations, Audit, Dashboard, Platform
│   ├── Authorization/      # Permission policies, tenant context, resource handlers
│   ├── Data/               # AppDbContext, DbSeeder
│   ├── Dtos/               # Request/response records
│   ├── Infrastructure/     # AuditInterceptor, DataTableBuilder
│   ├── Migrations/         # EF Core migrations (applied on startup)
│   ├── Models/             # Entities (User, Organization, Role, Permission, AuditLog)
│   ├── Repositories/       # Data-access abstractions
│   └── Services/           # Auth, session, audit services
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (matching the server target)
- [Node.js](https://nodejs.org/) + [Yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (local) or Docker

### Local development

1. Configure the database connection in `server/appsettings.Development.json` (the `DefaultConnection` connection string).

2. From the repository root, start both the API and the client:

   ```bash
   yarn dev
   ```

   This builds the server, then runs the API (`dotnet watch`) and the Vite dev server together.

   The client dev server runs at **http://localhost:5174** and proxies API calls to the backend. EF Core migrations are applied automatically on startup and the database is seeded on first run.

Alternatively, run each side on its own:

```bash
yarn dev:server   # API only (dotnet watch)
yarn dev:client   # client only (Vite)
```

### Default demo account

On first run a global platform-admin demo user is seeded:

| Email                 | Password       |
|-----------------------|----------------|
| `demo@onboardly.dev`  | `your_password` |

> Change or remove this account before any non-local deployment.

## Docker

The stack ships with Docker Compose (PostgreSQL, API, and an Nginx-served client build).

1. Copy the environment template and set a database password:

   ```bash
   cp .env.example .env
   # edit .env and set DB_PASSWORD (and image tags if running published images)
   ```

2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

   The client is served at **http://localhost:9000**.

## Configuration

- **Connection string** — `ConnectionStrings:DefaultConnection` (via `appsettings*.json` or the `ConnectionStrings__DefaultConnection` environment variable in Docker).
- **Database password** — `DB_PASSWORD` in `.env` (used by both Postgres and the server connection string in Compose).
- **CORS dev origins** — `Cors:DevOrigins` in server configuration (defaults to the Vite dev port).

## Email Notifications

An extensible email framework (`server/Services/Email/`) renders Razor (`.cshtml`) templates and delivers them through a configurable provider and delivery mode. Business code simply calls `IEmailService` — delivery is dispatch-and-forget, so email failures never break the request.

**Building blocks**

- `IEmailService` — domain API (e.g. `SendAccountCreatedAsync`); builds the model, renders, and dispatches.
- `IEmailSender` — routes each message by **delivery mode** (Sync = send inline, Queue = hand off to the background processor).
- `IEmailProvider` — pluggable delivery: `Log` (dev default, no real send) and `Smtp` (Mailtrap / any SMTP server). SendGrid, SES, Mailgun, etc. can be added without touching callers.
- `IEmailRenderer` — renders embedded Razor templates via RazorLight (`_Layout.cshtml` + per-email templates), with organization/brand customization.
- `IEmailQueue` + `EmailQueueProcessor` — in-process background queue with retries and failed-delivery logging; the queue seam allows swapping in Hangfire, a Worker Service, or a message broker (RabbitMQ / Azure Service Bus) later.

**Configuration** (`Email` section):

```jsonc
"Email": {
  "Mode": "Sync",            // Sync | Queue
  "Provider": "Log",         // Log | Smtp
  "FromAddress": "no-reply@onboardly.dev",
  "FromName": "Onboardly",
  "AppBaseUrl": "http://localhost:5174",
  "Smtp": {                   // Mailtrap-ready defaults for local dev
    "Host": "sandbox.smtp.mailtrap.io",
    "Port": 587,
    "Username": "",           // put real creds in user-secrets, not source control
    "Password": "",
    "UseStartTls": true
  },
  "Branding": { "CompanyName": "Onboardly", "LogoUrl": "", "PrimaryColor": "#4f46e5" },
  "Queue": { "MaxAttempts": 3, "RetryDelaySeconds": 10 }
}
```

**Local development (Mailtrap)** — keep `Provider: "Log"` to print emails to the console with no delivery, or set `Provider: "Smtp"` and add your Mailtrap credentials via user-secrets to trap mail in your Mailtrap inbox:

```bash
cd server
dotnet user-secrets set "Email:Provider" "Smtp"
dotnet user-secrets set "Email:Smtp:Username" "<mailtrap-username>"
dotnet user-secrets set "Email:Smtp:Password" "<mailtrap-password>"
```

Set `Email:Mode` to `Queue` to exercise the background processor (retries + failure logging).

**Emails**

- **Account Created** — sent when an admin creates a user; includes the user's name, organization, sign-in URL, and a temporary-password/setup link, with organization branding.

## License

Proprietary — all rights reserved.
