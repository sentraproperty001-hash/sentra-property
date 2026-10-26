import { Property, Profile } from '../types';
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
const PROPERTY_PAGE_SIZE = 500;
type PropertyType = Property['property_type'];

const isPropertyType = (value: string): value is PropertyType => (
  value === 'rumah' || value === 'tanah' || value === 'ruko' || value === 'apartemen'
);
const isListingType = (value: string): value is Property['listing_type'] => (
  value === 'jual' || value === 'sewa'
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

const mapDatabaseProperty = (value: unknown): Property => {
  if (!isDatabasePropertyRow(value)) {
    throw new Error('Struktur data properti dari Supabase tidak sesuai dengan skema aplikasi.');
  }

  const row = value;
  if (row.status !== 'published') {
    throw new Error('Supabase mengembalikan properti dengan status yang bukan publik.');
  }

  if (!isPropertyType(row.property_type)) {
    throw new Error('Tipe properti dari Supabase belum didukung aplikasi.');
  }

  if (!isListingType(row.listing_type)) {
    throw new Error('Jenis transaksi properti dari Supabase tidak valid.');
  }

  const demoImage = PROPERTIES.find(property => property.slug === row.slug)?.image || '';

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
    image: demoImage,
    status: 'published',
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
      .select(PROPERTY_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + PROPERTY_PAGE_SIZE - 1);

    if (error) {
      throw new Error('Gagal memuat listing publik dari Supabase.', { cause: error });
    }

    const page = (data || []).map(mapDatabaseProperty);
    properties.push(...page);

    if (page.length < PROPERTY_PAGE_SIZE) {
      return properties;
    }

    offset += PROPERTY_PAGE_SIZE;
  }
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
    return supabase ? readPublishedFromSupabase() : findPublishedProperties();
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
