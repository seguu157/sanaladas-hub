/*
  # Sistema de Organizaciones y Roles

  1. Nueva Tabla
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text) - Nombre de la organización
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modificaciones a user_profiles
    - Agregar `organization_id` (uuid, references organizations)
    - Agregar `created_by` (uuid, references auth.users)
    - Agregar `email` (text)
    - Modificar `role` para incluir 'worker'

  3. Modificaciones a orders
    - Agregar `organization_id` (uuid, references organizations)

  4. Seguridad
    - Enable RLS en organizations
    - Políticas para organizaciones y usuarios
*/

-- Crear tabla de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agregar campos a user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Modificar el check constraint del role para incluir 'worker'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'user', 'kitchen', 'worker'));

-- Agregar organization_id a la tabla orders si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization ON orders(organization_id);

-- Enable RLS en organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas adicionales para user_profiles
CREATE POLICY "Users in org can view each other" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Crear organización principal de Sanaladas
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sanaladas')
ON CONFLICT DO NOTHING;

-- Actualizar todos los usuarios existentes para que pertenezcan a Sanaladas
UPDATE user_profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Actualizar emails de user_profiles desde auth.users
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND up.email IS NULL;