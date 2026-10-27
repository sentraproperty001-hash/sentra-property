ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

WITH normalized_names AS (
    SELECT
        profile.id,
        COALESCE(
            NULLIF(
                regexp_replace(
                    regexp_replace(
                        lower(split_part(auth_user.email, '@', 1)),
                        '[^a-z0-9._-]',
                        '',
                        'g'
                    ),
                    '^[^a-z0-9]+',
                    '',
                    'g'
                ),
                ''
            ),
            'user'
        ) AS base_username
    FROM public.profiles AS profile
    LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.username IS NULL
),
unique_names AS (
    SELECT
        id,
        CASE
            WHEN count(*) OVER (PARTITION BY base_username) = 1
                 AND length(base_username) BETWEEN 3 AND 32
            THEN base_username
            ELSE left(base_username, 23) || '-' || left(replace(id::text, '-', ''), 8)
        END AS username
    FROM normalized_names
)
UPDATE public.profiles AS profile
SET username = unique_names.username
FROM unique_names
WHERE profile.id = unique_names.id;

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_format
CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

CREATE UNIQUE INDEX profiles_username_lower_unique
ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.raise_exception_if_role_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
            RETURN NEW;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.id = (SELECT auth.uid())
          AND profile.role = 'super_admin'
    ) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT'
       AND NEW.role = 'super_admin'
       AND (SELECT auth.uid()) IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin')
    THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.role <> 'super_admin' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' OR NEW.role = 'super_admin' THEN
        RAISE EXCEPTION 'Hanya super admin yang dapat mengubah role.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_immutable ON public.profiles;
CREATE TRIGGER enforce_role_immutable
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.raise_exception_if_role_changed();
