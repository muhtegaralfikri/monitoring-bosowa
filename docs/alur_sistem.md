# Alur Sistem - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04

---

## 1. Proses Bisnis

### 1.1 Gambaran Umum

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALUR BISNIS MONITORING BBM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SUPPLIER          ADMIN           OPERASIONAL      MANAJEMEN    │
│    │               │                  │               │         │
│    │               │                  │               │         │
│    ├─ Kirim BBM ──►│                  │               │         │
│    │               │                  │               │         │
│    │            ┌──┴──┐            ┌──┴──┐            │         │
│    │            │Input│            │Input│            │         │
│    │            │Stok │            │Pakai│            │         │
│    │            └──┬──┘            └──┬──┘            │         │
│    │               │                  │               │         │
│    │               └──────┬───────────┘               │         │
│    │                      ▼                           │         │
│    │               ┌──────────┐                      │         │
│    │               │ DATABASE │                      │         │
│    │               │   MySQL  │                      │         │
│    │               └────┬─────┘                      │         │
│    │                    │                            │         │
│    │                    ▼                            │         │
│    │               ┌──────────┐                      │         │
│    │               │ SISTEM   │                      │         │
│    │               │ PROSES   │                      │         │
│    │               └────┬─────┘                      │         │
│    │                    │                            │         │
│    │     ┌──────────────┼──────────────┐            │         │
│    │     ▼              ▼               ▼            │         │
│    │  Dashboard      Riwayat       Grafik           │         │
│    │  (Real-time)   (History)     (Trend)           │         │
│    │     │              │               │            │         │
│    └─────┴──────────────┴───────────────┴────────────►         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Input → Proses → Output

### 2.1 Login & Authentication

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  USER    │────►│  INPUT   │────►│ PROSES   │────►│  OUTPUT  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                     │                  │                │
                     ▼                  ▼                ▼
              Email + Password    Verify user    Access Token
                                    dari DB       + Refresh Token
                                                  di httpOnly Cookie
```

**Detail Proses:**
1. User input email & password
2. Backend validate dengan database
3. Generate JWT Access Token (24h) + Refresh Token (30d)
4. Simpan Refresh Token di database
5. Return token via httpOnly cookie
6. Redirect ke dashboard sesuai role

---

### 2.2 Input Stok Masuk (Admin)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  ADMIN   │────►│  INPUT   │────►│ PROSES   │────►│  OUTPUT  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                     │                  │                │
                     ▼                  ▼                ▼
              • Tanggal          Validate:       • Success msg
              • Jumlah           - Auth token    • Update dashboard
              • Lokasi           - Admin role    • Chart refresh
              • Keterangan       - Jumlah > 0
                                 Insert ke DB    • Notify user
```

**Detail Proses:**
1. Admin click tombol "Input Stok Masuk"
2. Isi form: tanggal, jumlah, lokasi, keterangan
3. Frontend validate client-side
4. POST `/api/stock/in` dengan access token
5. Backend validate: auth token, admin role, jumlah > 0
6. Insert ke tabel `transactions` (type = 'IN')
7. Return success
8. Dashboard update otomatis

---

### 2.3 Input Pemakaian (Operasional)

```
┌──────────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  OPERASIONAL     │────►│  INPUT   │────►│ PROSES   │────►│  OUTPUT  │
└──────────────────┘     └──────────┘     └──────────┘     └──────────┘
                           │                  │                │
                           ▼                  ▼                ▼
                    • Tanggal          Validate:       • Success msg
                    • Jumlah           - Auth token    • Update dashboard
                    • Keterangan       - Operasional   • Chart refresh
                    - Lokasi           role
                    (auto dari         - Jumlah > 0
                    user)              - Cek stok
                                       cukup
```

**Detail Proses:**
1. Operasional click tombol "Input Pemakaian"
2. Isi form: tanggal, jumlah, keterangan (lokasi auto dari user)
3. Frontend validate client-side
4. POST `/api/stock/out` dengan access token
5. Backend validate: auth token, operasional role, jumlah > 0, stok cukup
6. Insert ke tabel `transactions` (type = 'OUT')
7. Return success
8. Dashboard update otomatis

---

### 2.4 View Riwayat & Filter

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   USER   │────►│  INPUT   │────►│ PROSES   │────►│  OUTPUT  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                     │                  │                │
                     ▼                  ▼                ▼
              • Filter tanggal   Query DB       • Tabel data
              • Filter jenis     dengan         • Pagination
              • Filter lokasi    WHERE clause   • Total records
              • Search kata      dan LIMIT      • Export Excel
                kunci
```

**Detail Proses:**
1. User buka halaman riwayat
2. Apply filter (tanggal, jenis, lokasi, search)
3. Frontend build query params
4. GET `/api/stock/history?page=1&limit=20&...`
5. Backend validate auth token
6. Query database dengan filter
7. Return data dengan pagination
8. Frontend render table
9. User click export → POST `/api/stock/export` → download Excel

---

### 2.5 Grafik Tren

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   USER   │────►│  INPUT   │────►│ PROSES   │────►│  OUTPUT  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                     │                  │                │
                     ▼                  ▼                ▼
              • Periode          Aggregasi       • Line chart
                (7/30 hari)       data per      • Labels tanggal
                                  tanggal        • Values stok
                                                 • Export image
```

**Detail Proses:**
1. User buka halaman grafik
2. Pilih periode (7 hari, 30 hari, custom)
3. Frontend call `/api/stock/trend?days=7`
4. Backend:
   - Query semua transaction dalam periode
   - Group by date
   - Sum IN dan OUT
   - Calculate running balance
