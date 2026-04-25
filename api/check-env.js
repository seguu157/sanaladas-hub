// Endpoint de diagnóstico para verificar variables de entorno
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Buscar todas las variables relacionadas con Supabase
  const supabaseVars = {};
  const allKeys = Object.keys(process.env);

  // Filtrar solo las que nos interesan
  const relevantKeys = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'NODE_ENV',
    'NETLIFY',
    'CONTEXT'
  ];

  relevantKeys.forEach(key => {
    if (process.env[key]) {
      // Mostrar solo los primeros 30 caracteres de las keys por seguridad
      if (key.includes('KEY')) {
        supabaseVars[key] = process.env[key].substring(0, 30) + '...';
      } else {
        supabaseVars[key] = process.env[key];
      }
    } else {
      supabaseVars[key] = '❌ NO CONFIGURADA';
    }
  });

  // Todas las variables que contienen SUPABASE o VITE
  const allSupabaseKeys = allKeys.filter(k =>
    k.includes('SUPABASE') || k.includes('VITE') || k.includes('supabase')
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Diagnóstico de Variables de Entorno',
      timestamp: new Date().toISOString(),
      environment: {
        isNetlify: !!process.env.NETLIFY,
        nodeEnv: process.env.NODE_ENV,
        context: process.env.CONTEXT
      },
      variables: supabaseVars,
      availableSupabaseKeys: allSupabaseKeys,
      totalEnvVars: allKeys.length,
      status: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        canConnectToSupabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))
      },
      recommendation: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))
        ? '✅ Las variables están configuradas correctamente'
        : '❌ Faltan variables. Ve a: https://app.netlify.com/sites/roaring-monstera-1c604c/settings/env'
    }, null, 2)
  };
};
