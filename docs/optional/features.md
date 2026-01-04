# Fitur Lengkap - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04

---

## 1. Autentikasi & User Management

### 1.1 Login

**Halaman:** `/login`

**Deskripsi:** Halaman login untuk mengakses sistem.

**Screenshot:**
```
┌─────────────────────────────────────┐
│                                     │
│       MONITORING BBM BOSOWA         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email                         │  │
│  │ [admin@bosowa.co.id        ]  │  │
│  │                               │  │
│  │ Password                      │  │
│  │ [••••••••••••••••          ]  │  │
│  │                               │  │
│  │       [  Login  ]            │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Field:**
| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| Email | Email | Ya | Email terdaftar |
| Password | Password | Ya | Minimum 6 karakter |

**Validasi:**
- Email harus valid format
- Password minimum 6 karakter
- Salah 3x → tampilkan captcha (opsional)

---

### 1.2 User Management (Admin Only)

**Halaman:** `/users`

**Deskripsi:** Kelola pengguna sistem (CRUD).

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Users                                    [+ Add User]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Email            │ Name           │ Role    │ Action      │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ admin@bosowa..   │ Admin Utama    │ admin   │ [Edit]      │ │
│  │ genset@bosowa..  │ Operator GENSET │ oper.. │ [Edit]      │ │
│  │ tugassist@bos..  │ Operator TUG   │ oper.. │ [Edit]      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Pagination: [< 1] 2 3 ...                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Action Buttons:**
- **Add User**: Buka form tambah user
- **Edit**: Edit data user
- **Delete**: Hapus user (dengan konfirmasi)

---

## 2. Dashboard

### 2.1 Admin Dashboard

**Halaman:** `/dashboard`

**Deskripsi:** Ringkasan stok dan aksi cepat untuk admin.

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │   GENSET    │  │ TUG ASSIST  │                             │
│  │             │  │             │                             │
│  │ 1,500 Liter │  │  850 Liter  │                             │
│  └─────────────┘  └─────────────┘                             │
│                                                                 │
│  [+ Input Stok Masuk]                                          │
│                                                                 │
│  Quick Actions:                                                 │
│  • [View History]  [View Charts]  [Manage Users]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- Stock Summary Cards (per lokasi)
- Quick Action Button
- Navigation Links

---

### 2.2 Operasional Dashboard

**Halaman:** `/dashboard`

**Deskripsi:** Ringkasan stok dan aksi input pemakaian.

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard - Operasional (GENSET)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │   GENSET    │  │ TUG ASSIST  │                             │
│  │             │  │             │                             │
│  │ 1,500 Liter │  │  850 Liter  │                             │
│  └─────────────┘  └─────────────┘                             │
│                                                                 │
│  [+ Input Pemakaian]                                           │
│                                                                 │
│  Quick Actions:                                                 │
│  • [View History]  [View Charts]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- Stock Summary Cards (read-only)
- Input Pemakaian Button
- Navigation Links

---

## 3. Transaksi

### 3.1 Input Stok Masuk (Admin)

**Trigger:** Button [+ Input Stok Masuk] di Dashboard

**Screenshot Modal:**
```
┌─────────────────────────────────────┐
│  Input Stok Masud          [X]      │
├─────────────────────────────────────┤
│                                     │
│  Tanggal                            │
│  [2024-01-04              ]        │
│                                     │
│  Jumlah (Liter)                     │
│  [500                   ]          │
│                                     │
│  Lokasi                             │
│  [GENSET                 ▼]        │
│                                     │
│  Keterangan                         │
│  [Pengiriman dari supplier  ]      │
│                                     │
│           [Batal]  [Simpan]        │
│                                     │
└─────────────────────────────────────┘
```

**Validasi:**
- Jumlah > 0
- Lokasi wajib dipilih
- Max keterangan 500 karakter

---

### 3.2 Input Pemakaian (Operasional)

**Trigger:** Button [+ Input Pemakaian] di Dashboard

**Screenshot Modal:**
```
┌─────────────────────────────────────┐
│  Input Pemakaian            [X]      │
├─────────────────────────────────────┤
│                                     │
│  Tanggal                            │
│  [2024-01-04              ]        │
│                                     │
│  Jumlah (Liter)                     │
│  [50                    ]          │
│                                     │
│  Lokasi: GENSET (auto dari user)    │
│                                     │
│  Keterangan                         │
│  [Pemakaian operasional     ]      │
│                                     │
│           [Batal]  [Simpan]        │
│                                     │
└─────────────────────────────────────┘
```

**Validasi:**
- Jumlah > 0
- Jumlah ≤ stok tersedia
- Max keterangan 500 karakter

**Error Handling:**
- Jika stok tidak cukup: "Stok tidak mencukupi. Sisa: XXX liter"

---

## 4. Riwayat & Laporan

### 4.1 History Page

**Halaman:** `/history`

**Deskripsi:** Tabel riwayat transaksi dengan filter.

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Riwayat Transaksi                              [Export Excel]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Filters:                                                        │
│ Tanggal: [01/01/2024] s/d [31/01/2024]                          │
│ Jenis:    [Semua     ▼]  Lokasi: [Semua     ▼]                │
│ Search:   [Cari keterangan...                    ]            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Tanggal    │ Jenis │ Lokasi  │ Jumlah │ User   │ Ket     │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ 04/01/2024 │ IN    │ GENSET  │ 500 L  │ Admin  │ Kirim.. │ │
│  │ 04/01/2024 │ OUT   │ GENSET  │ 50 L   │ Op..   │ Pemaka..│ │
│  │ 03/01/2024 │ OUT   │ TUG_A.. │ 100 L  │ Op..   │ Pemaka..│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Showing 1-3 of 150      [< 1] 2 3 ... 10                     │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur:**
- Filter tanggal (start-end)
- Filter jenis (IN/OUT/Semua)
- Filter lokasi
- Search keterangan
- Sortable columns
- Pagination (20 per halaman)
- Export to Excel

---

### 4.2 Export Excel

**Trigger:** Button [Export Excel]

**Output:** File `.xlsx` dengan data sesuai filter aktif.

**Columns:**
| No | Tanggal | Jenis | Lokasi | Jumlah (Liter) | User | Keterangan |
|----|---------|-------|--------|----------------|------|------------|

---

## 5. Grafik & Charts

### 5.1 Charts Page

**Halaman:** `/charts`

**Deskripsi:** Visualisasi tren stok dan pemakaian.

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Grafik Tren                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Periode: [7 Hari   ▼]  Lokasi: [Semua   ▼]                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 2000 ┤                                                      │ │
│  │      │         ╭─╮                                          │ │
│  │ 1500 ┤     ╭─╮╭─╮╭╮╭─╮                                        │ │
│  │      │   ╭─╮╭─╮╭╮╭╮╭╮╭─╮    GENSET  ══════               │ │
│  │ 1000 ┤ ╭─╮╭─╮╭╮╭╮╭╮╭╮╭╮╭╮                TUG_ASS - - - -   │ │
│  │      │╭─╮╭╮╭╮╭╮╭╮╭╮╭╮╭╮╭╮                                 │ │
│  │  500 ┤╭╮╭╮╭╮╭╮╭╮╭╮╭╮╭╮╭╮                                    │ │
│  │      └┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴─────────────────────────────────│ │
│  │        1   2   3   4   5   6   7                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur:**
- Pilih periode: 7 hari, 30 hari
- Filter lokasi: Semua, GENSET, TUG_ASSIST
- Line chart: tren stok
- Legend & tooltips
- Responsive

---

## 6. Responsive Design

### 6.1 Mobile View

**Layout:** Stacked cards, hamburger menu

**Screenshot:**
```
┌─────────────────┐
│ ☰  Monitoring   │
├─────────────────┤
│                 │
│ ┌─────────────┐ │
│ │   GENSET    │ │
│ │ 1,500 L     │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ TUG ASSIST  │ │
│ │  850 L     │ │
│ └─────────────┘ │
│                 │
│ [+ Input Stok]  │
│                 │
└─────────────────┘
```

---

## 7. Fitur Tambahan (Future)

### 7.1 Notifikasi Stok Menipis

**Deskripsi:** Notifikasi saat stok di bawah threshold.

**Screenshot:**
```
┌─────────────────────────────────────┐
│         ⚠️ Peringatan               │
├─────────────────────────────────────┤
│                                     │
│  Stok GENSET menipis!               │
│  Sisa: 150 liter                    │
│  Threshold: 200 liter               │
│                                     │
│  [OK] [Order Stok]                 │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 Laporan PDF

**Deskripsi:** Generate PDF laporan bulanan.

### 7.3 Multi-location Support

**Deskripsi:** Tambah lokasi baru tanpa coding.

---

## 8. User Journey Summary

### Admin Journey

```
Login → Dashboard → Input Stok → Charts → History → Export → Logout
   ↓         ↓
Users → Add User → Edit User → Delete User
```

### Operasional Journey

```
Login → Dashboard → Input Pemakaian → Charts → History → Logout
```

---

## 9. Keyboard Shortcuts (Future)

| Shortcut | Action |
|----------|--------|
| `Alt + I` | Open input modal |
| `Alt + H` | Go to history |
| `Alt + C` | Go to charts |
| `ESC` | Close modal |
