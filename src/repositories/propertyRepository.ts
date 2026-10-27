import { Property, Profile, PropertyStatus } from '../types';
import { PROPERTIES } from '../data/demo-data';
import { activityRepository } from './activityRepository';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

const STORAGE_KEY = 'sentra_property_listings_v2';
const PROPERTY_COLUMNS = [
  'id',
  'owner_agent_id',
  'title',
  'slug',
  'description',
  'property_type',
  'listing_type',
  'price',
  'province',
  'city',
  'district',
  'village',
  'address',
  'land_area',
  'building_area',
  'bedrooms',
  'bathrooms',
  'floors',
  'parking_spaces',
  'status',
  'rejection_reason',
  'created_at',
  'updated_at',
].join(',');
const PROPERTY_SELECT_COLUMNS = `${PROPERTY_COLUMNS},property_images(storage_path,sort_order)`;
const PROPERTY_PAGE_SIZE = 500;
type PropertyType = Property['property_type'];
type ListingType = Property['listing_type'];

const isPropertyType = (value: string): value is PropertyType => (
  value === 'rumah' || value === 'tanah' || value === 'ruko' || value === 'apartemen'
);
const isListingType = (value: string): value is ListingType => (
  value === 'jual' || value === 'sewa'
);
const isPropertyStatus = (value: string): value is PropertyStatus => (
  value === 'draft' || value === 'pending_review' || value === 'published'
  || value === 'rejected' || value === 'archived'
);

interface DatabasePropertyRow {
  id: string;
  owner_agent_id: string;
  title: string;
  slug: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  price: number | string;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  land_area: number | string | null;
  building_area: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  parking_spaces: number | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  property_images?: unknown;
}

const isNullableString = (value: unknown): value is string | null => (
  value === null || typeof value === 'string'
);

const isNullableNumber = (value: unknown): value is number | string | null => (
  value === null || typeof value === 'number' || typeof value === 'string'
);

const isDatabasePropertyRow = (value: unknown): value is DatabasePropertyRow => {
  if (typeof value !== 'object' || value === null) return false;

  const row = value as Record<string, unknown>;
  return typeof row.id === 'string'
    && typeof row.owner_agent_id === 'string'
    && typeof row.title === 'string'
    && typeof row.slug === 'string'
    && isNullableString(row.description)
    && typeof row.property_type === 'string'
    && typeof row.listing_type === 'string'
    && (typeof row.price === 'number' || typeof row.price === 'string')
    && isNullableString(row.province)
    && isNullableString(row.city)
    && isNullableString(row.district)
    && isNullableString(row.village)
    && isNullableString(row.address)
    && isNullableNumber(row.land_area)
    && isNullableNumber(row.building_area)
    && (row.bedrooms === null || typeof row.bedrooms === 'number')
    && (row.bathrooms === null || typeof row.bathrooms === 'number')
    && (row.floors === null || typeof row.floors === 'number')
    && (row.parking_spaces === null || typeof row.parking_spaces === 'number')
    && typeof row.status === 'string'
    && isNullableString(row.rejection_reason)
    && typeof row.created_at === 'string'
    && typeof row.updated_at === 'string';
};

interface DatabasePropertyImageRow {
  storage_path: string;
  sort_order: number | null;
}

const isDatabasePropertyImageRow = (value: unknown): value is DatabasePropertyImageRow => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.storage_path === 'string'
    && (row.sort_order === null || typeof row.sort_order === 'number');
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const loadData = (): Property[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // fallback to initial demo data
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(PROPERTIES));
  return PROPERTIES;
};

const saveData = (data: Property[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save data to localStorage:', err);
  }
};

const findPublishedProperties = (): Property[] => {
  return loadData().filter(property => property.status === 'published');
};

const toNullableNumber = (value: number | string | null): number => {
  if (value === null) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Data properti dari Supabase memiliki nilai angka yang tidak valid.');
  }
  return parsed;
};

