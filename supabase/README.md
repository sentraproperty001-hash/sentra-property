# Panduan Supabase Sentra Property

## Konfigurasi lokal

1. Salin `.env.example` menjadi `.env.local` di root proyek.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan Project URL dan publishable key/anon key dari dashboard Supabase.
3. Jangan gunakan `service_role` key atau secret key di aplikasi frontend, dan jangan membagikan isi `.env.local`.

`.env.local` diabaikan oleh Git. Website tetap menggunakan data demo ketika konfigurasi Supabase belum tersedia.

## Status migrasi

File migrasi lokal menggambarkan skema yang direncanakan dan tidak membuktikan kondisi database aktual. Skrip tersebut **belum dijalankan oleh proses ini**.

Sebelum penerapan, periksa database dan riwayat migrasi melalui Supabase Dashboard. Jangan menjalankan ulang migrasi pada database yang sudah memiliki tabel atau skema yang berbeda. Perubahan pada file migrasi yang sudah pernah diterapkan tidak memperbarui database secara otomatis.

Jika database memang baru dan kosong, tinjau ketiga skrip berikut secara berurutan di SQL Editor:

1. `migrations/20261025000000_init_schema.sql`
2. `migrations/20261025010000_patch_security.sql`
3. `migrations/20261025020000_security_hardening.sql`

Jalankan secara manual hanya setelah skema dan kebijakan RLS ditinjau serta pemilik proyek menyetujui penerapannya. Skrip tidak menghapus tabel atau baris, tetapi memasang kebijakan akses dan fungsi/trigger. Hak API `DELETE` tidak diberikan oleh skrip. Jangan menganggap menjalankan skrip tersebut sebagai prosedur aman untuk database yang sudah berisi data tanpa rencana migrasi khusus.

## Catatan akses dan integrasi

- Pengunjung anonim hanya diberi akses baca listing berstatus `published`, metadata gambar milik listing terbit, dan pengiriman lead untuk listing terbit.
- Profil dibatasi untuk pemilik profil dan admin. Login demo aplikasi belum menjadi autentikasi Supabase.
- Peran admin memerlukan profil yang diprovisikan secara aman. Jangan membuat admin melalui frontend publik.
- Tabel `property_images` menyimpan metadata/path gambar; bucket Supabase Storage dan kebijakannya belum dikonfigurasi oleh skrip ini.
- Skema database belum sepenuhnya cocok dengan tipe `Property`, `Profile`, dan `Lead` di aplikasi. Pemetaan data perlu diselesaikan sebelum repository publik dihubungkan.
- Data demo tetap menjadi fallback sampai integrasi aplikasi dan penanganan error disetujui serta diuji.
