const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Obtener todas las variables
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

    // La que usa receive-order
    const supabaseKey = serviceRoleKey || anonKey;

    const diagnostic = {
      timestamp: new Date().toISOString(),
      url: {
        value: supabaseUrl,
        length: supabaseUrl.length,
        isEmpty: !supabaseUrl
      },
      serviceRoleKey: {
        exists: !!serviceRoleKey,
        length: serviceRoleKey?.length || 0,
        startsWithEyJ: serviceRoleKey?.startsWith('eyJ') || false,
        first20: serviceRoleKey?.substring(0, 20) || 'N/A'
      },
      anonKey: {
        exists: !!anonKey,
        length: anonKey?.length || 0,
        startsWithEyJ: anonKey?.startsWith('eyJ') || false,
        first20: anonKey?.substring(0, 20) || 'N/A'
      },
      selectedKey: {
        exists: !!supabaseKey,
        length: supabaseKey?.length || 0,
        startsWithEyJ: supabaseKey?.startsWith('eyJ') || false,
        first20: supabaseKey?.substring(0, 20) || 'N/A',
        source: serviceRoleKey ? 'SERVICE_ROLE_KEY' : (anonKey ? 'ANON_KEY' : 'NONE')
      }
    };

    // Intentar crear cliente
    let connectionTest = { success: false, error: null };

    if (supabaseUrl && supabaseKey && supabaseKey.startsWith('eyJ')) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        });

        // Test básico de conexión
        const { data, error } = await supabase.from('orders').select('count').limit(1);

        if (error) {
          connectionTest = { success: false, error: error.message };
        } else {
          connectionTest = { success: true, error: null };
        }
      } catch (err) {
        connectionTest = { success: false, error: err.message };
      }
    } else {
      connectionTest = {
        success: false,
        error: 'Missing or invalid credentials'
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        diagnostic,
        connectionTest,
        allEnvVars: Object.keys(process.env).filter(k =>
          k.includes('SUPABASE') || k.includes('VITE')
        )
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        message: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};
