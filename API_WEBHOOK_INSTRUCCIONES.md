# API Webhook - Instrucciones de Uso

## 📍 Endpoint

```
POST https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/receive-order
```

## 🔑 Autenticación

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4
```

---

## 🔄 Flujo de Trabajo

### Paso 1: Subir PDF desde la Interfaz

El usuario sube el PDF manualmente desde la aplicación web. El archivo se guarda en Storage y queda como "pendiente" esperando el JSON con los datos extraídos.

### Paso 2: Enviar JSON al Webhook

Tu sistema externo procesa el PDF, extrae los datos y envía un JSON al webhook. **El `fileName` debe coincidir exactamente con el nombre del PDF subido.**

```
┌─────────────────┐
│  1. Usuario     │
│  sube PDF       │
│  "pedido.pdf"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Sistema     │
│  procesa PDF    │
│  y extrae datos │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Envía JSON  │
│  fileName:      │
│  "pedido.pdf"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. API asocia  │
│  PDF al pedido  │
│  automáticamente│
└─────────────────┘
```

---

## 📤 Formato del Request

### Headers Requeridos

```
Content-Type: application/json
Authorization: Bearer {ANON_KEY}
```

### Estructura del Body

```json
{
  "fileName": "nombre-del-archivo.pdf",
  "extractedData": {
    "client_details": {
      "company_name": "string",
      "contact_person": "string",
      "address": "string",
      "phone_number": "string"
    },
    "order_information": {
      "event_date": "string",
      "number_of_attendees": "string",
      "sales_representative": "string",
      "meal_times": {
        "breakfast": {
          "preparation_time": "HH:MM",
          "travel_time": "string | null",
          "delivery_time": "HH:MM",
          "delivery_responsible": "nosotros | cliente"
        } | null,
        "lunch": { /* mismo formato */ } | null,
        "dinner": { /* mismo formato */ } | null
      }
    },
    "product_details": [
      {
        "Categoria": "string",
        "product_name": "string",
        "quantity": "string",
        "format": "string | null",
        "size": "string | null"
      }
    ]
  }
}
```

### Campo Crítico: `fileName`

⚠️ **IMPORTANTE**: El `fileName` debe ser **exactamente igual** al nombre del PDF que se subió desde la interfaz.

**Ejemplo**:
- PDF subido: `pedido-cliente-123.pdf`
- JSON fileName: `"pedido-cliente-123.pdf"` ✅

---

## 📋 Ejemplos de Uso

### cURL

```bash
curl -X POST https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/receive-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4" \
  -d '{
    "fileName": "pedido-cliente-123.pdf",
    "extractedData": {
      "client_details": {
        "company_name": "Empresa Ejemplo S.L.",
        "contact_person": "Juan Pérez",
        "address": "Calle Mayor 123, 28001 Madrid",
        "phone_number": "912345678"
      },
      "order_information": {
        "event_date": "15 enero",
        "number_of_attendees": "50",
        "sales_representative": "María García",
        "meal_times": {
          "breakfast": null,
          "lunch": {
            "preparation_time": "12:00",
            "travel_time": "45 min",
            "delivery_time": "13:30",
            "delivery_responsible": "nosotros"
          },
          "dinner": null
        }
      },
      "product_details": [
        {
          "Categoria": "Sandwiches",
          "product_name": "Bocadillo de jamón ibérico",
          "quantity": "25",
          "format": "Medio bocadillo",
          "size": "15cm"
        },
        {
          "Categoria": "Bebida",
          "product_name": "Agua mineral 1.5L",
          "quantity": "10",
          "format": "Botella",
          "size": "1.5L"
        }
      ]
    }
  }'
```

### Python

```python
import requests

url = "https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/receive-order"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4"
}

payload = {
    "fileName": "pedido-cliente-123.pdf",
    "extractedData": {
        "client_details": {
            "company_name": "Empresa Ejemplo S.L.",
            "contact_person": "Juan Pérez",
            "address": "Calle Mayor 123, 28001 Madrid",
            "phone_number": "912345678"
        },
        "order_information": {
            "event_date": "15 enero",
            "number_of_attendees": "50",
            "sales_representative": "María García",
            "meal_times": {
                "breakfast": None,
                "lunch": {
                    "preparation_time": "12:00",
                    "travel_time": "45 min",
                    "delivery_time": "13:30",
                    "delivery_responsible": "nosotros"
                },
                "dinner": None
            }
        },
        "product_details": [
            {
                "Categoria": "Sandwiches",
                "product_name": "Bocadillo de jamón ibérico",
                "quantity": "25",
                "format": "Medio bocadillo",
                "size": "15cm"
            },
            {
                "Categoria": "Bebida",
                "product_name": "Agua mineral 1.5L",
                "quantity": "10",
                "format": "Botella",
                "size": "1.5L"
            }
        ]
    }
}

