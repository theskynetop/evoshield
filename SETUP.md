# SH-WAF — Setup Guide

## Project: Self-Healing Web Application Firewall
**Guide:** Prof. Tejashree Patil | **HOD:** Prof. Abhijeet More
**College:** PVPPCOE — Dept. of Computer Engineering

---

## Quick Start

### 1. Clone & Setup Environment

```bash
cd sh-waf
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Run Supabase Schema

Go to your Supabase project → SQL Editor → paste contents of `supabase/schema.sql` → Run.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with Supabase keys
npm install
npm run dev
# Opens at http://localhost:5173
```

### 4. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in DATABASE_URL
uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

### 5. Docker (Full Stack)

```bash
cp .env.example .env         # fill all values
docker-compose up --build
# Frontend: http://localhost
# Backend:  http://localhost:8000
```

---

## Demo Login

| Email            | Password   | Role  |
|------------------|------------|-------|
| admin@shwaf.io   | Admin@123  | Admin |

---

## Project Structure

```
sh-waf/
├── frontend/
│   ├── src/
│   │   ├── pages/          # All page components
│   │   ├── layouts/        # MainLayout, AuthLayout
│   │   ├── components/     # Shared UI components
│   │   ├── context/        # Auth & Theme context
│   │   ├── hooks/          # React Query hooks
│   │   ├── services/       # Supabase & Axios clients
│   │   └── utils/          # Sample data generators
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── core/           # Config, DB
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routes/         # API routers
│   │   └── ml/             # Isolation Forest + GA Healing
│   └── requirements.txt
├── supabase/
│   └── schema.sql          # Full DB schema + RLS + seed
└── docker-compose.yml
```

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + MUI v5 + Recharts |
| Backend   | FastAPI + SQLAlchemy + Pydantic      |
| Database  | Supabase PostgreSQL                  |
| Auth      | Supabase Auth                        |
| Realtime  | Supabase Realtime                    |
| ML        | Scikit-Learn Isolation Forest + SHAP |
| Container | Docker + docker-compose              |
