# Laporan Tinjauan Patch Keamanan Supabase

## Status

Dokumen ini menggantikan klaim pengujian pada versi laporan sebelumnya. Pada 2026-10-26, skrip migrasi lokal ditinjau dan diperbaiki secara statis. Tidak ada migrasi yang dijalankan terhadap proyek Supabase.

Pemeriksaan read-only melalui Supabase Dashboard menunjukkan tidak ada tabel target (`profiles`, `properties`, `property_images`, `leads`) pada skema `public` saat diperiksa. Riwayat migrasi belum diverifikasi.

## Perubahan lokal

- Definisi fungsi pemeriksaan admin dan fungsi trigger sekarang mendahului pembuatan trigger.
- Akses baca profil publik dihapus; profil dibatasi untuk pemilik dan admin.
- Kebijakan properti menjaga kepemilikan pada insert/update dan mencegah agen mengubah listing menjadi `published`.
- Kondisi pemeriksaan kepemilikan yang sebelumnya membandingkan `id = id` dihapus.
- Aturan akses gambar mengikuti status publikasi dan kepemilikan properti.
- Pengunjung dapat mengirim lead terbatas untuk properti terbit; pembacaan lead dibatasi untuk agen terkait dan admin.
- Fungsi `SECURITY DEFINER` memakai search path tetap dan referensi skema eksplisit.

## File terkait

- `supabase/migrations/20261025000000_init_schema.sql`
- `supabase/migrations/20261025010000_patch_security.sql`
- `supabase/migrations/20261025020000_security_hardening.sql`

## Batas verifikasi

Perubahan hanya diperiksa secara statis dari teks SQL. Skrip tidak dieksekusi terhadap server PostgreSQL lokal maupun database Supabase, dan kebijakan belum diuji secara perilaku. Jangan menganggap perubahan ini telah diterapkan atau terverifikasi di database.

Sebelum penerapan, pastikan proyek dan riwayat migrasi benar, tinjau perbedaan skema aktual, siapkan provisioning admin yang aman, dan uji kebijakan dengan role anon, agen, dan admin pada lingkungan nonproduksi.

Skema tabel juga masih perlu dipetakan terhadap tipe aplikasi, khususnya gambar properti, profil, dan leads. Storage policy/bucket, autentikasi produksi, serta rate limiting lead belum disiapkan oleh perubahan ini.
