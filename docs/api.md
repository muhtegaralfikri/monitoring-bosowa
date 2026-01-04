# API Documentation - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04
> Base URL: `https://your-domain.com/api`

---

## 1. Authentication

All endpoints except `/auth/login` and `/auth/refresh` require authentication.

**Authentication Method:** httpOnly Cookie

```
Cookie: accessToken=<jwt_token>; refreshToken=<refresh_token>
```

**Token Payload:**
```json
{
  "sub": 1,
  "email": "admin@bosowa.co.id",
  "role": "admin",
  "location": null,
  "iat": 1704345600,
  "exp": 1704432000
}
```

---

## 2. Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Success message (optional)"
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": { ... }
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## 3. Endpoints

### 3.1 Authentication

#### POST /auth/login

Login user dengan email dan password.

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@bosowa.co.id",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "admin@bosowa.co.id",
    "name": "Admin Utama",
    "role": "admin",
    "location": null
  }
}
```

**Cookies Set:**
```
accessToken=<jwt_access_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
refreshToken=<refresh_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
```

**Errors:**
| Code | Error |
|------|-------|
| 401 | Invalid credentials |

---

#### POST /auth/refresh

Refresh access token menggunakan refresh token.

**Request:**
```http
POST /api/auth/refresh
Cookie: refreshToken=<current_refresh_token>
```

**Response (200):**
```json
{
  "success": true
}
```

**Cookies Set:**
```
accessToken=<new_jwt_access_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
refreshToken=<new_refresh_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
```

**Errors:**
| Code | Error |
|------|-------|
| 401 | Invalid refresh token |
| 401 | Expired refresh token |

---

#### POST /auth/logout

Logout user dan revoke refresh token.

**Request:**
```http
POST /api/auth/logout
Cookie: accessToken=<jwt_access_token>; refreshToken=<refresh_token>
```

**Response (200):**
```json
{
  "message": "Logged out"
}
```

**Cookies Cleared:**
```
accessToken=; Max-Age=0
refreshToken=; Max-Age=0
```

---

#### GET /auth/me

Get current user information.

**Request:**
```http
GET /api/auth/me
Cookie: accessToken=<jwt_access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@bosowa.co.id",
  "name": "Admin Utama",
  "role": "admin",
  "location": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 401 | No access token |
| 401 | Invalid token |

---

### 3.2 Users (Admin Only)

#### GET /users

Get all users.

**Request:**
```http
GET /api/users
Cookie: accessToken=<jwt_access_token>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "email": "admin@bosowa.co.id",
      "name": "Admin Utama",
      "role": "admin",
      "location": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "email": "genset@bosowa.co.id",
      "name": "Operator GENSET",
      "role": "operasional",
      "location": "GENSET",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not admin) |

---

#### POST /users

Create new user.

**Request:**
```http
POST /api/users
Cookie: accessToken=<jwt_access_token>
Content-Type: application/json