response = requests.post(url, headers=headers, json=payload)
result = response.json()

if result.get("success"):
    print(f"✅ Pedido creado: {result['orderId']}")
else:
    print(f"❌ Error: {result.get('error')}")
```

### JavaScript/Node.js

```javascript
const response = await fetch('https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/receive-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4'
  },
  body: JSON.stringify({
    fileName: 'pedido-cliente-123.pdf',
    extractedData: {
      client_details: {
        company_name: "Empresa Ejemplo S.L.",
        contact_person: "Juan Pérez",
        address: "Calle Mayor 123, 28001 Madrid",
        phone_number: "912345678"
      },
      order_information: {
        event_date: "15 enero",
        number_of_attendees: "50",
        sales_representative: "María García",
        meal_times: {
          breakfast: null,
          lunch: {
            preparation_time: "12:00",
            travel_time: "45 min",
            delivery_time: "13:30",
            delivery_responsible: "nosotros"
          },
          dinner: null
        }
      },
      product_details: [
        {
          Categoria: "Sandwiches",
          product_name: "Bocadillo de jamón ibérico",
          quantity: "25",
          format: "Medio bocadillo",
          size: "15cm"
        }
      ]
    }
  })
});

const result = await response.json();
console.log(result);
```

---

## 📥 Respuestas

### ✅ Respuesta Exitosa

```json
{
  "success": true,
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Order created successfully"
}
```

### ❌ Error: Datos Faltantes

```json
{
  "error": "Missing extractedData or fileName"
}
```

### ❌ Error del Servidor

```json
{
  "error": "Internal server error",
  "details": "mensaje-de-error"
}
```

---

## 📝 Reglas Importantes

### ✅ Obligatorio

1. **`fileName`** - Debe coincidir exactamente con el PDF subido
2. **`Authorization` header** - Requerido en todas las peticiones
3. **`extractedData.client_details`** - Información del cliente
4. **`extractedData.order_information`** - Información del pedido
5. **`extractedData.product_details`** - Al menos 1 producto

### ❌ NO Incluir

1. **`packaging_and_tableware`** - No enviar información de vajilla
2. **`packaging` en productos** - No incluir campo packaging en productos
3. **PDF en el JSON** - No enviar `pdfBase64` o `pdfUrl` (el PDF ya está subido)

### 📎 Asociación del PDF

- El sistema busca automáticamente un PDF pendiente con el mismo `fileName`
- Si encuentra el PDF, lo asocia al pedido automáticamente
- El usuario puede descargar el PDF desde la interfaz para verificar
- Si no hay PDF pendiente, el pedido se crea sin archivo adjunto

---

## 🐛 Testing y Debugging

### Herramientas Recomendadas

- **Postman** - Cliente API con interfaz gráfica
- **Insomnia** - Alternativa a Postman
- **cURL** - Línea de comandos
- **Thunder Client** - Extensión de VS Code

### Verificar Asociación del PDF

1. El usuario sube `pedido-123.pdf` desde la interfaz
2. Tu sistema envía JSON con `"fileName": "pedido-123.pdf"`
3. La API responde con `success: true` y un `orderId`
4. El usuario puede ver el pedido con el PDF adjunto en la interfaz

### Logs del Servidor

Los logs de la Edge Function muestran:
```
Found pending PDF: pedido-123.pdf
Marked pending PDF {uuid} as processed for order {orderId}
```

---

## ⚡ Ventajas de este Método

✅ **Payload ligero** - No necesitas enviar el PDF en el JSON
✅ **Sin timeouts** - No hay problemas con archivos grandes
✅ **Más rápido** - El PDF ya está en Storage
✅ **Verificación fácil** - El usuario puede ver el PDF inmediatamente
✅ **Sin duplicados** - El PDF se sube una sola vez

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que el `fileName` coincida exactamente
2. Verifica que el PDF se haya subido correctamente desde la interfaz
3. Revisa que los headers de autorización sean correctos
4. Comprueba que el formato del JSON sea válido
