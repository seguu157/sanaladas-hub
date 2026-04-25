// Proxy para N8N webhook con CORS habilitado
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // URL del webhook N8N (corregida para usar /webhook/ en lugar de /webhook-test/)
    const n8nWebhookUrl = 'https://sanaladas-n8n.lytrap.easypanel.host/webhook/49b250b0-c767-4ecb-a176-5731ebd675ac';

    // Parsear el body
    const body = JSON.parse(event.body || '{}');

    console.log('Proxying request to N8N:', body);

    // Hacer request al webhook N8N con timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    const fetchPromise = fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    try {
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log('N8N response status:', response.status);

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      // Leer respuesta
      const responseText = await response.text();
      console.log('N8N response:', responseText);

      // Intentar parsear como JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        // Si no es JSON válido o está vacío, devolver mensaje de éxito
        responseData = {
          success: true,
          message: responseText || 'Request processed successfully'
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData)
      };
    } catch (fetchError) {
      // Si es un timeout, devolver respuesta de éxito asumiendo que N8N procesó la request
      if (fetchError.message === 'Request timeout') {
        console.log('N8N request timed out, but likely processing in background');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Request sent to N8N (processing in background)',
            timeout: true
          })
        };
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Proxy error',
        details: error.message 
      })
    };
  }
};