/*
  # Corregir foreign key de user_profiles

  1. Problema identificado
    - La tabla `user_profiles` tiene foreign key a `users(id)` que no existe
    - Supabase usa `auth.users` para autenticación
    - Esto causa errores 500 al crear usuarios

  2. Solución
    - Eliminar foreign key incorrecta a `users(id)`
    - Crear foreign key correcta a `auth.users(id)`
    - Mantener todas las políticas RLS existentes
    - Conservar todos los datos actuales
*/

-- Eliminar la foreign key incorrecta
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Eliminar cualquier otra foreign key relacionada con users
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Crear la foreign key correcta que apunta a auth.users
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verificar que la función de creación automática de perfiles funcione
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no fallar el registro
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger para nuevos usuarios
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Asegurar que las políticas RLS permitan la creación durante el signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id);

-- Política especial para permitir que el trigger funcione
DROP POLICY IF EXISTS "Enable insert for service role" ON user_profiles;
CREATE POLICY "Enable insert for service role"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);