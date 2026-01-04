# Overview - Monitoring BBM Bosowa

> Sistem Pemantauan Stok BBM untuk Tim Bosowa Bandar

---

## Apa itu Monitoring BBM Bosowa?

Sistem berbasis web untuk mencatat dan memantau stok Bahan Bakar Minyak (BBM) untuk lokasi GENSET dan TUG_ASSIST. Sistem memudahkan admin mencatat stok masuk dan operasional mencatat pemakaian BBM dengan pelaporan lengkap.

---

## Fitur Utama

| Fitur | Manfaat |
|-------|---------|
| **Dashboard** | Lihat stok terkini secara real-time |
| **Input Transaksi** | Catat stok masuk dan pemakaian dengan mudah |
| **Riwayat & Filter** | Lacak semua transaksi dengan berbagai filter |
| **Grafik Tren** | Visualisasi tren stok dan pemakaian |
| **Export Excel** | Unduh laporan untuk analisis lebih lanjut |
| **Multi-user** | Akses berbeda untuk admin dan operasional |

---

## Pengguna

| Role | Akses |
|------|-------|
| **Admin** | Input stok masuk, kelola user, lihat semua data |
| **Operasional** | Input pemakaian, lihat data (read-only) |

---

## Teknologi

Sistem dirancang **ringan** untuk VPS 2GB RAM:

| Komponen | Teknologi |
|----------|-----------|
| Backend | Fastify (Node.js) |
| Database | MySQL |
| Frontend | Svelte + Skeleton UI |
| Charts | Chart.js |
| Auth | JWT |

---

## Alur Kerja Singkat

```
Admin → Input Stok Masuk → Database → Dashboard Update
                           ↓
Operasional → Input Pemakaian → Database → Dashboard Update
                           ↓
Semua User → Lihat Riwayat → Filter → Export Excel
```

---

## Quick Stats

| Metric | Target |
|--------|--------|
| RAM Usage | < 700MB |
| API Response | < 200ms |
| Uptime | 99.5% |
| Users | ~10-20 |

---

## Dokumentasi Lengkap

- **PRD**: `docs/prd.md` - Spesifikasi teknis lengkap
- **Database**: `docs/database.md` - Struktur database
- **API**: `docs/api.md` - Endpoint dokumentasi
- **Security**: `docs/security.md` - Keamanan sistem
- **Deployment**: `docs/optional/deployment.md` - Panduan install

---

## Kontak & Support

- **Project**: Monitoring BBM Bosowa
- **Version**: 1.0
- **Last Updated**: 2026-01-04

---

*Untuk pertanyaan teknis, lihat dokumentasi di folder `docs/`*
