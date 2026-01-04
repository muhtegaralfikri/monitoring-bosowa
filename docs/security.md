# Security Documentation - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04

---

## 1. Security Overview

### 1.1 Threat Model

| Threat Actor | Likelihood | Impact | Mitigation |
|--------------|------------|--------|------------|
| External attacker | Medium | High | Authentication, input validation |
| Insider threat | Low | High | RBAC, audit logs |
| Automated bot | High | Medium | Rate limiting, CAPTCHA |
| XSS attacker | Medium | Medium | httpOnly cookies, sanitization |
| CSRF attacker | Low | Medium | SameSite cookies |

---

## 2. Authentication Security

### 2.1 Password Policy

| Requirement | Specification |
|-------------|---------------|
| Min length | 6 characters |
| Max length | 255 characters |
| Hashing algorithm | bcrypt |
| Cost factor | 10 |
| Storage | Hash only (no plain text) |

**Implementation:**
```typescript
import bcrypt from 'bcrypt'

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}
```

### 2.2 JWT Configuration

| Property | Value | Rationale |
|----------|-------|-----------|
| Algorithm | HS256 | Symmetric, fast |
| Secret length | Min 32 chars | Entropy |
| Access TTL | 24 hours | Balance security/UX |
| Refresh TTL | 30 days | User convenience |
| Issuer | monitoring-bosowa | Identification |

**Token payload (minimized):**
```json
{
  "sub": 1,
  "email": "admin@bosowa.co.id",
  "role": "admin",
  "location": null,
  "iat": 1704345600,
  "exp": 1704432000,
  "iss": "monitoring-bosowa"
}
```

**Never include in JWT:**
- ❌ Password
- ❌ Sensitive data
- ❌ Excessive user info

### 2.3 Token Storage

| Method | Used | Reason |
|--------|------|--------|
| httpOnly Cookie | ✅ Yes | XSS protection |
| localStorage | ❌ No | XSS vulnerable |
| Memory | ❌ No | Lost on refresh |

**Cookie Configuration:**
```typescript
reply.setCookie('accessToken', token, {
  httpOnly: true,        // Not accessible via JS
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 24 * 60 * 60,  // 24 hours
  path: '/',
})
```

### 2.4 Refresh Token Rotation

```
┌─────────────────────────────────────────────────────────────┐
│              REFRESH TOKEN ROTATION FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User login → Create RT_1                                │
│  2. Access token expires → Call /refresh                   │
│  3. Validate RT_1 → Create RT_2                            │
│  4. Delete RT_1 from database (revoke)                     │
│  5. Return new access + RT_2                               │
│                                                             │
│  Benefit: If RT_1 is stolen, it can only be used ONCE.     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Authorization Security

### 3.1 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **admin** | All operations |
| **operasional** | Stock out (own location), view data |

**Implementation:**
```typescript
export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== role) {
      reply.status(403).send({ error: 'Forbidden' })
    }
  }
}

// Route protection
app.post('/stock/in', {
  onRequest: [authenticate, requireRole('admin')],
}, handler)
```

### 3.2 Location-Based Access

Operasional users hanya bisa akses lokasi mereka sendiri:

```typescript
export function requireLocation() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userLocation = request.user.location

    if (request.user.role === 'operasional') {
      const requestLocation = request.body.location

      // Override with user location
      request.body.location = userLocation
    }
  }
}
```

---

## 4. Input Validation & Sanitization

### 4.1 Validation Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Client-side (Zod schema)                         │
│  ├─ Type checking                                          │
│  ├─ Required fields                                        │
│  └─ Format validation                                      │
│                                                             │
│  Layer 2: Middleware (Fastify schema validation)           │
│  ├─ Re-run validation                                      │
│  ├─ Sanitization                                           │
│  └─ Coercion                                               │
│                                                             │
│  Layer 3: Service layer                                     │
│  ├─ Business rules                                         │
│  ├─ Data consistency                                       │
│  └─ Edge cases                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Validation Schema (Zod)

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password min 6 characters'),
})

export const stockInSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  location: z.enum(['GENSET', 'TUG_ASSIST']),
  notes: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
})

export const stockOutSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  notes: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
})
```

### 4.3 SQL Injection Prevention

**❌ Bad (raw query):**
```typescript
const query = `SELECT * FROM users WHERE email = '${email}'`
```

**✅ Good (Drizzle ORM):**
```typescript
const user = await db.select()
  .from(users)
  .where(eq(users.email, email))
```

Drizzle uses **prepared statements** by default.

---

## 5. Cross-Site Scripting (XSS) Prevention

### 5.1 Attack Vector

User input di `notes` field:
```
<script>alert('XSS')</script>
```

### 5.2 Mitigation

**1. Input sanitization:**
```typescript
import { z } from 'zod'

const sanitizedSchema = z.object({
  notes: z.string()
    .transform((val) => val.replace(/<[^>]*>/g, '')) // Strip HTML
    .max(500),
})
```

**2. Output encoding (Svelte auto-escapes):**
```svelte
<!-- Safe: Svelte escapes by default -->
<p>{transaction.notes}</p>

<!-- Unsafe: Only use with trusted content -->
<p>{@html transaction.notes}</p>
```

**3. httpOnly cookies:**
If XSS succeeds, attacker cannot steal cookies.

---

## 6. Cross-Site Request Forgery (CSRF) Prevention

