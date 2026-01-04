# System Architecture - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Browser (Chrome/Firefox/Edge)                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Svelte SPA (Single Page Application)              │  │  │
│  │  │  • Components                                      │  │  │
│  │  │  • Stores (State Management)                       │  │  │
│  │  │  • Services (API Layer)                            │  │  │
│  │  │  • Router                                          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (443)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WEB SERVER LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nginx (via aaPanel)                                     │  │
│  │  • Static file serving (Frontend build)                  │  │
│  │  • Reverse proxy (Backend API)                           │  │
│  │  • SSL/TLS termination                                   │  │
│  │  • Gzip compression                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ http (internal)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Fastify Server (Port 4111)                              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Routes                                            │  │  │
│  │  │  • /api/auth     (Login, Refresh, Logout)          │  │  │
│  │  │  • /api/users    (User CRUD)                       │  │  │
│  │  │  • /api/stock    (Stock In/Out, History, Trend)    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Middleware                                        │  │  │
│  │  │  • JWT Authentication                              │  │  │
│  │  │  • Role-based Authorization                        │  │  │
│  │  │  • Request Validation (Zod)                        │  │  │
│  │  │  • Error Handling                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Services (Business Logic)                         │  │  │
│  │  │  • AuthService                                     │  │  │
│  │  │  • UserService                                     │  │  │
│  │  │  • StockService                                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ mysql protocol (3306)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MySQL 8.0+ (Port 3306)                                 │  │
│  │  • users                                                │  │
│  │  • refresh_tokens                                       │  │
│  │  • transactions                                         │  │
│  │  • system_logs (optional)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Diagram

### 2.1 Backend Components

```
┌────────────────────────────────────────────────────────────────┐
│                       FASTIFY SERVER                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │    Routes   │───►│ Middleware  │───►│  Services   │       │
│  │             │    │             │    │             │       │
│  │ • Auth      │    │ • Auth JWT  │    │ • Auth      │       │
│  │ • Users     │    │ • Role      │    │ • User      │       │
│  │ • Stock     │    │ • Validate  │    │ • Stock     │       │
│  └─────────────┘    └─────────────┘    └──────┬──────┘       │
│                                                │               │
│                                                ▼               │
│                                      ┌─────────────────┐      │
│                                      │  Drizzle ORM    │      │
│                                      │                 │      │
│                                      │ • Schema        │      │
│                                      │ • Query Builder │      │
│                                      └────────┬────────┘      │
│                                               │               │
│                                               ▼               │
│                                      ┌─────────────────┐      │
│                                      │  MySQL Driver   │      │
│                                      │  (mysql2)       │      │
│                                      └─────────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Components

```
┌────────────────────────────────────────────────────────────────┐
│                        SVELTE APP                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Pages     │───►│ Components  │───►│   Stores    │       │
│  │             │    │             │    │             │       │
│  │ • Dashboard │    │ • Button    │    │ • Auth      │       │
│  │ • History   │    │ • Input     │    │ • User      │       │
│  │ • Charts    │    │ • Card      │    │ • Toast     │       │
│  │ • Users     │    │ • Modal     │    │             │       │
│  │             │    │ • Table     │    │             │       │
│  │             │    │ • Chart     │    │             │       │
│  └─────────────┘    └─────────────┘    └──────┬──────┘       │
│                                                │               │
│                                                ▼               │
│                                      ┌─────────────────┐      │
│                                      │ API Service     │      │
│                                      │                 │      │
│                                      │ • api.ts        │      │
│                                      │ • auth.service  │      │
│                                      │ • stock.service │      │
│                                      │ • user.service  │      │
│                                      └────────┬────────┘      │
│                                               │               │
│                                               ▼               │
│                                      ┌─────────────────┐      │
│                                      │  Fetch API      │      │
│                                      │  (httpOnly      │      │
│                                      │   cookies)      │      │
│                                      └─────────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### 3.1 Request-Response Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Nginx     │      │   Fastify   │
│             │      │             │      │             │
│ 1. User     │      │ 3. Proxy    │      │ 5. Route    │
│    Action   │─────►│    Pass     │─────►│    Match    │
│             │      │             │      │             │
└─────────────┘      └─────────────┘      └──────┬──────┘
     │                    │                     │
     │                    │                     ▼
     │                    │              ┌─────────────┐
     │                    │              │ Middleware  │
     │                    │              │             │
     │                    │              │ 6. Auth     │
     │                    │              │    Check    │
     │                    │              └──────┬──────┘
     │                    │                     │
     │                    │                     ▼
     │                    │              ┌─────────────┐
     │                    │              │  Service    │
     │                    │              │             │
     │                    │              │ 7. Business │
     │                    │              │    Logic    │
     │                    │              └──────┬──────┘
     │                    │                     │
     │                    │                     ▼
     │                    │              ┌─────────────┐
     │                    │              │   Drizzle   │
     │                    │              │             │
     │                    │              │ 8. Query    │
     │                    │              │    Build    │
     │                    │              └──────┬──────┘
     │                    │                     │
     │                    │                     ▼
     │                    │              ┌─────────────┐
     │                    │              │   MySQL     │
     │                    │              │             │
     │                    │              │ 9. Execute  │
     │                    │              │    Query    │
     │                    │              └──────┬──────┘
     │                    │                     │
     │                    │                     ▼
     │◄────────────────────┴─────────────────────┤