const mapDatabaseProperty = (value: unknown, publicOnly = false): Property => {
  if (!isDatabasePropertyRow(value)) {
    throw new Error('Struktur data properti dari Supabase tidak sesuai dengan skema aplikasi.');
  }

  const row = value;
  if (!isPropertyStatus(row.status)) {
    throw new Error('Status properti dari Supabase tidak didukung aplikasi.');
  }
  if (publicOnly && row.status !== 'published') {
    throw new Error('Supabase mengembalikan properti dengan status yang bukan publik.');
  }

  if (!isPropertyType(row.property_type)) {
    throw new Error('Tipe properti dari Supabase belum didukung aplikasi.');
  }

  if (!isListingType(row.listing_type)) {
    throw new Error('Jenis transaksi properti dari Supabase tidak valid.');
  }

  let images: string[] = [];
  if (row.property_images !== undefined) {
    if (!Array.isArray(row.property_images) || !row.property_images.every(isDatabasePropertyImageRow)) {
      throw new Error('Struktur metadata gambar properti dari Supabase tidak valid.');
    }
    const sortedImages = [...row.property_images].sort(
      (a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)
    );
    images = sortedImages
      .map(item => item.storage_path)
      .filter((imageUrl, index, imageUrls) => isHttpUrl(imageUrl) && imageUrls.indexOf(imageUrl) === index);
  }
  const image = images[0] || '';

  return {
    id: row.id,
    owner_agent_id: row.owner_agent_id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    property_type: row.property_type,
    listing_type: row.listing_type,
    price: toNullableNumber(row.price),
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    village: row.village || '',
    address: row.address || '',
    land_area: toNullableNumber(row.land_area),
    building_area: toNullableNumber(row.building_area),
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    floors: row.floors ?? 0,
    parking_spaces: row.parking_spaces ?? 0,
    image,
    images,
    status: row.status,
    rejection_reason: row.rejection_reason || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const readPublishedFromSupabase = async (): Promise<Property[]> => {
  if (!supabase) {
    throw new Error('Client Supabase belum dikonfigurasi.');
  }

  const properties: Property[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_SELECT_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + PROPERTY_PAGE_SIZE - 1);

    if (error) {
      throw new Error('Gagal memuat listing publik dari Supabase.', { cause: error });
    }

    const page = (data || []).map(row => mapDatabaseProperty(row, true));
    properties.push(...page);

    if (page.length < PROPERTY_PAGE_SIZE) {
      return properties;
    }

    offset += PROPERTY_PAGE_SIZE;
  }
};

const toDatabasePayload = (property: Property) => ({
  owner_agent_id: property.owner_agent_id,
  title: property.title,
  slug: property.slug,
  description: property.description,
  property_type: property.property_type,
  listing_type: property.listing_type,
  price: property.price,
  province: property.province,
  city: property.city,
  district: property.district,
  village: property.village,
  address: property.address,
  land_area: property.land_area,
  building_area: property.building_area,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  floors: property.floors,
  parking_spaces: property.parking_spaces,
  status: property.status,
  rejection_reason: property.rejection_reason || null,
  updated_at: new Date().toISOString(),
});

const persistPropertyImage = async (propertyId: string, imageUrl: string, title: string): Promise<void> => {
  if (!supabase) throw new Error('Client Supabase belum dikonfigurasi.');
  if (!imageUrl) return;
  if (!isHttpUrl(imageUrl)) {
    throw new Error('URL foto harus menggunakan alamat http atau https yang valid.');
  }

  const { data: latestImage, error: readError } = await supabase
    .from('property_images')
    .select('storage_path,sort_order')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error('Gagal membaca urutan foto listing.', { cause: readError });
  if (latestImage?.storage_path === imageUrl) return;

  const { error } = await supabase.from('property_images').insert({
    property_id: propertyId,
    storage_path: imageUrl,
    alt_text: title,
    sort_order: (latestImage?.sort_order || 0) + 1,
  });
  if (error) throw new Error('URL foto tidak dapat disimpan ke Supabase.', { cause: error });
};

const syncPropertyImages = async (
  propertyId: string,
  imageUrls: string[],
  title: string
): Promise<void> => {
  if (!supabase) throw new Error('Client Supabase belum dikonfigurasi.');
  const uniqueImageUrls = [...new Set(imageUrls)];
  if (uniqueImageUrls.some(imageUrl => !isHttpUrl(imageUrl))) {
    throw new Error('URL foto harus menggunakan alamat http atau https yang valid.');
  }

  const { data: existingImages, error: readError } = await supabase
    .from('property_images')
    .select('id,storage_path,sort_order')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false });
  if (readError) throw new Error('Gagal membaca foto listing yang tersimpan.', { cause: readError });

  const existingRows = existingImages || [];
  const existingUrls = new Set(existingRows.map(row => row.storage_path));
  const newImages = uniqueImageUrls
    .map((storage_path, index) => ({
      property_id: propertyId,
      storage_path,
      alt_text: title,
      sort_order: uniqueImageUrls.length - index,
    }))
    .filter(image => !existingUrls.has(image.storage_path));

  if (newImages.length > 0) {
    const { error } = await supabase.from('property_images').insert(newImages);
    if (error) throw new Error('Foto baru gagal disimpan ke Supabase.', { cause: error });
  }

  for (const [index, imageUrl] of uniqueImageUrls.entries()) {
    const existing = existingRows.find(row => row.storage_path === imageUrl);
    if (!existing) continue;

    const { error } = await supabase
      .from('property_images')
      .update({ sort_order: uniqueImageUrls.length - index, alt_text: title })
      .eq('id', existing.id);
    if (error) throw new Error('Urutan foto listing gagal diperbarui.', { cause: error });
  }

  const retainedUrls = new Set(uniqueImageUrls);
  const removedIds = existingRows.filter(row => !retainedUrls.has(row.storage_path)).map(row => row.id);
  for (const removedId of removedIds) {
    const { error } = await supabase
      .from('property_images')
      .delete()
      .eq('id', removedId)
      .eq('property_id', propertyId);
    if (error) throw new Error('Foto yang dipilih gagal dihapus dari listing.', { cause: error });
  }
};

