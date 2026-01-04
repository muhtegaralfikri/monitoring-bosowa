# PRD - Product Requirement Document
## Monitoring BBM Bosowa (Lite Version)

> Version: 1.0
> Last Updated: 2026-01-04
> Status: Draft

---

## 1. Overview

Sistem pemantauan dan pencatatan stok bahan bakar minyak (BBM) untuk tim Bosowa Bandar. Sistem ini mencatat semua transaksi masuk (penambahan stok) dan transaksi keluar (pemakaian BBM) dengan pelacakan riwayat, laporan tren, dan kemampuan ekspor data.

**Target Deployment:** VPS Ubuntu 2GB RAM / 2 vCPU dengan aaPanel

---

## 2. Tech Stack & Library

### 2.1 Backend

| Komponen | Pilihan | Versi | Alasan |
|----------|---------|-------|--------|
| **Runtime** | Node.js | 20 LTS | LTS stable |
| **Framework** | Fastify | 5.x | Ringan (30-50MB RAM), 20-30% lebih cepat dari Express |
| **ORM** | Drizzle ORM | 0.36+ | Sangat ringan (0-5MB), type-safe, syntax SQL-like |
| **Database** | MySQL | 8.0+ | Kebijakan perusahaan |
| **Validation** | Zod | 3.x | Ringan, terintegrasi dengan Fastify |
| **Auth** | JWT | - | Stateless, scalable |
| **Password** | bcrypt | 5.x | Hashing password standard |

**Dependencies:**
```json
{
  "fastify": "^5.2.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/jwt": "^8.0.1",
  "@fastify/cookie": "^11.0.2",
  "@fastify/cors": "^9.0.1",
  "drizzle-orm": "^0.36.4",
  "mysql2": "^3.11.0",
  "bcrypt": "^5.1.1",
  "zod": "^3.23.8",
  "dotenv": "^16.4.5"
}
```

### 2.2 Frontend

| Komponen | Pilihan | Versi | Alasan |
|----------|---------|-------|--------|
| **Framework** | Svelte | 5.x | Compiled ke vanilla JS, hampir zero overhead |
| **UI Library** | Skeleton UI | 2.x | Ringan, modern, Svelte-native |
| **Charts** | Chart.js | 4.x | Ringan, mudah, fleksibel |
| **HTTP Client** | Fetch API | Native | Built-in browser |
| **Build Tool** | Vite | 6.x | Fast HMR, optimized build |

**Dependencies:**
```json
{
  "@sveltejs/vite-plugin-svelte": "^4.0.0",
  "svelte": "^5.0.0",
  "svelte-knex": "^2.0.0", // atau svelte-navigator
  "@skeletonlabs/skeleton": "^2.10.0",
  "chart.js": "^4.4.0"
}
```

---

## 3. Technical Specifications

### 3.1 Infrastructure Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 2 GB | 2 GB |
| **CPU** | 2 vCPU | 2 vCPU |
| **Storage** | 20 GB | 40 GB |
| **OS** | Ubuntu 22.04+ | Ubuntu 22.04+ |
| **Web Server** | Nginx (via aaPanel) | Nginx |

### 3.2 Port Configuration

| Service | Port |
|---------|------|
| Backend API | 4111 |
| MySQL | 3306 |
| Nginx (Frontend) | 80 / 443 |

### 3.3 Environment Variables

**Backend (.env):**
```env
# Server
PORT=4111
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=monitoring_bosowa
DB_USER=monitoring_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_ACCESS_TTL=24h
JWT_REFRESH_TTL=30d

# CORS
FRONTEND_URL=https://your-domain.com

# Timezone
TZ=Asia/Makassar
```

**Frontend (.env):**
```env
VITE_API_URL=https://your-domain.com/api
VITE_APP_NAME=Monitoring BBM Bosowa
```

---

## 4. Task Requirements (User Stories)

### 4.1 Autentikasi & Authorization

| ID | Story | Priority | Role |
|----|-------|----------|------|
| AUTH-1 | Login dengan email dan password | P0 | All |
| AUTH-2 | Sistem membedakan role admin dan operasional | P0 | All |
| AUTH-3 | Session expire setelah 24 jam tidak aktif | P0 | All |
| AUTH-4 | Auto-refresh token sebelum expired (user tidak sadari) | P1 | All |
| AUTH-5 | Logout menghapus session dari server | P0 | All |

### 4.2 Manajemen Stok (Admin)

| ID | Story | Priority | Role |
|----|-------|----------|------|
| STOK-1 | Input stok BBM masuk (tanggal, jumlah, lokasi, keterangan) | P0 | Admin |
| STOK-2 | Melihat ringkasan stok saat ini (total per lokasi) | P0 | Admin |
| STOK-3 | Melihat grafik tren stok (periode waktu) | P1 | Admin |
| STOK-4 | Melihat grafik tren in/out (periode waktu) | P1 | Admin |

### 4.3 Pencatatan Pemakaian (Operasional)

