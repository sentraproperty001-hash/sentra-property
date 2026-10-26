-- Role checks run with a fixed search path and as the function owner.
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

DROP TRIGGER IF EXISTS enforce_role_immutable ON public.profiles;
CREATE TRIGGER enforce_role_immutable
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.raise_exception_if_role_changed();

-- Remove all earlier permissive policies so they cannot broaden access via OR.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are visible to self and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

DROP POLICY IF EXISTS "Published properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Agents can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view published" ON public.properties;
DROP POLICY IF EXISTS "Agents can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can manage all" ON public.properties;
DROP POLICY IF EXISTS "Public can view published properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert their own unpublished properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update their own unpublished properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;

DROP POLICY IF EXISTS "Public can view images of published properties" ON public.property_images;
DROP POLICY IF EXISTS "Agents can manage images of their properties" ON public.property_images;
DROP POLICY IF EXISTS "Admins can manage all property images" ON public.property_images;

DROP POLICY IF EXISTS "Public can submit leads for published properties" ON public.leads;
DROP POLICY IF EXISTS "Agents can view their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can view leads" ON public.leads;

-- Profiles are private; users see their own profile and admins can manage profiles.
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

-- Public visitors can read published listings; agents cannot transfer ownership
-- or set a listing to published. Admins perform publication and moderation.
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

-- Image metadata is visible only when its property is public, or to its owner/admin.
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

-- Public lead submission is limited to published listings and the listing's owner.
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

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.properties, public.property_images TO anon, authenticated;
GRANT INSERT, UPDATE ON public.properties, public.property_images TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
