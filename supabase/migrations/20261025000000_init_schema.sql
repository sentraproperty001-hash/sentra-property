-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'partner_agent' CHECK (role IN ('super_admin', 'admin', 'internal_agent', 'partner_agent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Properties
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_agent_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL,
    listing_type TEXT NOT NULL CHECK (listing_type IN ('jual', 'sewa')),
    price NUMERIC NOT NULL,
    province TEXT,
    city TEXT,
    district TEXT,
    village TEXT,
    address TEXT,
    land_area NUMERIC,
    building_area NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    floors INTEGER,
    parking_spaces INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Property Images
CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id),
    assigned_agent_id UUID REFERENCES public.profiles(id),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin checks run as the table owner to avoid recursive profile RLS checks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.id = (SELECT auth.uid())
          AND profile.role IN ('super_admin', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.raise_exception_if_role_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Tidak diizinkan mengubah role.';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.raise_exception_if_role_changed() FROM PUBLIC;

CREATE TRIGGER enforce_role_immutable
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.raise_exception_if_role_changed();

-- RLS setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Profiles: private to the account owner and admins.
CREATE POLICY "Profiles are visible to self and admins" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users and admins can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin())
WITH CHECK (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Admins can create profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Properties: public reads only published rows; agents can manage their own unpublished rows.
CREATE POLICY "Public can view published properties" ON public.properties
FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Agents can view their own properties" ON public.properties
FOR SELECT TO authenticated
USING (owner_agent_id = (SELECT auth.uid()));

CREATE POLICY "Agents can insert their own unpublished properties" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (
    owner_agent_id = (SELECT auth.uid())
    AND status IN ('draft', 'pending_review')
);

CREATE POLICY "Agents can update their own unpublished properties" ON public.properties
FOR UPDATE TO authenticated
USING (owner_agent_id = (SELECT auth.uid()))
WITH CHECK (
    owner_agent_id = (SELECT auth.uid())
    AND status <> 'published'
);

CREATE POLICY "Admins can manage all properties" ON public.properties
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Images follow the publication and ownership rules of their parent property.
CREATE POLICY "Public can view images of published properties" ON public.property_images
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties AS property
        WHERE property.id = property_images.property_id
          AND property.status = 'published'
    )
);

CREATE POLICY "Agents can manage images of their properties" ON public.property_images
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties AS property
        WHERE property.id = property_images.property_id
          AND property.owner_agent_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.properties AS property
        WHERE property.id = property_images.property_id
          AND property.owner_agent_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can manage all property images" ON public.property_images
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Visitors may submit leads only for published properties; lead data stays private.
CREATE POLICY "Public can submit leads for published properties" ON public.leads
FOR INSERT TO anon, authenticated
WITH CHECK (
    status = 'new'
    AND (
        (property_id IS NULL AND assigned_agent_id IS NULL)
        OR EXISTS (
            SELECT 1
            FROM public.properties AS property
            WHERE property.id = leads.property_id
              AND property.status = 'published'
              AND (
                  leads.assigned_agent_id IS NULL
                  OR leads.assigned_agent_id = property.owner_agent_id
              )
        )
    )
);

CREATE POLICY "Agents can view their assigned leads" ON public.leads
FOR SELECT TO authenticated
USING (assigned_agent_id = (SELECT auth.uid()));

CREATE POLICY "Agents can update their assigned leads" ON public.leads
FOR UPDATE TO authenticated
USING (assigned_agent_id = (SELECT auth.uid()))
WITH CHECK (assigned_agent_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all leads" ON public.leads
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Explicit table privileges complement RLS policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.properties, public.property_images TO anon, authenticated;
GRANT INSERT, UPDATE ON public.properties, public.property_images TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
