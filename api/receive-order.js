const { createClient } = require('@supabase/supabase-js');

// Función serverless debe inicializar Supabase dentro del handler
// Updated: 2025-10-08 21:56 - Added better error diagnostics

// Función serverless para Netlify
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

  // Si es GET, devolver diagnóstico de variables
  if (event.httpMethod === 'GET') {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Diagnóstico de Variables de Entorno',
        timestamp: new Date().toISOString(),
        environmentVariables: {
          SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NO configurada',
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ NO configurada',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ NO configurada',
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ NO configurada',
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ NO configurada'
        },
        resolved: {
          url: supabaseUrl || 'NO ENCONTRADA',
          key: supabaseKey ? (supabaseKey.substring(0, 30) + '...') : 'NO ENCONTRADA'
        },
        canConnect: !!(supabaseUrl && supabaseKey),
        availableSupabaseKeys: Object.keys(process.env).filter(k =>
          k.includes('SUPABASE') || k.includes('supabase') || k.includes('VITE')
        )
      }, null, 2)
    };
  }

  // Solo permitir POST para crear pedidos
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Inicializar Supabase DENTRO del handler para tener acceso a las env vars
    // IMPORTANTE: Limpiar las variables para eliminar espacios o caracteres invisibles
    // Usamos SERVICE_ROLE_KEY para bypass de RLS en webhooks
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    const keySource = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'unknown';

    console.log('🔧 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlValue: supabaseUrl,
      keySource,
      keyPrefix: supabaseKey?.substring(0, 30),
      keyLength: supabaseKey?.length,
      // Mostrar primeros 50 caracteres de cada key disponible
      keys: {
        serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50) || 'not set',
        anon: process.env.SUPABASE_ANON_KEY?.substring(0, 50) || 'not set',
        viteAnon: process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 50) || 'not set'
      },
      availableEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE'))
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing Supabase credentials',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          availableEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE'))
        })
      };
    }

    // Validar formato de la API key (JWT)
    if (!supabaseKey.startsWith('eyJ')) {
      console.error('❌ Invalid Supabase API key format!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid API key',
          details: 'The Supabase API key does not have the correct JWT format. It should start with "eyJ"',
          keyPrefix: supabaseKey.substring(0, 10),
          keyLength: supabaseKey.length
        })
      };
    }

    // Crear cliente de Supabase con configuración adicional
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('✅ Cliente de Supabase creado');

    // REGISTRAR TODO LO QUE LLEGA
    const logData = {
      endpoint: '/api/receive-order',
      method: event.httpMethod,
      headers: event.headers || {},
      body: event.body ? JSON.parse(event.body) : {},
      response_status: null,
      response_body: null,
      error: null
    };

    // Parsear el body
    let body = JSON.parse(event.body || '{}');

    console.log('📥 Webhook recibido');
    console.log('📦 Body type:', Array.isArray(body) ? 'Array' : typeof body);
    console.log('📦 Body:', JSON.stringify(body, null, 2));

    // Guardar log inicial
    try {
      const { data: logResult, error: logError } = await supabase.from('webhook_logs').insert(logData);
      if (logError) {
        console.error('⚠️ Error guardando log en Supabase:', {
          message: logError.message,
          details: logError.details,
          hint: logError.hint,
          code: logError.code
        });
      } else {
        console.log('✅ Log guardado correctamente');
      }
    } catch (logError) {
      console.error('⚠️ Excepción al guardar log:', logError);
    }

    // Si el body es un array con formato N8N [{ output: {...} }]
    let extractedData;
    let fileName;
    let clientName;
    let clientId;

    if (Array.isArray(body) && body.length > 0 && body[0].output) {
      // Formato N8N: [{ output: { client_details, ... } }]
      console.log('✅ Formato N8N detectado (array con output)');
      extractedData = body[0].output;

      // Extraer nombre del cliente del extractedData
      clientName = extractedData.client_details?.company_name || 'Cliente';
      clientId = clientName.toLowerCase().replace(/\s+/g, '-');
      fileName = `Pedido-${clientName}-${extractedData.order_information?.event_date || 'sin-fecha'}`.replace(/\s+/g, '-');
    } else if (Array.isArray(body) && body.length > 0) {
      // Formato N8N directo: [{ client_details, ... }]
      console.log('✅ Formato N8N detectado (array directo)');
      extractedData = body[0];

      clientName = extractedData.client_details?.company_name || 'Cliente';
      clientId = clientName.toLowerCase().replace(/\s+/g, '-');
      fileName = `Pedido-${clientName}-${extractedData.order_information?.event_date || 'sin-fecha'}`.replace(/\s+/g, '-');
    } else if (body.client_details) {
      // Formato directo con estructura completa
      console.log('✅ Formato directo detectado (objeto con client_details)');
      extractedData = body;

      clientName = extractedData.client_details?.company_name || 'Cliente';
      clientId = clientName.toLowerCase().replace(/\s+/g, '-');
      fileName = `Pedido-${clientName}-${extractedData.order_information?.event_date || 'sin-fecha'}`.replace(/\s+/g, '-');
    } else {
      // Formato directo: { extractedData, fileName, clientName, clientId }
      console.log('✅ Formato directo detectado (wrapper)');
      ({ extractedData, fileName, clientName, clientId } = body);
    }

    // Validar que los datos requeridos estén presentes
    if (!extractedData) {
      console.error('❌ extractedData no encontrado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'extractedData is required' })
      };
    }

    // Validar estructura básica
    const requiredFields = ['client_details', 'order_information', 'packaging_and_tableware', 'product_details'];
    for (const field of requiredFields) {
      if (!extractedData[field]) {
        console.error(`❌ Campo requerido faltante: ${field}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    console.log('✅ Datos validados correctamente:', {
      clientName,
      fileName,
      productsCount: extractedData.product_details.length
    });

    // Guardar pedido en Supabase
    console.log('💾 Iniciando guardado en Supabase...');
    try {
      // En serverless no hay sesión de usuario, el pedido se crea sin user_id
      // El user_id es null por defecto (permitido por RLS)
      const assignedUserId = null;
      console.log('📝 Creando pedido sin asignar usuario (webhook público)');

      // 1. Insertar orden principal
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          file_name: fileName || `Pedido-${clientName}`,
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
        console.error('❌ Error al insertar orden:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });

        logData.error = JSON.stringify(orderError);
        logData.response_status = 500;
        logData.response_body = { error: 'Database error', details: orderError.message };

        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Database error',
            details: orderError.message,
            hint: orderError.hint,
            code: orderError.code
          })
        };
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

      console.log('🎉 Pedido guardado completamente en Supabase');

      // Actualizar log con éxito
      try {
        await supabase.from('webhook_logs').insert({
          ...logData,
          response_status: 200,
          response_body: 'Order saved successfully'
        });
      } catch (logError) {
        console.error('⚠️ No se pudo actualizar log de éxito:', logError.message);
      }

    } catch (dbError) {
      console.error('❌ Error guardando en base de datos:', dbError);
      console.error('❌ Stack trace:', dbError.stack);
      console.error('❌ Full error object:', JSON.stringify(dbError, null, 2));

      // Guardar log de error
      try {
        await supabase.from('webhook_logs').insert({
          ...logData,
          response_status: 500,
          error: dbError.message
        });
      } catch (logError) {
        console.error('⚠️ No se pudo guardar log de error:', logError.message);
      }

      // Retornar error para que N8N lo vea
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database error',
          details: dbError.message,
          stack: dbError.stack
        })
      };
    }

    // Respuesta exitosa con instrucciones para el frontend
    const responseHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Procesando pedido...</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; }
          .loading { color: #007bff; }
        </style>
    </head>
    <body>
        <div class="loading">
          <h2>✅ Pedido recibido correctamente</h2>
          <p>Procesando datos...</p>
        </div>
        <script>
            // Intentar enviar datos al frontend
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'N8N_ORDER_DATA',
                  payload: {
                    extractedData: ${JSON.stringify(extractedData)},
                    fileName: "${fileName || 'Pedido-N8N'}",
                    clientName: "${clientName || ''}",
                    clientId: "${clientId || ''}"
                  }
                }, '*');
                
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                // Si no hay ventana padre, mostrar mensaje y redirigir
                document.body.innerHTML = \`
                  <div class="success">
                    <h2>✅ Pedido procesado exitosamente</h2>
                    <p>Redirigiendo a la aplicación...</p>
                  </div>
                \`;
                
                setTimeout(() => {
                  window.location.href = '/';
                }, 3000);
              }
            } catch (error) {
              console.error('Error sending data to parent:', error);
              document.body.innerHTML = \`
                <div class="success">
                  <h2>✅ Pedido recibido</h2>
                  <p>Por favor, actualiza la aplicación para ver el nuevo pedido.</p>
                  <a href="/" style="color: #007bff; text-decoration: none;">Ir a la aplicación</a>
                </div>
              \`;
            }
        </script>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html'
      },
      body: responseHtml
    };

  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};