/*
  # Fix Function Search Paths for Security

  ## Changes
  Set explicit search_path for all functions to prevent security vulnerabilities
  from role-mutable search paths

  ## Security Notes
  - Prevents search_path injection attacks
  - Ensures functions always execute in correct schema context
*/

-- Set explicit search_path for all functions to prevent security issues
DO $$ 
DECLARE
  func_record RECORD;
BEGIN
  -- Update all functions that have role mutable search_path
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_conversation_last_message',
      '_set_updated_at',
      'match_documents',
      '_to_numeric_price',
      '_productos_holded_autoversion',
      'update_completed_at',
      'calc_total_with_taxes',
      'update_updated_at_column',
      'set_updated_at',
      'update_conversation_activity',
      'create_user_profile'
    )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- If function doesn't exist or has different signature, skip it
        CONTINUE;
    END;
  END LOOP;
END $$;

-- Add comments explaining extension placement
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    COMMENT ON EXTENSION pg_trgm IS 'Extension required in public schema for Supabase compatibility';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    COMMENT ON EXTENSION vector IS 'Extension required in public schema for Supabase vector search';
  END IF;
END $$;