│ 16. Render         │ 10. Response             │
│     Update         │    Process               │
└─────────────┘      └─────────────┘
```

### 3.2 Auth Flow (with Token Refresh)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Fastify   │      │    MySQL    │
│             │      │             │      │             │
│ 1. Login    │─────►│ 2. Verify   │─────►│ 3. Query    │
│    Request  │      │    User     │      │    User     │
└─────────────┘      └──────┬──────┘      └──────┬──────┘
     │                     │                     │
     │                     ▼                     │
     │              ┌─────────────┐              │
     │              │ 4. Generate │              │
     │              │    JWT      │              │
     │              │    Token    │              │
     │              └──────┬──────┘              │
     │                     │                     │
     │                     ▼                     │
     │              ┌─────────────┐              │
     │              │ 5. Store    │─────────────►│
     │              │  Refresh    │              │
     │              │  Token      │              │
     │              └──────┬──────┘              │
└─────────────┐            │                     │
│ 6. Set      │◄───────────┤                     │
│  Cookies    │            │                     │
│ (httpOnly)  │            │                     │
└─────────────┘            │                     │
     │                     │                     │
     │ ┌───────────────────┘                     │
     │ │                                         │
     ▼ ▼                                         ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ 7. API      │─────►│ 8. Validate │─────►│ 9. Verify   │
│  Request    │      │    Token    │      │  Refresh    │
└─────────────┘      └──────┬──────┘      └─────────────┘
     │                     │
     │              ┌──────┴──────┐
     │              │             │
     ▼              ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 10a. Token  │ │ 10b. Token  │ │ 10c. Valid  │
│  Valid      │ │  Expired    │ │  Response   │
│  ──────────►│ │  ──────────►│ │ ◄──────────│
└─────────────┘ └─────────────┘ └─────────────┘
                      │
                      ▼
               ┌─────────────┐
               │ 11. Auto    │
               │  Refresh    │
               │  Token      │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ 12. New     │
               │  Token Pair │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ 13. Retry   │
               │  Original   │
               │  Request    │
               └─────────────┘
```

---

## 4. Deployment Architecture

### 4.1 Server Layout (VPS Ubuntu)

```
┌─────────────────────────────────────────────────────────────────┐
│                      VPS (Ubuntu 22.04)                         │
│  2GB RAM / 2 vCPU                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  aaPanel                                                   │ │
│  │  • Web Server Management                                  │ │
│  │  • Database Management                                    │ │
│  │  • File Manager                                           │ │
│  │  • Cron Jobs                                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Nginx                                                     │ │
│  │  • /var/www/monitoring-bosowa (Frontend static files)     │ │
│  │  • Reverse proxy: /api -> localhost:4111                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  PM2 (Process Manager)                                    │ │
│  │  • monitoring-bosowa-backend (Node.js app)                │ │
│  │  • Port: 4111                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  MySQL                                                     │ │
│  │  • Database: monitoring_bosowa                            │ │
│  │  • User: monitoring_user                                  │ │
│  │  • Port: 3306                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
/var/www/
├── monitoring-bosowa/           # Frontend build output
│   ├── index.html
│   ├── assets/
│   │   ├── index-abc123.js
│   │   └── index-def456.css
│   └── ...
│
/home/monitoring/
└── monitoring-bosowa-backend/   # Backend source
    ├── dist/
    │   └── index.js            # Compiled app
    ├── src/
    │   ├── routes/
    │   ├── services/
    │   ├── middleware/
    │   └── ...
    ├── package.json
    └── .env                     # Environment variables
```

---

## 5. Network Architecture

