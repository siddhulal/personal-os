# Personal Life OS — Architecture Overview

## System Architecture

```
                    +------------------+
                    |   PostgreSQL 15  |
                    |    (Port 5432)   |
                    +--------+---------+
                             |
                    +--------+---------+
                    | Spring Boot API  |
                    |   (Port 8080)    |
                    |  Java 17 + JWT   |
                    +--------+---------+
                             |
                    +--------+---------+
                    |  Next.js 14 App  |
                    |   (Port 3000)    |
                    |  App Router + TS |
                    +------------------+
```

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind  |
| Components | shadcn/ui                         |
| State      | React Query (TanStack Query)      |
| Validation | Zod                               |
| Backend    | Spring Boot 3.2, Java 17          |
| ORM        | Spring Data JPA / Hibernate       |
| Migrations | Flyway                            |
| Auth       | JWT + BCrypt                      |
| Database   | PostgreSQL 15                     |
| Testing    | JUnit 5, Testcontainers, Playwright |
| DevOps     | Docker, docker-compose            |

## Folder Structure

```
personal-life-os/
├── backend/                          # Spring Boot API
│   ├── src/main/java/com/lifeos/api/
│   │   ├── config/                   # Security, CORS, JWT config
│   │   ├── controller/               # REST controllers
│   │   ├── dto/                      # Request/Response DTOs
│   │   ├── entity/                   # JPA entities
│   │   ├── exception/                # Custom exceptions + handler
│   │   ├── repository/               # Spring Data repositories
│   │   ├── security/                 # JWT filter, auth provider
│   │   └── service/                  # Business logic
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/             # Flyway SQL migrations
│   ├── src/test/                     # Test suite
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                         # Next.js App
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/               # Login/Register
│   │   │   ├── dashboard/
│   │   │   ├── tasks/
│   │   │   ├── projects/
│   │   │   ├── notes/
│   │   │   ├── ideas/
│   │   │   ├── goals/
│   │   │   ├── learning/
│   │   │   ├── interview/
│   │   │   └── settings/
│   │   ├── components/               # Reusable UI components
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── layout/               # Sidebar, Header
│   │   │   └── shared/               # QuickAdd, SearchBar
│   │   ├── lib/                      # Utils, API client, auth
│   │   ├── hooks/                    # Custom React hooks
│   │   └── types/                    # TypeScript type defs
│   ├── Dockerfile
│   ├── tailwind.config.ts
│   └── package.json
├── docker-compose.yml
├── .env.example
└── ARCHITECTURE.md
```

## Database Schema

### Core Entities

- **users** — Authentication and profile
- **tasks** — Todo items with priority, status, due dates
- **projects** — Group tasks and notes
- **notes** — Rich text notes with tags
- **ideas** — Quick idea capture
- **goals** — Long-term objectives
- **tags** — Flexible tagging system
- **entity_tags** — Many-to-many tag associations

### Learning Module

- **learning_roadmaps** — Learning paths (e.g., "Spring Boot Developer")
- **learning_topics** — Topics within roadmaps
- **skills** — Skill tracking with confidence scores
- **study_sessions** — Scheduled study time

### Interview Module

- **interview_questions** — Question bank
- **interview_answers** — User answers with key points
- **practice_records** — Practice tracking

## API Endpoints

### Auth
- POST   /api/auth/register
- POST   /api/auth/login
- GET    /api/auth/me

### Tasks
- GET    /api/tasks
- POST   /api/tasks
- GET    /api/tasks/{id}
- PUT    /api/tasks/{id}
- DELETE /api/tasks/{id}

### Projects
- GET    /api/projects
- POST   /api/projects
- GET    /api/projects/{id}
- PUT    /api/projects/{id}
- DELETE /api/projects/{id}

### Notes
- GET    /api/notes
- POST   /api/notes
- GET    /api/notes/{id}
- PUT    /api/notes/{id}
- DELETE /api/notes/{id}

### Ideas
- GET    /api/ideas
- POST   /api/ideas
- GET    /api/ideas/{id}
- PUT    /api/ideas/{id}
- DELETE /api/ideas/{id}

### Goals
- GET    /api/goals
- POST   /api/goals
- GET    /api/goals/{id}
- PUT    /api/goals/{id}
- DELETE /api/goals/{id}

### Learning
- GET    /api/learning/roadmaps
- POST   /api/learning/roadmaps
- GET    /api/learning/roadmaps/{id}
- PUT    /api/learning/roadmaps/{id}
- DELETE /api/learning/roadmaps/{id}
- POST   /api/learning/roadmaps/{id}/topics
- PUT    /api/learning/topics/{id}
- DELETE /api/learning/topics/{id}
- GET    /api/learning/skills
- POST   /api/learning/skills
- PUT    /api/learning/skills/{id}
- DELETE /api/learning/skills/{id}

### Interview Prep
- GET    /api/interview/questions
- POST   /api/interview/questions
- GET    /api/interview/questions/{id}
- PUT    /api/interview/questions/{id}
- DELETE /api/interview/questions/{id}
- POST   /api/interview/questions/{id}/answers
- PUT    /api/interview/answers/{id}
- POST   /api/interview/questions/{id}/practice
- GET    /api/interview/questions/random
- GET    /api/interview/progress

### Search
- GET    /api/search?q={query}

### Dashboard
- GET    /api/dashboard/summary

All list endpoints support: ?page=0&size=20&sort=createdAt,desc
