// Endpoint de prueba simple
exports.handler = async (event, context) => {
  console.log('🔥 TEST ENDPOINT CALLED!');
  console.log('Method:', event.httpMethod);
  console.log('Body:', event.body);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verificar variables de entorno de Supabase
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NO configurada',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ NO configurada',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ NO configurada',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ NO configurada',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ NO configurada'
  };

  const canConnect = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: '✅ Endpoint funcionando!',
      method: event.httpMethod,
      receivedData: event.body ? JSON.parse(event.body) : null,
      timestamp: new Date().toISOString(),
      environmentVariables: envCheck,
      canConnectToSupabase: canConnect,
      recommendation: canConnect
        ? '✅ Variables configuradas correctamente'
        : '❌ Configurar variables en: https://app.netlify.com/sites/roaring-monstera-1c604c/settings/env'
    })
  };
};