{
  "email": "operator@bosowa.co.id",
  "password": "operator123",
  "name": "Operator Baru",
  "role": "operasional",
  "location": "TUG_ASSIST"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| email | Required, valid email, unique |
| password | Required, min 6 characters |
| name | Required, min 3 characters |
| role | Required, enum: `admin`, `operasional` |
| location | Required if role=`operasional`, enum: `GENSET`, `TUG_ASSIST` |

**Response (201):**
```json
{
  "id": 3,
  "email": "operator@bosowa.co.id",
  "name": "Operator Baru",
  "role": "operasional",
  "location": "TUG_ASSIST",
  "isActive": true,
  "createdAt": "2024-01-04T00:00:00.000Z"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not admin) |
| 422 | Validation error |
| 422 | Email already exists |

---

#### PATCH /users/:id

Update user.

**Request:**
```http
PATCH /api/users/3
Cookie: accessToken=<jwt_access_token>
Content-Type: application/json

{
  "name": "Operator Updated",
  "location": "GENSET"
}
```

**Response (200):**
```json
{
  "id": 3,
  "email": "operator@bosowa.co.id",
  "name": "Operator Updated",
  "role": "operasional",
  "location": "GENSET",
  "isActive": true,
  "updatedAt": "2024-01-04T00:00:00.000Z"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not admin) |
| 404 | User not found |
| 422 | Validation error |

---

#### DELETE /users/:id

Delete user.

**Request:**
```http
DELETE /api/users/3
Cookie: accessToken=<jwt_access_token>
```

**Response (200):**
```json
{
  "message": "User deleted"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not admin) |
| 404 | User not found |

---

### 3.3 Stock

#### GET /stock/summary

Get current stock summary per location.

**Request:**
```http
GET /api/stock/summary
Cookie: accessToken=<jwt_access_token>
```

**Response (200):**
```json
{
  "data": [
    {
      "location": "GENSET",
      "total_balance": 1500.50
    },
    {
      "location": "TUG_ASSIST",
      "total_balance": 850.00
    }
  ]
}
```

---

#### POST /stock/in

Input stok masuk (Admin only).

**Request:**
```http
POST /api/stock/in
Cookie: accessToken=<jwt_access_token>
Content-Type: application/json

{
  "date": "2024-01-04T10:00:00.000Z",
  "amount": 500.00,
  "location": "GENSET",
  "notes": "Pengiriman dari supplier"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| date | Optional, ISO 8601 date-time |
| amount | Required, number, > 0 |
| location | Required, enum: `GENSET`, `TUG_ASSIST` |
| notes | Optional, string |

**Response (201):**
```json
{
  "id": 123,
  "type": "IN",
  "amount": 500.00,
  "location": "GENSET",
  "userId": 1,
  "notes": "Pengiriman dari supplier",
  "createdAt": "2024-01-04T10:00:00.000Z"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not admin) |
| 422 | Validation error |

---

#### POST /stock/out

Input pemakaian stok (Operasional only).

**Request:**
```http
POST /api/stock/out
Cookie: accessToken=<jwt_access_token>
Content-Type: application/json

{
  "date": "2024-01-04T14:30:00.000Z",
  "amount": 50.00,
  "notes": "Pemakaian operasional siang"
}
```

**Note:** `location` otomatis diambil dari user yang login.

**Validation:**
| Field | Rules |
|-------|-------|
| date | Optional, ISO 8601 date-time |
| amount | Required, number, > 0 |
| notes | Optional, string |

**Response (201):**
```json
{
  "id": 124,
  "type": "OUT",
  "amount": 50.00,
  "location": "GENSET",
  "userId": 2,
  "notes": "Pemakaian operasional siang",
  "createdAt": "2024-01-04T14:30:00.000Z"
}
```

**Errors:**
| Code | Error |
|------|-------|
| 403 | Forbidden (not operasional) |
| 422 | Validation error |
| 422 | Insufficient stock |

---

#### GET /stock/history

Get transaction history with filters.

**Request:**
```http
GET /api/stock/history?page=1&limit=20&type=IN&location=GENSET&startDate=2024-01-01&endDate=2024-01-31&search=supplier
Cookie: accessToken=<jwt_access_token>
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| type | string | No | Filter by type: `IN`, `OUT` |
| location | string | No | Filter by location: `GENSET`, `TUG_ASSIST` |
| startDate | string | No | Filter start date (ISO 8601) |
| endDate | string | No | Filter end date (ISO 8601) |
| search | string | No | Search in notes field |

**Response (200):**
```json
{
  "data": [
    {
      "id": 123,
      "type": "IN",
      "amount": 500.00,
      "location": "GENSET",
      "userId": 1,
      "userName": "Admin Utama",
      "notes": "Pengiriman dari supplier",
      "createdAt": "2024-01-04T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

#### GET /stock/trend

Get stock trend data for charts.

**Request:**
```http
GET /api/stock/trend?days=7&location=GENSET
Cookie: accessToken=<jwt_access_token>
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Number of days (default: 7) |
| location | string | No | Filter by location: `GENSET`, `TUG_ASSIST` |

**Response (200):**
```json
{
  "data": [
    {
      "transaction_date": "2024-01-01",
      "location": "GENSET",
      "balance": 1500.00,
      "stock_in": 500.00,
      "stock_out": 0.00
    },
    {
      "transaction_date": "2024-01-02",
      "location": "GENSET",
      "balance": 1450.00,
      "stock_in": 0.00,
      "stock_out": 50.00
    }
  ]
}
```

---

#### POST /stock/export

Export transaction history to Excel.

**Request:**
```http
POST /api/stock/export
Cookie: accessToken=<jwt_access_token>
Content-Type: application/json

{
  "type": "IN",
  "location": "GENSET",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "search": "supplier"
}
```

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="stock_export_20240104.xlsx"

<binary file data>
```

---

## 4. Rate Limiting (Optional)

If enabled:

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 requests | 15 minutes |
| /auth/refresh | 10 requests | 1 hour |
| /stock/* | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704345600
```

---

## 5. CORS Configuration

**Allowed Origins:**
```
https://your-domain.com
http://localhost:5173 (development)
```

**Allowed Methods:**
```
GET, POST, PATCH, DELETE, OPTIONS
```

**Allowed Headers:**
```
Content-Type, Authorization
```

**Credentials:**
```
Allowed (cookies)
```

---

## 6. Examples

### Example 1: Complete Login Flow

```bash
# 1. Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@bosowa.co.id","password":"admin123"}'

# 2. Get stock summary (with cookie)
curl https://your-domain.com/api/stock/summary \
  -b cookies.txt

# 3. Input stok masuk
curl -X POST https://your-domain.com/api/stock/in \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"amount":500,"location":"GENSET","notes":"Test"}'

# 4. Logout
curl -X POST https://your-domain.com/api/auth/logout \
  -b cookies.txt
```

### Example 2: Fetch with Auto-Refresh (JavaScript)

```javascript
let isRefreshing = false

async function fetchWithRefresh(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true

    // Try refresh
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshResponse.ok) {
      // Retry original request
      isRefreshing = false
      return fetch(url, { ...options, credentials: 'include' })
    } else {
      // Redirect to login
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  isRefreshing = false
  return response
}
```

---

## 7. WebSocket (Future)

Not implemented in MVP, but reserved for:

- Real-time stock updates
- Live notifications
- Multi-user collaboration

**Proposed endpoint:** `wss://your-domain.com/ws`

**Protocol:** Socket.IO or native WebSocket
