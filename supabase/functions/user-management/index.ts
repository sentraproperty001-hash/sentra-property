import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://sentraproperty.com',
  'https://www.sentraproperty.com',
  'https://sentra-property.pages.dev',
  'https://app.sentraproperty.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const VALID_ROLES = new Set(['super_admin', 'admin', 'internal_agent', 'partner_agent']);
const INTERNAL_ACCOUNT_DOMAIN = 'accounts.sentraproperty.com';

const corsHeaders = (origin: string | null): HeadersInit => ({
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'null',
  'Vary': 'Origin',
});

const jsonResponse = (body: unknown, status: number, origin: string | null) => (
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
);

const asObject = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

Deno.serve(async request => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) {
      return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, null);
    }
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metode request tidak didukung.' }, 405, origin);
  }
  if (!origin || !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, null);
  }

  const authorization = request.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sesi super admin diperlukan.' }, 401, origin);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Konfigurasi manajemen user belum lengkap.' }, 503, origin);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const accessToken = authorization.slice('Bearer '.length);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401, origin);
    }

    const { data: caller, error: callerError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (callerError) {
      return jsonResponse({ error: 'Tidak dapat memverifikasi role akun.' }, 500, origin);
    }
    if (caller?.role !== 'super_admin') {
      return jsonResponse({ error: 'Hanya super admin yang dapat mengelola akun.' }, 403, origin);
    }

    let payload: Record<string, unknown> | null;
    try {
      payload = asObject(await request.json());
    } catch {
      return jsonResponse({ error: 'Format permintaan tidak valid.' }, 400, origin);
    }
    if (!payload || typeof payload.action !== 'string') {
      return jsonResponse({ error: 'Aksi manajemen user tidak valid.' }, 400, origin);
    }

    if (payload.action === 'list') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,full_name,phone,role,created_at')
        .order('created_at', { ascending: true });
      if (error) {
        return jsonResponse({ error: 'Gagal memuat daftar user.' }, 500, origin);
      }
      return jsonResponse({
        users: (data || []).map(profile => ({
          ...profile,
          full_name: profile.full_name || profile.username,
          phone: profile.phone || '',
        })),
      }, 200, origin);
    }

    if (payload.action === 'create') {
      const username = typeof payload.username === 'string' ? payload.username.trim().toLowerCase() : '';
      const password = typeof payload.password === 'string' ? payload.password : '';
      const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
      const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
      const role = typeof payload.role === 'string' ? payload.role : '';
      if (!USERNAME_PATTERN.test(username)) {
        return jsonResponse({
          error: 'Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
        }, 400, origin);
      }
      if (password.length < 12 || password.length > 128) {
        return jsonResponse({ error: 'Password harus terdiri dari 12–128 karakter.' }, 400, origin);
      }
      if (!fullName || fullName.length > 120 || phone.length > 32) {
        return jsonResponse({ error: 'Nama wajib diisi; nama maksimal 120 dan nomor telepon maksimal 32 karakter.' }, 400, origin);
      }
      if (!VALID_ROLES.has(role)) {
        return jsonResponse({ error: 'Role user tidak valid.' }, 400, origin);
      }

      const email = `${username}@${INTERNAL_ACCOUNT_DOMAIN}`;
      const { data: createdAuth, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (createAuthError || !createdAuth.user) {
        const message = createAuthError?.message.toLowerCase().includes('already')
          ? 'Username sudah digunakan.'
          : 'Gagal membuat akun login. Periksa kebijakan password Supabase.';
        return jsonResponse({ error: message }, 400, origin);
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: createdAuth.user.id,
        username,
        full_name: fullName,
        phone,
        role,
      });
      if (profileError) {
        const { error: rollbackError } = await supabase.auth.admin.deleteUser(createdAuth.user.id);
        if (rollbackError) console.error('Failed to remove auth user after profile creation failed:', rollbackError);
        const message = profileError.code === '23505'
          ? 'Username sudah digunakan.'
          : 'Akun login dibuat tetapi profil gagal disimpan. Periksa migrasi username.';
        return jsonResponse({ error: message }, 500, origin);
      }

      return jsonResponse({
        user: {
          id: createdAuth.user.id,
          username,
          full_name: fullName,
          phone,
          role,
          created_at: createdAuth.user.created_at,
        },
      }, 201, origin);
    }

    if (payload.action === 'update_role') {
      const userId = typeof payload.userId === 'string' ? payload.userId : '';
      const role = typeof payload.role === 'string' ? payload.role : '';
      if (!userId || !VALID_ROLES.has(role)) {
        return jsonResponse({ error: 'User atau role tidak valid.' }, 400, origin);
      }
      if (userId === userData.user.id) {
        return jsonResponse({ error: 'Role akun super admin yang sedang digunakan tidak dapat diubah.' }, 400, origin);
      }
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) {
        return jsonResponse({ error: 'Gagal memperbarui role user.' }, 500, origin);
      }
      return jsonResponse({ success: true }, 200, origin);
    }

    if (payload.action === 'reset_password') {
      const userId = typeof payload.userId === 'string' ? payload.userId : '';
      const password = typeof payload.password === 'string' ? payload.password : '';
      if (!userId || password.length < 12 || password.length > 128) {
        return jsonResponse({ error: 'Password baru harus 12–128 karakter.' }, 400, origin);
      }
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) {
        return jsonResponse({ error: 'Gagal memperbarui password user.' }, 500, origin);
      }
      return jsonResponse({ success: true }, 200, origin);
    }

    return jsonResponse({ error: 'Aksi manajemen user tidak didukung.' }, 400, origin);
  } catch (error) {
    console.error('User management request failed:', error);
    return jsonResponse({ error: 'Terjadi kesalahan saat mengelola user.' }, 500, origin);
  }
});
