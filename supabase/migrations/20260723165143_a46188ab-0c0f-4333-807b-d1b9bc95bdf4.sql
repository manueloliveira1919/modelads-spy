
-- Add 'plus' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'plus' BEFORE 'pro';

-- Extend profiles with structured fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text;

-- Rewrite handle_new_user to store first/last name + phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fname text := NEW.raw_user_meta_data->>'first_name';
  lname text := NEW.raw_user_meta_data->>'last_name';
  ph    text := NEW.raw_user_meta_data->>'phone';
  disp  text := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(trim(concat_ws(' ', fname, lname)), ''),
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles(id, email, display_name, first_name, last_name, phone)
  VALUES (NEW.id, NEW.email, disp, fname, lname, ph)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, 'starter')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at fresh on profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
