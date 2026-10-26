# Laporan Tinjauan Hardening Supabase

## Status

Laporan ini menggantikan status pengujian sebelumnya. Migrasi lokal telah ditinjau dan diperbaiki secara statis pada 2026-10-26. Belum ada SQL yang dijalankan atau kebijakan yang diubah pada proyek Supabase.

Query metadata yang dijalankan oleh pemilik proyek menunjukkan nol tabel target di skema `public`. Keadaan ini belum memastikan riwayat migrasi, skema lain, atau bahwa database kosong sepenuhnya.

## Pemeriksaan dan perbaikan

- Fungsi admin dibuat dengan `SECURITY DEFINER`, `search_path` tetap, dan nama skema eksplisit.
- Fungsi trigger perubahan role didefinisikan sebelum trigger dibuat.
- Kebijakan permisif terdahulu dihapus sebelum kebijakan pengganti dibuat, mencegah gabungan kebijakan `OR` memperluas akses.
- Pengunjung anonim hanya dapat membaca properti terbit dan metadata gambar untuk properti terbit.
- Agen dibatasi pada properti miliknya; validasi kepemilikan tidak lagi memakai kondisi tautologis `id = id`.
- Publikasi properti dan pengelolaan lintas pemilik dibatasi kepada admin.
- Akses profil dan leads tidak dibuka kepada pengunjung publik; insert lead anonim dibatasi pada listing terbit.
- Hak SQL eksplisit ditambahkan bersama kebijakan RLS.

## File migrasi

- `supabase/migrations/20261025000000_init_schema.sql`
- `supabase/migrations/20261025010000_patch_security.sql`
- `supabase/migrations/20261025020000_security_hardening.sql`

## Risiko dan pekerjaan tersisa

- SQL hanya diperiksa secara statis dan belum diuji dengan PostgreSQL atau Supabase; ini bukan sertifikasi keamanan.
- Riwayat migrasi aktual perlu diperiksa sebelum skrip apa pun dijalankan.
- Admin awal harus diprovisikan melalui proses tepercaya; jangan melalui frontend publik.
- Struktur tabel belum sepenuhnya sesuai tipe aplikasi, khususnya `image`/`property_images`, kolom profil, dan catatan lead.
- Supabase Storage belum disiapkan; bucket dan policy storage membutuhkan tinjauan terpisah.
- Autentikasi produksi, rate limiting anti-spam untuk lead, dan pengujian RLS otomatis belum termasuk.

Jangan jalankan skrip pada database berisi data tanpa rencana migrasi dan persetujuan eksplisit.
