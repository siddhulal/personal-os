# Personal Life OS

A comprehensive personal productivity application combining Life Management, Learning OS, and Interview Preparation into a single clean dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State Management | TanStack React Query |
| Backend | Spring Boot 3.2, Java 17 |
| Database | PostgreSQL 15 |
| ORM | Spring Data JPA / Hibernate |
| Migrations | Flyway |
| Auth | JWT + BCrypt |
| Testing | JUnit 5, Testcontainers, MockMvc |
| DevOps | Docker, docker-compose |

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- Ports 3001, 8080, 5432 available

### Steps

```bash
# 1. Clone and navigate to the project
cd personal-life-os

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker-compose up --build

# 4. Open the app
open http://localhost:3001
```

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8080
- **Database**: localhost:5432

## Local Development

### Prerequisites
- Java 17+ (JDK)
- Node.js 20+
- PostgreSQL 15+ running locally
- Maven 3.9+ (or use the included `mvnw` wrapper)

### Database Setup

```bash
# Create the database
createdb lifeos
# Or via psql:
psql -U postgres -c "CREATE DATABASE lifeos;"
psql -U postgres -c "CREATE USER lifeos WITH PASSWORD 'lifeos';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE lifeos TO lifeos;"
```

### Backend

```bash
cd backend

# Run with Maven wrapper
./mvnw spring-boot:run

# Or with Maven
mvn spring-boot:run
```

The backend starts on http://localhost:8080. Flyway will automatically run database migrations on startup.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local

# Start dev server
npm run dev
```

The frontend starts on http://localhost:3001.

## Running Tests

### Backend Tests (requires Docker for Testcontainers)

```bash
cd backend
./mvnw test
```

Tests use Testcontainers to spin up a temporary PostgreSQL instance automatically.

## Project Structure

```
personal-life-os/
├── backend/                          # Spring Boot API
│   ├── src/main/java/com/lifeos/api/
│   │   ├── config/                   # Security, CORS configuration
│   │   ├── controller/               # REST controllers (10 controllers)
│   │   ├── dto/                      # Request/Response DTOs (30 DTOs)
│   │   ├── entity/                   # JPA entities (14 entities)
│   │   ├── exception/                # Custom exceptions + global handler
│   │   ├── repository/               # Spring Data repositories (13 repos)
│   │   ├── security/                 # JWT filter, service, user details
│   │   └── service/                  # Business logic (12 services)
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/             # 9 Flyway SQL migrations
│   └── src/test/                     # 7 integration test classes
├── frontend/                         # Next.js App
│   ├── src/app/                      # 12 pages (App Router)
│   ├── src/components/
│   │   ├── ui/                       # 13 shadcn/ui components
│   │   ├── layout/                   # Sidebar, AppShell
│   │   └── shared/                   # QuickAdd, SearchBar
│   ├── src/lib/                      # API client, Auth, Providers
│   └── src/types/                    # TypeScript types
├── docker-compose.yml
└── .env.example
```

## Features

### Life Management
- **Tasks** — Create, edit, delete, filter by status/priority, mark complete
- **Projects** — Group tasks and notes, track project status
- **Notes** — Rich text notes with tags
- **Ideas** — Quick idea capture with prefix shortcuts
- **Goals** — Long-term objectives with target dates

### Learning OS
- **Learning Roadmaps** — Structured learning paths with topics and subtopics
- **Skill Tracker** — Track skills with confidence scores and levels
- **Progress Tracking** — Visual progress bars and completion stats

### Interview Preparation
- **Question Bank** — Store questions by category and difficulty
- **Answer Notes** — Key points, examples, mistakes to avoid
- **Mock Interview** — Random questions with timer and self-rating
- **Practice Tracker** — Track practice count, confidence, and mastery

### Dashboard
- Today's tasks, overdue, and upcoming (7 days)
- Active projects summary
- Learning progress with completion percentage
- Interview prep statistics
- **Quick Add** — Fast entry with prefixes: `t:` task, `n:` note, `i:` idea

### Other
- **Global Search** — Search across tasks, notes, ideas, and questions
- **JWT Authentication** — Secure multi-user support
- **Responsive Design** — Works on mobile, tablet, and desktop
- **Soft Delete** — All entities support soft delete for data safety

## API Endpoints

| Module | Endpoints |
|--------|----------|
| Auth | POST /api/auth/register, POST /api/auth/login, GET /api/auth/me |
| Tasks | GET/POST /api/tasks, GET/PUT/DELETE /api/tasks/{id} |
| Projects | GET/POST /api/projects, GET/PUT/DELETE /api/projects/{id} |
| Notes | GET/POST /api/notes, GET/PUT/DELETE /api/notes/{id} |
| Ideas | GET/POST /api/ideas, GET/PUT/DELETE /api/ideas/{id} |
| Goals | GET/POST /api/goals, GET/PUT/DELETE /api/goals/{id} |
| Tags | GET/POST /api/tags, PUT/DELETE /api/tags/{id} |
| Learning | GET/POST /api/learning/roadmaps, topics, skills |
| Interview | GET/POST /api/interview/questions, answers, practice, progress |
| Dashboard | GET /api/dashboard/summary |
| Search | GET /api/search?q={query} |

All list endpoints support pagination: `?page=0&size=20&sort=createdAt,desc`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SPRING_DATASOURCE_URL | jdbc:postgresql://localhost:5432/lifeos | Database URL |
| SPRING_DATASOURCE_USERNAME | lifeos | Database user |
| SPRING_DATASOURCE_PASSWORD | lifeos | Database password |
| JWT_SECRET | (dev default) | JWT signing secret (set in production) |
| CORS_ALLOWED_ORIGINS | http://localhost:3001 | Allowed CORS origins |
| NEXT_PUBLIC_API_URL | http://localhost:8080 | Backend API URL for frontend |

## Smoke Test Checklist

After starting the application, verify:

- [ ] Frontend loads at http://localhost:3001
- [ ] Register page works — create a new account
- [ ] Login page works — sign in with credentials
- [ ] Dashboard shows after login with greeting and cards
- [ ] Quick Add works — type `t: Test task` and press Enter
- [ ] Tasks page shows the created task
- [ ] Can create a new task with the dialog form
- [ ] Can mark a task as complete
- [ ] Projects page loads and can create a project
- [ ] Notes page loads and can create a note
- [ ] Ideas page loads and can capture an idea
- [ ] Goals page loads and can create a goal
- [ ] Learning page loads — both Roadmaps and Skills tabs
- [ ] Can create a learning roadmap and add topics
- [ ] Can create a skill with confidence score
- [ ] Interview Prep page loads — all three tabs
- [ ] Can add an interview question
- [ ] Mock Interview mode works with timer
- [ ] Settings page shows user profile
- [ ] Sidebar navigation works for all pages
- [ ] Mobile responsive — sidebar collapses on small screens
- [ ] Logout works and redirects to login
