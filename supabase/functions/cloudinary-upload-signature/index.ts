import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://sentraproperty.com',
  'https://www.sentraproperty.com',
  'https://sentra-property.pages.dev',
  'https://app.sentraproperty.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

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

const hexDigest = (digest: ArrayBuffer): string => (
  Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
);

const createSignature = async (params: Record<string, string>, apiSecret: string): Promise<string> => {
  const parameterString = Object.entries(params)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const bytes = new TextEncoder().encode(`${parameterString}${apiSecret}`);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return hexDigest(digest);
};

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
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  const uploadPreset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sesi login diperlukan untuk upload foto.' }, 401, origin);
  }
  if (!supabaseUrl || !supabaseAnonKey || !cloudName || !cloudinaryApiKey || !cloudinaryApiSecret || !uploadPreset) {
    return jsonResponse({ error: 'Konfigurasi upload Cloudinary belum lengkap.' }, 503, origin);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const accessToken = authorization.slice('Bearer '.length);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401, origin);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) {
      return jsonResponse({ error: 'Tidak dapat memverifikasi role akun.' }, 500, origin);
    }
    if (
      !profile
      || !['super_admin', 'admin', 'internal_agent', 'partner_agent'].includes(profile.role)
    ) {
      return jsonResponse({ error: 'Akun tidak memiliki profil portal yang aktif.' }, 403, origin);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `sentra-properties/${userData.user.id}`;
    const publicId = crypto.randomUUID();
    const params = {
      folder,
      public_id: publicId,
      timestamp: String(timestamp),
      upload_preset: uploadPreset,
    };
    const signature = await createSignature(params, cloudinaryApiSecret);

    return jsonResponse({
      cloudName,
      apiKey: cloudinaryApiKey,
      timestamp,
      folder,
      publicId,
      uploadPreset,
      signature,
    }, 200, origin);
  } catch (error) {
    console.error('Cloudinary upload signature failed:', error);
    return jsonResponse({ error: 'Gagal menyiapkan upload foto.' }, 500, origin);
  }
});