5. Return array: `[{date, stockIn, stockOut, balance}, ...]`
6. Frontend render Chart.js line chart

---

## 3. State Transition

### 3.1 State Stok

```
    ┌─────────┐
    │  STOK   │
    │  AWAL   │
    └────┬────┘
         │
         │ (Input Stok Masuk)
         ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ STOK +X │────►│ STOK Y  │────►│ STOK -X │
    └─────────┘     └─────────┘     └─────────┘
                            │
                            │ (Input Pemakaian)
                            ▼
                     ┌──────────────┐
                     │  STOK < MIN  │──► NOTIFIKASI
                     └──────────────┘
```

### 3.2 State User Authentication

```
    ┌─────────┐
    │ GUEST   │
    └────┬────┘
         │
         │ (Login success)
         ▼
    ┌─────────┐
    │ AUTHED  │
    └────┬────┘
         │
         ├──► (24h inactive) ──► TOKEN_EXPIRED ──► AUTO_REFRESH
         │                                              │
         │                                              │ (refresh ok)
         │                                              ▼
         │                                         ┌─────────┐
         │                                         │ AUTHED  │
         │                                         └─────────┘
         │
         └──► (Logout) ──► GUEST
```

---

## 4. Data Flow Diagram

### 4.1 Login Flow

```
┌─────────┐                                    ┌─────────────┐
│ Browser │                                    │   MySQL DB  │
└────┬────┘                                    └──────┬──────┘
     │                                                │
     │ 1. POST /login {email, password}               │
     ├────────────────────────────────────────────────►│
     │                                                │ 2. Query user
     │                                                │    by email
     │ 3. Return user data                            │
     │◄───────────────────────────────────────────────┤
     │                                                │
     │ 4. Verify password                             │
     │ 5. Generate JWT                                │
     │                                                │
     │ 6. INSERT refresh_token                        │
     ├────────────────────────────────────────────────►│
     │                                                │
     │ 7. Return success + Set cookie                 │
     │◄───────────────────────────────────────────────┤
     │                                                │
     │ 8. Redirect /dashboard                         │
     │                                                │
```

### 4.2 Stock Transaction Flow

```
┌─────────┐          ┌─────────────┐          ┌─────────────┐
│ Browser │          │ Fastify API │          │   MySQL DB  │
└────┬────┘          └──────┬──────┘          └──────┬──────┘
     │                     │                         │
     │ 1. POST /stock/in                         │
     ├────────────────────►│                         │
     │                     │ 2. Validate JWT        │
     │                     │ 3. Validate Role       │
     │                     │                         │
     │                     │ 4. INSERT transaction   │
     │                     ├────────────────────────►│
     │                     │                         │ 5. Return success
     │                     │◄────────────────────────┤
     │                     │                         │
     │ 6. Return 200 OK    │                         │
     │◄────────────────────┤                         │
     │                     │                         │
     │ 7. Refresh chart    │                         │
     │                     │                         │
```

---

## 5. Error Handling Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    USER     │────►│   ACTION    │────►│   SYSTEM    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   ERROR?    │────►│     NO      │────► SUCCESS
                    └──────┬──────┘     └─────────────┘
                           │ YES
                           ▼
                    ┌─────────────┐
                    │ ERROR TYPE  │
                    └──────┬──────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
┌─────────┐          ┌─────────┐          ┌─────────┐
│  401    │          │  403    │          │  400/   │
│Unauth   │          │Forbidden│          │  422    │
└────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │
     ▼                    ▼                    ▼
Redirect Login      Show Error         Show Validation
                    Message            Message
```

---

## 6. Sequence Diagrams

### 6.1 Admin Input Stok

```
Admin      Frontend       API          DB          Dashboard
  │           │            │            │              │
  │─Click "Input Stok"────►│            │              │
  │           │            │            │              │
  │─Fill Form──────────────►│            │              │
  │           │            │            │              │
  │─Submit─────────────────►│            │              │
  │           │            │            │              │
  │           │─POST /stock/in─────────►│              │
  │           │            │            │              │
  │           │            │─INSERT transaction─────►│
  │           │            │            │              │
  │           │            │◄────success─────────────┤
  │           │            │            │              │
  │           │◄───200 OK───│            │              │
  │           │            │            │              │
  │◄──Show Success│         │            │              │
  │           │            │            │              │
  │           │─GET /stock/summary─────────────────────►│
  │           │            │            │              │
  │           │◄───────────────────────────────────────┤
  │           │            │            │              │
  │           │─Update Chart──────────────────────────►│
```

---

## 7. User Journey Map

### 7.1 Admin Journey

| Step | Action | Screen | Expected Output |
|------|--------|--------|-----------------|
| 1 | Buka aplikasi | Login Page | Form login |
| 2 | Input kredensial | Login Page | Redirect dashboard |
| 3 | Lihat ringkasan stok | Dashboard | Total stok per lokasi |
| 4 | Input stok masuk | Form Input | Success, dashboard update |
| 5 | Lihat grafik tren | Chart Page | Line chart stok |
| 6 | Filter riwayat | History Page | Filtered table |
| 7 | Export data | History Page | Download .xlsx |
| 8 | Logout | Any | Redirect login |

### 7.2 Operasional Journey

| Step | Action | Screen | Expected Output |
|------|--------|--------|-----------------|
| 1 | Buka aplikasi | Login Page | Form login |
| 2 | Input kredensial | Login Page | Redirect dashboard |
| 3 | Lihat sisa stok | Dashboard | Stok saat ini (read-only) |
| 4 | Input pemakaian | Form Input | Success, dashboard update |
| 5 | Lihat riwayat | History Page | Transaction history |
| 6 | Logout | Any | Redirect login |
