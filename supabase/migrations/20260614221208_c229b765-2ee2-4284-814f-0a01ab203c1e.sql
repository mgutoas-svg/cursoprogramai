
-- Reset password for the mpelectric admin account directly via bcrypt.
-- pgcrypto's crypt('plain', gen_salt('bf')) produces the bcrypt hash GoTrue uses.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE auth.users
SET encrypted_password = extensions.crypt('Mpelectric_1992', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'mpelectric@mpelectric.com.br';

-- Remove obsolete default admin account (admin@operaflow.com)
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@operaflow.com');

DELETE FROM auth.users WHERE email = 'admin@operaflow.com';
