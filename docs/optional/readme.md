# Monitoring BBM Bosowa

> Sistem pemantauan stok BBM untuk tim Bosowa Bandar. Versi ringan untuk VPS 2GB RAM.

---

## Quick Start

### Prerequisites

- Node.js 20 LTS
- MySQL 8.0+
- npm or yarn

### Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

# Frontend
cd frontend
npm install
cp .env.example .env
# Edit .env with API URL
```

### Run Development

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

Open browser:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4111

**Default Login:**
- Email: `admin@bosowa.co.id`
- Password: `admin123`

---

## Project Structure

```
monitoring-bosowa/
├── backend/                 # Fastify + Drizzle ORM
│   ├── src/
│   │   ├── db/             # Database schema & connection
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Entry point
│   └── package.json
│
├── frontend/               # Svelte + Skeleton UI
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # Reusable components
│   │   │   ├── stores/     # State management
│   │   │   ├── services/   # API calls
│   │   │   └── utils/      # Helpers
│   │   └── routes/         # File-based routing
│   └── package.json
│
└── docs/                   # Documentation
    ├── prd.md
    ├── database.md
    ├── api.md
    ├── backend.md
    ├── frontend.md
    ├── architecture.md
    ├── security.md
    └── optional/
```

---

## Available Scripts

### Backend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Run migration
npm run db:studio    # Open Drizzle Studio
```

### Frontend

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run type checking
```

---

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=4111

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=monitoring_bosowa
DB_USER=monitoring_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_min_32_chars

# CORS
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:4111/api
VITE_APP_NAME=Monitoring BBM Bosowa
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login user |
| POST | `/api/auth/refresh` | No | Refresh token |
| POST | `/api/auth/logout` | Yes | Logout user |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/users` | Admin | Get all users |
| POST | `/api/users` | Admin | Create user |
| PATCH | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/stock/summary` | Yes | Get stock summary |
| POST | `/api/stock/in` | Admin | Input stok masuk |
| POST | `/api/stock/out` | Operasional | Input pemakaian |
| GET | `/api/stock/history` | Yes | Get transaction history |
| GET | `/api/stock/trend` | Yes | Get stock trend |
| POST | `/api/stock/export` | Yes | Export to Excel |

**Full API Documentation:** `docs/api.md`

---

## Database Schema

```sql
users           - User accounts & authentication
refresh_tokens  - JWT refresh tokens
transactions    - Stock transactions (IN/OUT)
system_logs     - Audit trail (optional)
```

**Full Schema:** `docs/database.md`

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| Fastify | 5.x | Web framework |
| Drizzle ORM | 0.36+ | Database ORM |
| mysql2 | 3.x | MySQL driver |
| Zod | 3.x | Validation |
| bcrypt | 5.x | Password hashing |
| @fastify/jwt | 8.x | JWT authentication |

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| Svelte | 5.x | UI framework |
| Skeleton UI | 2.x | Component library |
| Chart.js | 4.x | Charts |
| Vite | 6.x | Build tool |

---

## Development Workflow

### 1. Start Backend

```bash
cd backend
npm run dev
# Server runs on http://localhost:4111
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
# Dev server runs on http://localhost:5173
```

### 3. Database Migrations

```bash
# Generate migration
npm run db:generate

# Run migration
npm run db:migrate
```

### 4. Build for Production

```bash
# Backend
cd backend
npm run build
npm run start

# Frontend
cd frontend
npm run build
# Deploy 'dist' folder to web server
```

---

## Code Style

### TypeScript

- Use strict mode
- No `any` types
- Proper type definitions

### Naming Conventions

- Files: `kebab-case.ts` (backend), `PascalCase.svelte` (frontend)
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Components: `PascalCase`

### Git Commit Messages

```
feat: add user management feature
fix: resolve token refresh issue
docs: update API documentation
refactor: improve error handling
test: add auth service tests
```

---

## Testing

```bash
# Backend tests (future)
cd backend
npm test

# E2E tests (future)
npm run test:e2e
```

---

## Deployment

### Quick Deploy (aaPanel)

1. Build frontend: `npm run build`
2. Build backend: `npm run build`
3. Upload to server via SFTP
4. Configure Nginx reverse proxy
5. Start with PM2: `pm2 start dist/index.js`

**Full Guide:** `docs/optional/deployment.md`

---

## Troubleshooting

### Backend won't start

```bash
# Check if port 4111 is in use
lsof -i :4111

# Check logs
pm2 logs monitoring-bosowa-backend
```

### Database connection failed

```bash
# Verify MySQL is running
systemctl status mysql

# Test connection
mysql -u monitoring_user -p -h localhost monitoring_bosowa
```

### Frontend API calls failing

- Check `VITE_API_URL` in `.env`
- Verify CORS settings in backend
- Check browser console for errors

---

## Security

- Passwords hashed with bcrypt (cost 10)
- JWT tokens with 24-hour expiry
- httpOnly cookies for XSS protection
- SameSite cookies for CSRF protection
- Input validation with Zod
- SQL injection prevention (Drizzle prepared statements)

**Full Security Docs:** `docs/security.md`

---

## Performance

| Metric | Target |
|--------|--------|
| API Response | < 200ms (p95) |
| Page Load | < 2s |
| RAM Usage | < 700MB (VPS 2GB) |

---

## Contributing

1. Create feature branch: `git checkout -b feature/xxx`
2. Make changes and commit
3. Push to remote
4. Create pull request

---

## Documentation

- **PRD**: `docs/prd.md` - Product requirements
- **Database**: `docs/database.md` - Schema & queries
- **API**: `docs/api.md` - Endpoint documentation
- **Backend**: `docs/backend.md` - Backend architecture
- **Frontend**: `docs/frontend.md` - Frontend architecture
- **Security**: `docs/security.md` - Security guidelines
- **Deployment**: `docs/optional/deployment.md` - Deploy guide

---

## License

Proprietary - Bosowa Bandar Internal Use

---

## Support

For questions or issues:
1. Check documentation in `docs/`
2. Review `docs/optional/deployment.md` for deployment issues
3. Contact development team

---

**Version:** 1.0
**Last Updated:** 2026-01-04