### 6.1 Attack Scenario

```
Attacker site:                    Logged-in user:
<img src="https://your-domain.com/api/users/1/delete" />
                                  → Request sent with cookies
```

### 6.2 Mitigation: SameSite Cookie

```typescript
reply.setCookie('accessToken', token, {
  sameSite: 'strict',  // Block cross-site requests
})
```

**SameSite values:**
| Value | Protection |
|-------|------------|
| `strict` | Best - blocks all cross-site |
| `lax` | Good - blocks most cross-site |
| `none` | No protection |

### 6.3 Additional: CSRF Token (Optional)

```typescript
// Generate token
const csrfToken = randomBytes(32).toString('hex')

// Send in header
fetch('/api/stock/in', {
  headers: {
    'X-CSRF-Token': csrfToken,
  },
})
```

---

## 7. Transport Security

### 7.1 HTTPS Configuration (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Strong ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Other security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

### 7.2 HTTP to HTTPS Redirect

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 8. Rate Limiting

### 8.1 Implementation

```typescript
import rateLimit from '@fastify/rate-limit'

await app.register(rateLimit, {
  max: 100,           // 100 requests
  timeWindow: '1 minute',
  skipOnError: true,
  keyGenerator: (req) => req.user?.id || req.ip,
})

// Endpoint-specific
app.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
    },
  },
}, loginHandler)
```

### 8.2 Response

**Rate limit exceeded:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704345600
```

---

## 9. Data Security

### 9.1 Database User Privileges

```sql
-- Application user (limited privileges)
CREATE USER 'monitoring_user'@'localhost' IDENTIFIED BY 'secure_password';

GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_bosowa.*
TO 'monitoring_user'@'localhost';

-- No DROP, ALTER, CREATE, GRANT
```

### 9.2 Environment Variables

**✅ Good:** `.env` file (not in git)
```env
DB_PASSWORD=your_secure_random_password_here
JWT_SECRET=your_jwt_secret_min_32_chars
```

**❌ Bad:** Hardcoded in source
```typescript
const password = 'admin123'  // DON'T DO THIS
```

### 9.3 Secrets Management

**For production:**
- Use aaPanel environment variables
- Never commit `.env` to git
- Rotate secrets regularly

---

## 10. Logging & Monitoring

### 10.1 Security Events to Log

| Event | Details |
|-------|---------|
| Failed login | Email, IP, timestamp |
| Successful login | User ID, IP, timestamp |
| Logout | User ID, timestamp |
 Permission denied | User, endpoint, timestamp |
| Token refresh | User ID, timestamp |
| Password change | User ID, timestamp |

### 10.2 Log Format

```json
{
  "timestamp": "2024-01-04T10:00:00.000Z",
  "level": "warn",
  "event": "auth.failed_login",
  "data": {
    "email": "admin@bosowa.co.id",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

## 11. Backup Security

### 11.1 Backup Strategy

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database | Daily | 7 days | Local (aaPanel) |
| Database (weekly) | Weekly | 4 weeks | Off-site (optional) |

### 11.2 Backup Encryption

```bash
# Encrypt backup
mysqldump -u user -p database | gzip | gpg --encrypt > backup.sql.gz.gpg

# Decrypt backup
gpg --decrypt backup.sql.gz.gpg | gunzip | mysql -u user -p database
```

---

## 12. Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Set strong JWT secret (min 32 chars)
- [ ] Enable HTTPS with valid certificate
- [ ] Configure firewall (UFW)
- [ ] Set up database backups
- [ ] Enable security headers
- [ ] Test rate limiting
- [ ] Review user permissions
- [ ] Disable DEBUG mode
- [ ] Set up logging

### Ongoing

- [ ] Regular security updates (OS, packages)
- [ ] Review logs weekly
- [ ] Test backup restoration
- [ ] Rotate secrets quarterly
- [ ] Audit user access monthly

---

## 13. Incident Response

### 13.1 Security Incident Procedures

**1. Unauthorized Access Detected:**
```
1. Immediately revoke affected user sessions
2. Force password reset for affected accounts
3. Review logs for scope of breach
4. Patch vulnerability
5. Document incident
```

**2. Suspicious Activity:**
```
1. Enable additional logging
2. Monitor for patterns
3. Block offending IPs
4. Notify stakeholders if needed
```

**3. Data Breach:**
```
1. Isolate affected systems
2. Preserve evidence
3. Notify affected users
4. Report to authorities (if required)
5. Conduct post-mortem
```

---

## 14. Compliance

### 14.1 Data Privacy

- Collect only necessary data
- Allow users to request data deletion
- Secure data at rest and in transit
- Retain data only as long as needed

### 14.2 Audit Trail

```sql
-- Optional: system_logs table
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id INT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 15. Security Testing

### 15.1 Recommended Tests

| Test Type | Tool | Frequency |
|-----------|------|-----------|
| Dependency scan | `npm audit` | Every deploy |
| SAST | CodeQL / Semgrep | Every PR |
| DAST | OWASP ZAP | Quarterly |
| Penetration test | Manual | Annually |

### 15.2 Common Vulnerabilities to Test

- [ ] SQL injection
- [ ] XSS
- [ ] CSRF
- [ ] Broken authentication
- [ ] Sensitive data exposure
- [ ] Rate limiting bypass
- [ ] Privilege escalation
