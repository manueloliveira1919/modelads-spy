-- Server-side dedup por page_id para listagem de ofertas ativas
CREATE OR REPLACE FUNCTION public.list_active_offer_pages()
RETURNS SETOF public.meta_offers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (page_id) *
  FROM public.meta_offers
  WHERE is_active = true
  ORDER BY page_id, active_ads_count DESC, active_days DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_offer_pages() TO anon, authenticated, service_role;

-- Remove duplicidade UX: "Mentoria" existe como categoria; realocar quem foi
-- classificado como product_type=Mentoria para "Low Ticket" (default de infoproduto).
UPDATE public.meta_offers SET product_type = 'Low Ticket' WHERE product_type = 'Mentoria';