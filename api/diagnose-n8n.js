// Endpoint de diagnóstico para verificar qué está devolviendo N8N
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const fetch = require('node-fetch');

    // Crear un PDF de prueba muy simple (solo para testing)
    const testPDF = Buffer.from('%PDF-1.4 test');

    console.log('🔍 Diagnóstico: Enviando PDF de prueba a N8N');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', testPDF, {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });

    const n8nUrl = 'https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload';

    console.log('📤 Enviando a:', n8nUrl);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    console.log('📥 Status:', response.status);
    console.log('📥 Status Text:', response.statusText);
    console.log('📥 Headers:', JSON.stringify(response.headers.raw()));

    const responseText = await response.text();
    console.log('📥 Response Length:', responseText.length);
    console.log('📥 Response (primeros 1000 chars):', responseText.substring(0, 1000));

    // Intentar parsear como JSON
    let parsedData = null;
    let isJSON = false;

    try {
      parsedData = JSON.parse(responseText);
      isJSON = true;
      console.log('✅ Es JSON válido');
    } catch (e) {
      console.log('❌ NO es JSON válido');
      isJSON = false;
    }

    // Verificar si hay referencias a Supabase en la respuesta
    const mentionsSupabase = responseText.toLowerCase().includes('supabase');
    const mentionsAPIKey = responseText.toLowerCase().includes('api key');
    const mentionsDatabase = responseText.toLowerCase().includes('database');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        diagnosis: {
          n8nStatus: response.status,
          n8nStatusText: response.statusText,
          responseLength: responseText.length,
          isValidJSON: isJSON,
          mentionsSupabase: mentionsSupabase,
          mentionsAPIKey: mentionsAPIKey,
          mentionsDatabase: mentionsDatabase,
          responsePreview: responseText.substring(0, 500)
        },
        parsedData: parsedData,
        fullResponse: responseText,
        recommendation: isJSON
          ? '✅ N8N está devolviendo JSON correctamente'
          : '❌ N8N no está devolviendo JSON. Verifica que el último nodo sea "Respond to Webhook" y que devuelva JSON.'
      })
    };

  } catch (error) {
    console.error('❌ ERROR en diagnóstico:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        recommendation: 'Error al conectar con N8N. Verifica que el webhook esté activo.'
      })
    };
  }
};
