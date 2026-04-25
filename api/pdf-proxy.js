const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Función para hacer request HTTP
function makeHttpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Proxy para N8N webhook PDF upload con CORS habilitado
exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    console.log('📤 PDF Proxy: Iniciando procesamiento');
    console.log('Request details:', {
      httpMethod: event.httpMethod,
      contentType: event.headers['content-type'],
      isBase64: event.isBase64Encoded,
      bodyLength: event.body?.length || 0
    });
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20)
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // URL del webhook N8N para PDF upload
    const n8nWebhookUrl = 'https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload';

    // El body viene en base64 para archivos
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    console.log('📤 Enviando PDF a N8N...', {
      bodySize: bodyBuffer.length,
      contentType: contentType
    });

    // Hacer request al webhook N8N manteniendo el Content-Type original
    const response = await makeHttpRequest(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': bodyBuffer.length
      }
    }, bodyBuffer);

    console.log('📥 Respuesta de N8N - Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ N8N error:', errorText);
      throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
    }

    // Leer respuesta
    const responseText = await response.text();
    console.log('📥 Respuesta de N8N - Body length:', responseText.length);

    // Intentar parsear como JSON
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
      console.log('✅ Datos extraídos correctamente');
    } catch (e) {
      console.error('❌ Error parseando respuesta de N8N:', e);
      console.error('Response text:', responseText.substring(0, 500));
      throw new Error('N8N no devolvió JSON válido');
    }

    // Validar estructura básica de los datos
    if (!extractedData.client_details || !extractedData.order_information || !extractedData.product_details) {
      console.error('❌ Estructura de datos inválida:', Object.keys(extractedData));
      throw new Error('Los datos extraídos no tienen la estructura esperada');
    }

    console.log('✅ Estructura validada, guardando en Supabase...');

    // Guardar pedido en Supabase
    try {
      // Obtener el primer usuario para asignar el pedido
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)
        .single();

      if (usersError || !users) {
        console.error('❌ No se encontró ningún usuario:', usersError);
        throw new Error('No hay usuarios en el sistema');
      }

      const assignedUserId = users.id;
      const clientName = extractedData.client_details?.company_name || 'Cliente';
      const fileName = `Pedido-${clientName}-${extractedData.order_information?.event_date || 'sin-fecha'}`.replace(/\s+/g, '-');

      // 1. Insertar orden principal
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          file_name: fileName,
          event_date: extractedData.order_information.event_date || '',
          client_company: extractedData.client_details.company_name || '',
          client_contact: extractedData.client_details.contact_person || '',
          client_address: extractedData.client_details.address || '',
          client_phone: extractedData.client_details.phone_number || '',
          number_of_attendees: parseInt(extractedData.order_information.number_of_attendees) || 0,
          sales_representative: extractedData.order_information.sales_representative || '',
          extracted_data: extractedData,
          user_id: assignedUserId,
          completion_status: {
            tableware: 0,
            products: 0,
            totalTableware: extractedData.packaging_and_tableware.tableware_details.filter(item => parseInt(item.quantity || 0) > 0).length,
            totalProducts: extractedData.product_details.length
          }
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Error al insertar orden:', orderError);
        throw orderError;
      }

      console.log('✅ Orden creada:', order.id);

      // 2. Insertar productos
      if (extractedData.product_details && extractedData.product_details.length > 0) {
        const products = extractedData.product_details.map(product => ({
          order_id: order.id,
          product_name: product.product_name || '',
          category: product.category || product.Categoria || '',
          quantity: parseInt(product.quantity) || 0,
          format: product.format || '',
          size: product.size || '',
          packaging: product.packaging || ''
        }));

        const { error: productsError } = await supabase
          .from('order_products')
          .insert(products);

        if (productsError) {
          console.error('❌ Error al insertar productos:', productsError);
        } else {
          console.log(`✅ ${products.length} productos insertados`);
        }
      }

      // 3. Insertar menaje
      if (extractedData.packaging_and_tableware?.tableware_details &&
          extractedData.packaging_and_tableware.tableware_details.length > 0) {
        const tableware = extractedData.packaging_and_tableware.tableware_details
          .filter(item => parseInt(item.quantity || 0) > 0)
          .map(item => ({
            order_id: order.id,
            item_name: item.item_name || '',
            quantity: parseInt(item.quantity) || 0
          }));

        if (tableware.length > 0) {
          const { error: tablewareError } = await supabase
            .from('order_tableware')
            .insert(tableware);

          if (tablewareError) {
            console.error('❌ Error al insertar menaje:', tablewareError);
          } else {
            console.log(`✅ ${tableware.length} items de menaje insertados`);
          }
        }
      }

      // 4. Insertar horarios de comida
      const mealTimes = extractedData.order_information.meal_times;
      const mealTimesArray = [];

      if (mealTimes) {
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
          const meal = mealTimes[mealType];
          if (meal && meal.preparation_time && meal.delivery_time) {
            mealTimesArray.push({
              order_id: order.id,
              meal_type: mealType,
              preparation_time: meal.preparation_time,
              travel_time: meal.travel_time || '',
              delivery_time: meal.delivery_time,
              delivery_responsible: meal.delivery_responsible || ''
            });
          }
        });
      }

      if (mealTimesArray.length > 0) {
        const { error: mealTimesError } = await supabase
          .from('meal_times')
          .insert(mealTimesArray);

        if (mealTimesError) {
          console.error('❌ Error al insertar horarios:', mealTimesError);
        } else {
          console.log(`✅ ${mealTimesArray.length} horarios insertados`);
        }
      }

      console.log('🎉 Pedido guardado completamente');

      // Devolver los datos extraídos MÁS el ID del pedido
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Pedido procesado y guardado correctamente',
          orderId: order.id,
          extractedData: extractedData
        })
      };

    } catch (dbError) {
      console.error('❌ Error guardando en base de datos:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error procesando PDF',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
