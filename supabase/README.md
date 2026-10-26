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
- Form produksi mengunggah file foto langsung dari browser ke Cloudinary setelah memperoleh tanda tangan singkat dari Supabase Edge Function. Secret API Cloudinary hanya disimpan di Supabase Function Secrets, bukan di bundle browser. Foto dioptimalkan di perangkat menjadi WebP jika hasilnya lebih kecil; file yang dipilih dibatasi maksimal 10 MB.
- Supabase hanya menyimpan URL CDN Cloudinary sebagai metadata pada `property_images.storage_path`; byte foto tidak diunggah atau disajikan melalui Supabase Storage. Listing yang belum terbit tetap tidak ditampilkan pada katalog publik. URL Cloudinary merupakan URL publik, jadi gambar yang URL-nya dibagikan dapat dibuka langsung.
- [Cloudinary Free](https://cloudinary.com/pricing) saat ini menawarkan 25 monthly credits dan tidak memerlukan kartu kredit. Upload, penyimpanan, transformasi, dan delivery menggunakan batas paket Cloudinary; cek pemakaian pada dashboard Cloudinary karena kuota dan harga dapat berubah.
- Dashboard listing, review, dan inbox leads memakai Supabase saat terkonfigurasi. Pengunjung dapat mengirim minat hanya untuk listing `published`; RLS membatasi penyimpanan lead ke listing terbit dan menetapkan lead ke agen pemiliknya. Manajemen agen, ringkasan demo, catatan follow-up, dan log aktivitas lokal tetap hanya tersedia pada mode demo.

## Menyiapkan upload foto Cloudinary

1. Buat akun Cloudinary Free, lalu catat **Cloud name**, **API Key**, dan **API Secret** dari dashboard Cloudinary. Jangan masukkan API Secret ke `.env.local`, `VITE_*`, atau kode frontend.
2. Di Cloudinary Console, buat [Upload Preset](https://cloudinary.com/documentation/upload_presets) bernama `sentra_property_signed` dengan mode **Signed**. Batasi format yang diizinkan ke `jpg`, `jpeg`, `png`, dan `webp`, dan ukuran file maksimum 10 MB. Jangan mengaktifkan overwrite. Gambar perlu dapat diakses publik agar pengunjung website/PWA dapat melihat listing terbit.
3. Di Supabase Dashboard → **Edge Functions → Secrets**, tambahkan:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_UPLOAD_PRESET` = `sentra_property_signed`
4. Deploy fungsi dari root repository menggunakan Supabase CLI yang terhubung ke project yang benar:

   ```powershell
   supabase functions deploy cloudinary-upload-signature --project-ref PROJECT_REF
   ```

   `PROJECT_REF` adalah bagian project dari URL Supabase. Jangan menambahkan `--no-verify-jwt`; fungsi memerlukan sesi akun yang valid.
5. Deploy frontend terbaru ke Cloudflare Pages. Upload foto tersedia setelah deploy frontend dan Edge Function, serta secrets/preset telah disiapkan.

Untuk uji akhir, masuk ke portal dengan akun berprofil, buat listing draft dengan satu foto, periksa URL foto di `property_images.storage_path`, lalu pastikan file muncul di Cloudinary Media Library. Jangan uji dengan menyalin API Secret ke browser atau chat.
