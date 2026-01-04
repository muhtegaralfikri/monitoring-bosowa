# Monitoring Bosowa

Monitoring BBM Bosowa monorepo dengan backend Fastify + Drizzle dan frontend Svelte + Vite.

## Struktur Repo
- `backend/`: API server (Fastify, Drizzle ORM)
- `frontend/`: Web app (Svelte, Vite)
- `docs/`: Dokumen arsitektur, API, dan spesifikasi

## Prasyarat
- Node.js 20+ (disarankan)
- MySQL 8+ (untuk backend)

## Setup
Backend membutuhkan file `backend/.env` (tidak dikomit). Gunakan `backend/.env.example` sebagai template.

### Backend
```bash
cd backend
npm install
npm run dev
```

Migrasi database (opsional, sesuai kebutuhan):
```bash
npm run db:migrate
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## CI
Workflow GitHub Actions menjalankan build untuk backend dan frontend pada push/PR ke `main`.