| ID | Story | Priority | Role |
|----|-------|----------|------|
| PAKAI-1 | Input pemakaian BBM (tanggal, jumlah, lokasi, keterangan) | P0 | Operasional |
| PAKAI-2 | Operasional hanya bisa input untuk lokasinya sendiri | P0 | Operasional |
| PAKAI-3 | Melihat sisa stok saat ini (read-only) | P1 | Operasional |

### 4.4 Riwayat & Laporan

| ID | Story | Priority | Role |
|----|-------|----------|------|
| RIWAYAT-1 | Melihat riwayat semua transaksi dengan pagination | P0 | All |
| RIWAYAT-2 | Filter riwayat berdasarkan tanggal (start-end) | P0 | All |
| RIWAYAT-3 | Filter riwayat berdasarkan jenis (masuk/keluar) | P0 | All |
| RIWAYAT-4 | Filter riwayat berdasarkan lokasi | P0 | All |
| RIWAYAT-5 | Search riwayat berdasarkan kata kunci (keterangan) | P1 | All |
| RIWAYAT-6 | Ekspor riwayat terfilter ke Excel (.xlsx) | P0 | All |

### 4.5 Manajemen Pengguna (Admin)

| ID | Story | Priority | Role |
|----|-------|----------|------|
| USER-1 | Melihat daftar semua pengguna | P0 | Admin |
| USER-2 | Menambah pengguna baru | P0 | Admin |
| USER-3 | Mengedit data pengguna (nama, email, role, lokasi) | P0 | Admin |
| USER-4 | Menghapus pengguna | P1 | Admin |
| USER-5 | Mengubah password pengguna | P1 | Admin |

---

## 5. Fitur Utama Sistem

### 5.1 Dashboard (Per Role)

**Admin Dashboard:**
- Ringkasan stok hari ini (total per lokasi: GENSET, TUG_ASSIST)
- Grafik tren stok 7 hari terakhir
- Grafik tren in/out 7 hari terakhir
- Quick action: Input stok masuk

**Operasional Dashboard:**
- Ringkasan stok hari ini (read-only)
- Quick action: Input pemakaian

### 5.2 Input Transaksi

**Stok Masuk (Admin only):**
- Field: Tanggal, Jumlah (liter), Lokasi, Keterangan
- Validasi: Jumlah > 0

**Pemakaian (Operasional only):**
- Field: Tanggal, Jumlah (liter), Keterangan
- Lokasi otomatis dari user location

### 5.3 Riwayat Transaksi

- Tabel dengan pagination (20 data per halaman)
- Kolom: Tanggal, Jenis, Lokasi, Jumlah, User, Keterangan
- Filter: Tanggal, Jenis, Lokasi
- Search: Keterangan
- Sortable: Tanggal, Jumlah
- Export ke Excel

### 5.4 Grafik & Chart

- **Tren Stok:** Line chart, sumbu X = tanggal, sumbu Y = total stok
- **Tren In/Out:** Line chart ganda, 2 line (masuk & keluar)
- Periode: 7 hari, 30 hari, custom range

### 5.5 Manajemen Pengguna

- CRUD pengguna lengkap
- Role: Admin, Operasional
- Location binding untuk role Operasional

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| API Response Time | < 200ms (p95) |
| Page Load Time | < 2s |
| Database Query | < 100ms (avg) |

### 6.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | bcrypt (cost 10) |
| SQL Injection prevention | Parameterized query (Drizzle) |
| XSS prevention | Input sanitization, httpOnly cookie |
| CSRF prevention | SameSite cookie |
| HTTPS | Wajib di production |

### 6.3 Availability

- Uptime target: 99.5%
- Backup database: Daily (aaPanel backup)

---

## 7. Constraints

### 7.1 Technical Constraints

- VPS: 2GB RAM, 2 vCPU
- Database: MySQL 8.0+ (kebijakan perusahaan)
- No Redis
- No Docker

### 7.2 Business Constraints

- Timezone: Asia/Makassar
- Lokasi: GENSET, TUG_ASSIST (bisa ditambah)
- Satuan: Liter

---

## 8. Success Criteria

- [ ] User bisa login dan logout
- [ ] Admin bisa input stok masuk
- [ ] Operasional bisa input pemakaian
- [ ] Riwayat bisa difilter dan diekspor
- [ ] Grafik tren muncul dengan data benar
- [ ] RAM usage < 700MB di production
- [ ] API response time < 200ms

---

## 9. Roadmap

### Phase 1: MVP (Week 1-2)
- [ ] Auth & User Management
- [ ] Stock In (Admin)
- [ ] Stock Out (Operasional)
- [ ] Dashboard basic

### Phase 2: Reporting (Week 3)
- [ ] Riwayat & Filter
- [ ] Export Excel
- [ ] Grafik Tren

### Phase 3: Enhancement (Week 4)
- [ ] Notifikasi stok menipis
- [ ] Laporan PDF
- [ ] Mobile responsive improvement
