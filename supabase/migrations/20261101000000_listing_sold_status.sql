ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('draft', 'pending_review', 'published', 'sold', 'rejected', 'archived'));

DROP POLICY IF EXISTS "Public can view published properties" ON public.properties;
CREATE POLICY "Public can view published properties" ON public.properties
FOR SELECT TO anon, authenticated
USING (status IN ('published', 'sold'));

DROP POLICY IF EXISTS "Public can view images of published properties" ON public.property_images;
CREATE POLICY "Public can view images of published properties" ON public.property_images
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties AS property
        WHERE property.id = property_images.property_id
          AND property.status IN ('published', 'sold')
    )
);
