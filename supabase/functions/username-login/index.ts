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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Konfigurasi login username belum lengkap.' }, 503, origin);
  }

  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERNAME_PATTERN.test(username) || password.length < 1 || password.length > 128) {
      return jsonResponse({ error: 'Username atau password salah.' }, 401, origin);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (profileError) {
      console.error('Username lookup failed:', profileError);
      return jsonResponse({ error: 'Login belum dapat diproses.' }, 500, origin);
    }
    if (!profile) return jsonResponse({ error: 'Username atau password salah.' }, 401, origin);

    const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(profile.id);
    if (authUserError || !authUser.user?.email) {
      console.error('Username account does not have a usable auth email:', authUserError);
      return jsonResponse({ error: 'Akun ini belum dapat login menggunakan username. Hubungi super admin.' }, 403, origin);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });
    if (signInError || !signInData.session) {
      return jsonResponse({ error: 'Username atau password salah.' }, 401, origin);
    }

    return jsonResponse({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    }, 200, origin);
  } catch (error) {
    console.error('Username login failed:', error);
    return jsonResponse({ error: 'Login belum dapat diproses.' }, 500, origin);
  }
});