export interface PropertyWriteResult {
  property: Property;
  warning?: string;
}

const logSupabasePropertyActivity = (
  action: 'create' | 'update' | 'delete' | 'submit_review' | 'approve' | 'reject' | 'status_change',
  property: Property,
  author: Profile,
  details: string
) => {
  activityRepository.log({
    user_id: author.id,
    user_name: author.full_name,
    user_role: author.role,
    action,
    entity_type: 'property',
    entity_id: property.id,
    entity_title: property.title,
    details,
  });
};

export interface SearchFilterParams {
  query?: string;
  listingType?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sort?: 'asc' | 'desc' | 'newest';
}

export const propertyRepository = {
  findAll: (): Property[] => loadData(),

  findPublished: (): Property[] => findPublishedProperties(),

  findPublishedAsync: async (): Promise<Property[]> => {
    if (supabaseConfigurationError) {
      throw new Error(supabaseConfigurationError);
    }
    if (supabase) return readPublishedFromSupabase();
    if (import.meta.env.DEV) return findPublishedProperties();
    throw new Error('Supabase belum dikonfigurasi untuk memuat listing publik.');
  },

  findManagedAsync: async (user: Profile, isAdmin: boolean): Promise<Property[]> => {
    if (!supabase) {
      if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
      return loadData().filter(property => isAdmin || property.owner_agent_id === user.id);
    }

    const properties: Property[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('properties')
        .select(PROPERTY_SELECT_COLUMNS)
        .order('created_at', { ascending: false })
        .range(offset, offset + PROPERTY_PAGE_SIZE - 1);
      if (error) throw new Error('Gagal memuat listing yang dapat dikelola dari Supabase.', { cause: error });

      const page = (data || [])
        .map(row => mapDatabaseProperty(row))
        .filter(property => isAdmin || property.owner_agent_id === user.id);
      properties.push(...page);
      if (!data || data.length < PROPERTY_PAGE_SIZE) return properties;
      offset += PROPERTY_PAGE_SIZE;
    }
  },

  findPendingReviewAsync: async (user: Profile, isAdmin: boolean): Promise<Property[]> => {
    const properties = await propertyRepository.findManagedAsync(user, isAdmin);
    return properties.filter(property => property.status === 'pending_review');
  },

  createAsync: async (property: Property, author: Profile): Promise<PropertyWriteResult> => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase belum dikonfigurasi.');
    if (property.image && !isHttpUrl(property.image)) {
      throw new Error('URL foto harus menggunakan alamat http atau https yang valid.');
    }
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('properties')
      .insert({ id, ...toDatabasePayload(property) })
      .select(PROPERTY_SELECT_COLUMNS)
      .single();
    if (error) {
      throw new Error('Listing tidak dapat disimpan. Periksa profil akun, status listing, dan kebijakan akses Supabase.', { cause: error });
    }

    const savedProperty = mapDatabaseProperty(data);
    let warning: string | undefined;
    try {
      const imageUrls = property.images?.length
        ? property.images
        : property.image ? [property.image] : [];
      await syncPropertyImages(id, imageUrls, property.title);
    } catch (imageError) {
      warning = imageError instanceof Error
        ? `Listing tersimpan, tetapi foto gagal disimpan: ${imageError.message}`
        : 'Listing tersimpan, tetapi foto gagal disimpan.';
    }
    const imageUrls = property.images?.length
      ? property.images
      : property.image ? [property.image] : [];
    const mainImage = imageUrls[0] || '';
    const createdProperty = { ...savedProperty, image: mainImage, images: imageUrls };
    logSupabasePropertyActivity('create', createdProperty, author, `Membuat listing baru (${property.status})`);
    return { property: createdProperty, warning };
  },

  updateAsync: async (
    id: string,
    updates: Partial<Property>,
    author: Profile
  ): Promise<PropertyWriteResult> => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase belum dikonfigurasi.');
    if (updates.image && !isHttpUrl(updates.image)) {
      throw new Error('URL foto harus menggunakan alamat http atau https yang valid.');
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: Array<keyof Property> = [
      'title', 'slug', 'description', 'property_type', 'listing_type', 'price',
      'province', 'city', 'district', 'village', 'address', 'land_area',
      'building_area', 'bedrooms', 'bathrooms', 'floors', 'parking_spaces',
      'status', 'rejection_reason',
    ];
    fields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        payload[field] = field === 'rejection_reason' && updates[field] === undefined
          ? null
          : updates[field];
      }
    });

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select(PROPERTY_SELECT_COLUMNS)
      .single();
    if (error) {
      throw new Error('Listing tidak dapat diperbarui. Periksa kepemilikan, status, dan kebijakan akses Supabase.', { cause: error });
    }

    const savedProperty = mapDatabaseProperty(data);
    let warning: string | undefined;
    if (Object.prototype.hasOwnProperty.call(updates, 'images')) {
      try {
        const imageUrls = updates.images || [];
        await syncPropertyImages(id, imageUrls, updates.title || savedProperty.title);
      } catch (imageError) {
        warning = imageError instanceof Error
          ? `Listing tersimpan, tetapi galeri foto gagal diperbarui: ${imageError.message}`
          : 'Listing tersimpan, tetapi galeri foto gagal diperbarui.';
      }
    } else if (updates.image) {
      try {
        await persistPropertyImage(id, updates.image, updates.title || savedProperty.title);
      } catch (imageError) {
        warning = imageError instanceof Error
          ? `Listing tersimpan, tetapi foto gagal diperbarui: ${imageError.message}`
          : 'Listing tersimpan, tetapi foto gagal diperbarui.';
      }
    }
    const updatedImages = Object.prototype.hasOwnProperty.call(updates, 'images')
      ? updates.images || []
      : updates.image
        ? [updates.image, ...(savedProperty.images || []).filter(imageUrl => imageUrl !== updates.image)]
        : savedProperty.images || (savedProperty.image ? [savedProperty.image] : []);
    const updatedProperty = {
      ...savedProperty,
      image: updatedImages[0] || '',
      images: updatedImages,
    };
    logSupabasePropertyActivity('update', updatedProperty, author, 'Memperbarui data properti');
    return { property: updatedProperty, warning };
  },

  deleteAsync: async (id: string, author: Profile): Promise<void> => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase belum dikonfigurasi.');
    const { data, error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .select(PROPERTY_COLUMNS)
      .maybeSingle();
    if (error) throw new Error('Listing tidak dapat dihapus oleh akun ini.', { cause: error });
    if (!data) throw new Error('Listing tidak ditemukan atau akun ini tidak memiliki izin menghapusnya.');
    logSupabasePropertyActivity('delete', mapDatabaseProperty(data), author, 'Menghapus listing properti');
  },

  setStatusAsync: async (
    id: string,
    status: PropertyStatus,
    author: Profile,
    rejectionReason?: string
  ): Promise<Property> => {
    const updates: Partial<Property> = { status, rejection_reason: rejectionReason };
    const result = await propertyRepository.updateAsync(id, updates, author);
    if (result.warning) throw new Error(result.warning);
    return result.property;
  },

  findById: (id: string): Property | undefined => {
    return loadData().find(p => p.id === id);
  },

  findPublishedBySlug: (slug: string): Property | undefined => {
    return findPublishedProperties().find(property => property.slug === slug);
  },

  findBySlug: (slug: string): Property | undefined => {
    return loadData().find(p => p.slug === slug);
  },

  findByAgent: (agentId: string): Property[] => {
    return loadData().filter(p => p.owner_agent_id === agentId);
  },

  findPendingReview: (): Property[] => {
    return loadData().filter(p => p.status === 'pending_review');
  },

  searchAndFilter: (params: SearchFilterParams): Property[] => {
    return propertyRepository.filterPublished(findPublishedProperties(), params);
  },

  filterPublished: (properties: Property[], params: SearchFilterParams): Property[] => {
    let data = properties.filter(property => property.status === 'published');

    if (params.query && params.query.trim() !== '') {
      const q = params.query.toLowerCase().trim();
      data = data.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    if (params.listingType && params.listingType !== 'semua') {
      data = data.filter(p => p.listing_type === params.listingType);
    }

    if (params.propertyType && params.propertyType !== 'semua') {
      data = data.filter(p => p.property_type === params.propertyType);
    }

    const validMinPrice = typeof params.minPrice === 'number' && Number.isFinite(params.minPrice) && params.minPrice >= 0
      ? params.minPrice
      : undefined;
    const validMaxPrice = typeof params.maxPrice === 'number' && Number.isFinite(params.maxPrice) && params.maxPrice >= 0
      ? params.maxPrice
      : undefined;
    const invalidPriceRange = validMinPrice !== undefined
      && validMaxPrice !== undefined
      && validMinPrice > validMaxPrice;
    const minPrice = invalidPriceRange ? undefined : validMinPrice;
    const maxPrice = invalidPriceRange ? undefined : validMaxPrice;

    if (minPrice !== undefined) {
      data = data.filter(p => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      data = data.filter(p => p.price <= maxPrice);
    }

    if (typeof params.bedrooms === 'number' && params.bedrooms > 0) {
      data = data.filter(p => p.bedrooms >= params.bedrooms!);
    }

    // Sorting
    if (params.sort === 'asc') {
      data.sort((a, b) => a.price - b.price);
    } else if (params.sort === 'desc') {
      data.sort((a, b) => b.price - a.price);
    } else {
      // newest
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return data;
  },

  create: (property: Property, author?: Profile) => {
    const data = loadData();
    data.unshift(property);
    saveData(data);

    if (author) {
      activityRepository.log({
        user_id: author.id,
        user_name: author.full_name,
        user_role: author.role,
        action: 'create',
        entity_type: 'property',
        entity_id: property.id,
        entity_title: property.title,
        details: `Membuat listing baru (${property.status})`,
      });
    }
  },

  update: (id: string, updates: Partial<Property>, author?: Profile) => {
    let data = loadData();
    let updatedItem: Property | undefined;
    data = data.map(p => {
      if (p.id === id) {
        updatedItem = { ...p, ...updates, updated_at: new Date().toISOString() };
        return updatedItem;
      }
      return p;
    });
    saveData(data);

    if (author && updatedItem) {
      activityRepository.log({
        user_id: author.id,
        user_name: author.full_name,
        user_role: author.role,
        action: 'update',
        entity_type: 'property',
        entity_id: id,
        entity_title: updatedItem.title,
        details: 'Memperbarui data properti',
      });
    }
  },

  delete: (id: string, author?: Profile) => {
    const data = loadData();
    const item = data.find(p => p.id === id);
    const filtered = data.filter(p => p.id !== id);
    saveData(filtered);

    if (author && item) {
      activityRepository.log({
        user_id: author.id,
        user_name: author.full_name,
        user_role: author.role,
        action: 'delete',
        entity_type: 'property',
        entity_id: id,
        entity_title: item.title,
        details: 'Menghapus properti dari database',
      });
    }
  },

  submitForReview: (id: string, author: Profile) => {
    let data = loadData();
    let updatedItem: Property | undefined;
    data = data.map(p => {
      if (p.id === id) {
        updatedItem = {
          ...p,
          status: 'pending_review',
          rejection_reason: undefined,
          updated_at: new Date().toISOString(),
        };
        return updatedItem;
      }
      return p;
    });
    saveData(data);

    if (updatedItem) {
      activityRepository.log({
        user_id: author.id,
        user_name: author.full_name,
        user_role: author.role,
        action: 'submit_review',
        entity_type: 'property',
        entity_id: id,
        entity_title: updatedItem.title,
        details: 'Mengajukan listing untuk ditinjau oleh Admin',
      });
    }
  },

  approveListing: (id: string, reviewer: Profile) => {
    let data = loadData();
    let updatedItem: Property | undefined;
    data = data.map(p => {
      if (p.id === id) {
        updatedItem = {
          ...p,
          status: 'published',
          rejection_reason: undefined,
          updated_at: new Date().toISOString(),
        };
        return updatedItem;
      }
      return p;
    });
    saveData(data);

    if (updatedItem) {
      activityRepository.log({
        user_id: reviewer.id,
        user_name: reviewer.full_name,
        user_role: reviewer.role,
        action: 'approve',
        entity_type: 'property',
        entity_id: id,
        entity_title: updatedItem.title,
        details: 'Menyetujui dan mempublikasikan listing ke katalog publik',
      });
    }
  },

  rejectListing: (id: string, reason: string, reviewer: Profile) => {
    let data = loadData();
    let updatedItem: Property | undefined;
    data = data.map(p => {
      if (p.id === id) {
        updatedItem = {
          ...p,
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        };
        return updatedItem;
      }
      return p;
    });
    saveData(data);

    if (updatedItem) {
      activityRepository.log({
        user_id: reviewer.id,
        user_name: reviewer.full_name,
        user_role: reviewer.role,
        action: 'reject',
        entity_type: 'property',
        entity_id: id,
        entity_title: updatedItem.title,
        details: `Menolak listing dengan catatan: "${reason}"`,
      });
    }
  },

  archiveListing: (id: string, author: Profile) => {
    let data = loadData();
    let updatedItem: Property | undefined;
    data = data.map(p => {
      if (p.id === id) {
        updatedItem = {
          ...p,
          status: 'archived',
          updated_at: new Date().toISOString(),
        };
        return updatedItem;
      }
      return p;
    });
    saveData(data);

    if (updatedItem) {
      activityRepository.log({
        user_id: author.id,
        user_name: author.full_name,
        user_role: author.role,
        action: 'status_change',
        entity_type: 'property',
        entity_id: id,
        entity_title: updatedItem.title,
        details: 'Mengarsipkan properti (tidak tampil di publik)',
      });
    }
  },
};
