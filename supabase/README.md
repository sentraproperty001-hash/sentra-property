# Panduan Supabase Sentra Property

## Konfigurasi lokal

1. Salin `.env.example` menjadi `.env.local` di root proyek.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan Project URL dan publishable key/anon key dari dashboard Supabase.
3. Jangan gunakan `service_role` key atau secret key di aplikasi frontend, dan jangan membagikan isi `.env.local`.

`.env.local` diabaikan oleh Git. Login simulasi hanya tersedia saat development tanpa konfigurasi Supabase. Portal produksi tidak mengizinkan login simulasi atau penulisan data.

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
- Portal website memakai Supabase Auth. Login berhasil hanya jika user Auth memiliki baris `profiles` dengan `id` yang sama dan role yang dikenali.
- Buat/invite user dari Supabase Dashboard, lalu provisioning profil dan role secara manual melalui alat administratif Supabase. Jangan membuat akun admin atau menetapkan role dari frontend publik; jangan pernah memasukkan `service_role` key ke aplikasi.
- Contoh provisioning satu akun setelah membuat user melalui Supabase Dashboard (ganti nilai placeholder; jalankan sebagai pemilik proyek di SQL Editor, bukan dari aplikasi):

  ```sql
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES ('AUTH_USER_UUID', 'Nama Pengguna', 'Nomor Telepon', 'super_admin');
  ```

  Gunakan role `admin`, `internal_agent`, atau `partner_agent` sesuai kewenangan. Buat profil hanya jika belum ada untuk UUID tersebut.
- Skema/profil dan kebijakan RLS di database aktif harus diperiksa sebelum portal digunakan. Migrasi lokal tidak membuktikan bahwa skema atau kebijakan tersebut telah diterapkan.
- Agent hanya dapat membuat listing `draft`/`pending_review` miliknya dan tidak dapat menerbitkan listing. Admin dapat meninjau dan menerbitkan; publik tetap hanya dapat membaca `published`.
- Form produksi tidak memakai gambar dummy. URL foto HTTP(S) opsional disimpan sebagai metadata pada `property_images.storage_path`; ini tidak mengunggah file. Foto yang belum tersedia ditampilkan sebagai placeholder. Bucket Storage tetap memerlukan konfigurasi terpisah untuk unggah berkas.
- Dashboard listing dan review memakai Supabase saat terkonfigurasi. Leads, manajemen agen, ringkasan demo, serta log aktivitas lokal tetap hanya tersedia pada mode demo dan tidak ditampilkan sebagai data produksi.
