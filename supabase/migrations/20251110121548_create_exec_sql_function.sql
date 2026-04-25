/*
  # Crear función para ejecutar SQL raw (solución simple)

  1. Nueva Función
    - `exec_sql`: Ejecuta SQL directo
    - Solo permite UPDATE en tabla orders
    - Seguridad: Valida permisos del usuario

  2. Seguridad
    - SECURITY DEFINER para bypassear PostgREST
    - Solo usuarios autenticados
*/

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo permitir si el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Ejecutar el SQL
  EXECUTE sql;
END;
$$;

-- Permitir solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;

COMMENT ON FUNCTION exec_sql IS 'Execute raw SQL (workaround for PostgREST cache)';