### 5.1 Ports and Firewalls

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User's Browser                                           │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│                          │ HTTPS (443)                         │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  UFW Firewall (Ubuntu)                                   │  │
│  │  Allow: 80, 443                                          │  │
│  │  Deny: 3306, 4111 (internal only)                        │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nginx (443)                                             │  │
│  │  • SSL Termination                                      │  │
│  │  • Static files                                          │  │
│  │  • Reverse proxy /api → 127.0.0.1:4111                   │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│          ┌───────────────┴───────────────┐                    │
│          │                               │                     │
│          ▼                               ▼                     │
│  ┌───────────────┐              ┌───────────────┐             │
│  │ Static Files  │              │ 127.0.0.1:4111│             │
│  │ (Frontend)    │              │ (Fastify)     │             │
│  └───────────────┘              └───────┬───────┘             │
│                                          │                     │
│                                          ▼                     │
│                                  ┌───────────────┐             │
│                                  │ 127.0.0.1:3306│             │
│                                  │ (MySQL)       │             │
│                                  └───────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network Security                                     │
│  ├─ UFW Firewall (Ubuntu)                                      │
│  ├─ Only expose 80, 443                                        │
│  └─ Fail2ban (optional)                                        │
│                                                                 │
│  Layer 2: Transport Security                                   │
│  ├─ SSL/TLS (Let's Encrypt)                                    │
│  ├─ HSTS headers                                               │
│  └─ Secure cookies (httpOnly, SameSite)                        │
│                                                                 │
│  Layer 3: Application Security                                 │
│  ├─ Input validation (Zod)                                     │
│  ├─ SQL injection prevention (Drizzle prepared statements)     │
│  ├─ XSS prevention (sanitization)                              │
│  ├─ CSRF prevention (SameSite cookie)                          │
│  └─ Rate limiting (optional)                                   │
│                                                                 │
│  Layer 4: Authentication & Authorization                        │
│  ├─ JWT with short TTL (24h)                                   │
│  ├─ Refresh token rotation                                     │
│  ├─ Role-based access control (RBAC)                           │
│  └─ Password hashing (bcrypt)                                  │
│                                                                 │
│  Layer 5: Data Security                                        │
│  ├─ Database user with limited privileges                      │
│  ├─ Regular backups (aaPanel)                                  │
│  └─ Environment variables for secrets                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Drizzle ORM with prepared statements |
| XSS | Input sanitization, httpOnly cookies |
| CSRF | SameSite=strict cookie |
| Session hijacking | Short TTL, httpOnly cookies |
| Brute force | Rate limiting, bcrypt (slow hash) |
| Data breach | Regular backups, minimal data storage |

---

## 7. Scalability Considerations

### 7.1 Current Capacity (VPS 2GB)

| Component | Concurrent Users | Requests/sec |
|-----------|------------------|--------------|
| Backend (Fastify) | ~50 | ~200 |
| MySQL | ~100 connections | ~500 queries |
| Nginx (static) | ~500 | ~1000 |

**Bottleneck:** RAM for MySQL connections

### 7.2 Scaling Strategy (Future)

If load increases:

1. **Vertical Scaling (easiest)**
   - Upgrade to 4GB RAM VPS
   - Add 2 vCPU

2. **Database Optimization**
   - Add Redis for caching (summary, trends)
   - Database read replicas

3. **Horizontal Scaling**
   - Load balancer (Nginx)
   - Multiple backend instances
   - Separate database server

---

## 8. Monitoring & Observability

### 8.1 Metrics to Monitor

| Metric | Tool | Threshold |
|--------|------|-----------|
| CPU Usage | aaPanel / htop | < 80% |
| RAM Usage | aaPanel / free | < 80% (1.6GB) |
| Disk Usage | aaPanel / df | < 80% |
| API Response Time | Custom logging | < 200ms (p95) |
| Error Rate | Custom logging | < 1% |

### 8.2 Logging Strategy

```typescript
// Simple logging middleware
app.addHook('onResponse', async (request, reply) => {
  const duration = reply.getResponseTime()
  const log = {
    method: request.method,
    url: request.url,
    status: reply.statusCode,
    duration: `${duration.toFixed(2)}ms`,
  }

  if (reply.statusCode >= 500) {
    request.log.error(log)
  } else if (reply.statusCode >= 400) {
    request.log.warn(log)
  } else {
    request.log.info(log)
  }
})
```

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

| What | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database | Daily | 7 days | Local (aaPanel) |
| Frontend build | On deploy | 3 versions | Local |
| Backend source | Git | Infinite | GitHub |

### 9.2 Recovery Steps

1. **Database Corruption:**
   ```bash
   # Restore from aaPanel backup
   mysql -u monitoring_user -p monitoring_bosowa < backup.sql
   ```

2. **Backend Crash:**
   ```bash
   # PM2 auto-restart
   pm2 restart monitoring-bosowa-backend
   ```

3. **Full Server Loss:**
   - Re-provision VPS
   - Install aaPanel
   - Restore database
   - Deploy backend + frontend

---

## 10. Technology Rationale

| Component | Technology | Why |
|-----------|------------|-----|
| Backend | Fastify | Most performant Node.js framework, low memory |
| ORM | Drizzle | Type-safe, zero runtime overhead, SQL-like |
| Database | MySQL | Company policy, well-supported |
| Frontend | Svelte | Compiled to vanilla JS, smallest bundle |
| UI | Skeleton UI | Svelte-native, modern components |
| Charts | Chart.js | Lightweight, flexible, well-documented |
| Auth | JWT | Stateless, scalable, no Redis needed |
| Deployment | aaPanel | Easy management, built-in tools |
| Process Manager | PM2 | Auto-restart, logging, monitoring |
