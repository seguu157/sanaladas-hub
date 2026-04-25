/*
  # Sincronizar emails de auth.users a user_profiles

  1. Cambios
    - Actualizar user_profiles.email con los emails de auth.users
    - Esto sincroniza los emails para usuarios existentes que no tienen email en su perfil

  2. Seguridad
    - Operación segura de solo lectura/escritura interna
*/

-- Copiar emails de auth.users a user_profiles para usuarios que no tienen email
UPDATE user_profiles
SET email = auth.users.email
FROM auth.users
WHERE user_profiles.id = auth.users.id
  AND (user_profiles.email IS NULL OR user_profiles.email = '');
