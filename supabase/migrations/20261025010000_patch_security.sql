-- Define the admin helper before policies and trigger functions reference it.
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

-- Remove policies from the original migration before installing corrected checks.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are visible to self and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

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

-- Replace the original owner policies with checks that preserve ownership
-- and prevent agents from publishing a listing themselves.
DROP POLICY IF EXISTS "Published properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Agents can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view published properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert their own unpublished properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update their own unpublished properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;

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
