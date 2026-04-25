// Función simple para probar la subida de PDF a N8N
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('=== TEST: Iniciando ===');
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Body size:', event.body?.length);
    console.log('isBase64Encoded:', event.isBase64Encoded);

    // Usar node-fetch que es compatible con Netlify Functions
    const fetch = require('node-fetch');
    const FormData = require('form-data');

    // Reconstruir el FormData del body
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

    console.log('Buffer size:', bodyBuffer.length);

    // Reenviar directamente a N8N
    const n8nUrl = 'https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload';

    console.log('Enviando a N8N...');

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': event.headers['content-type'] || 'multipart/form-data',
      },
      body: bodyBuffer
    });

    console.log('N8N Response Status:', response.status);
    console.log('N8N Response Headers:', JSON.stringify(response.headers.raw()));

    const responseText = await response.text();
    console.log('N8N Response Length:', responseText.length);
    console.log('N8N Response Preview:', responseText.substring(0, 500));

    // Intentar parsear
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSON válido');
    } catch (e) {
      console.error('❌ No es JSON válido');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'N8N no devolvió JSON',
          response: responseText.substring(0, 1000),
          status: response.status
        })
      };
    }

    // Devolver lo que N8N devolvió
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PDF recibido por N8N',
        n8nResponse: data,
        n8nStatus: response.status
      })
    };

  } catch (error) {
    console.error('ERROR:', error);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
