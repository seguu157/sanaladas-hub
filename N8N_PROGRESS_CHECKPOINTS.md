# Checkpoints de progreso reales en n8n

Este documento describe los nodos que hay que añadir al workflow `DASHBOARD.2.0`
para que el dashboard reciba **checkpoints reales** del progreso vía Supabase
Realtime, en lugar de avanzar el stepper con tiempos estimados.

## Componentes en este repositorio

| Pieza | Ubicación | Qué hace |
| --- | --- | --- |
| Migración | `supabase/migrations/20260428120000_add_status_to_pending_pdfs.sql` | Añade `status`, `status_updated_at` y `error_message` a `pending_pdfs` |
| Edge function | `supabase/functions/update-pdf-status/index.ts` | Recibe `{ pendingPdfId, status, errorMessage? }` y actualiza la fila |
| Edge function | `supabase/functions/receive-order/index.ts` | Marca `status='completed'` al asociar el pedido |
| Frontend | `src/App.tsx` | Envía `pendingPdfId` en el FormData y se suscribe vía Realtime |

## Despliegue (en orden)

```bash
# 1) aplicar migración
supabase db push

# 2) desplegar nuevas funciones
supabase functions deploy update-pdf-status
supabase functions deploy receive-order
```

## URL de la edge function

```
POST https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/update-pdf-status
```

**Headers**

```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

(usa la misma anon key que ya tienes en `HTTP Request4` para `receive-order`)

**Body** (JSON)

```json
{
  "pendingPdfId": "{{ $('Webhook').first().json.body.pendingPdfId }}",
  "status": "<uno de los valores permitidos>"
}
```

Valores permitidos para `status`:

- `uploaded` — lo escribe el dashboard al subir
- `sent_to_n8n` — lo escribe el dashboard antes de hacer fetch
- `received_by_llamaindex` — **n8n debe escribirlo** justo tras `HTTP Request3` (cuando LlamaIndex devuelve el `file_id`). **Este es el checkpoint clave** que confirma de forma real que el PDF llegó a LlamaIndex.
- `extracting_ai` — **n8n debe escribirlo** tras crear el extraction job (LlamaIndex empieza la fase larga de IA)
- `creating_order` — **n8n debe escribirlo** antes de POST a `receive-order`
- `completed` — lo escribe `receive-order` automáticamente
- `failed` — lo escribe el dashboard o n8n ante un error

## Nodos a añadir en `DASHBOARD.2.0`

Añade **hasta 4 nodos HTTP Request** del tipo `n8n-nodes-base.httpRequest`.
Los he ordenado por el momento del flujo en el que deben dispararse. El
**Checkpoint 1** es el más importante (es el que confirma de forma real que
el PDF llegó a LlamaIndex); los demás son opcionales pero recomendados.

### Checkpoint 1 — `received_by_llamaindex` 🎯 (el que querías)

**Posición**: insertarlo **inmediatamente después de `HTTP Request3`** (el
nodo que hace `POST https://api.cloud.llamaindex.ai/api/v1/files`) y antes
de `2. Create Extraction Job2`. En ese punto LlamaIndex ya respondió con
el `file_id`, así que tenemos confirmación real de que recibió el PDF.

Conexión: `HTTP Request3` → `Status: received_by_llamaindex` → `2. Create Extraction Job2`.

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/update-pdf-status",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"pendingPdfId\": \"{{ $('Webhook').first().json.body.pendingPdfId }}\",\n  \"status\": \"received_by_llamaindex\",\n  \"llamaindex_file_id\": \"{{ $json.id }}\"\n}",
    "options": {}
  },
  "name": "Status: received_by_llamaindex",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "onError": "continueRegularOutput"
}
```

> El campo extra `llamaindex_file_id` no se persiste (la edge function lo
> ignora) pero queda en los logs de n8n para debugging si lo necesitas.

### Checkpoint 2 — `extracting_ai`

**Posición sugerida**: justo después de `2. Create Extraction Job2`, antes de
`Wait`. Esto le dice al dashboard que el extraction job se creó y la IA
está procesando (la fase larga de 1-2 min).

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/update-pdf-status",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"pendingPdfId\": \"{{ $('Webhook').first().json.body.pendingPdfId }}\",\n  \"status\": \"extracting_ai\"\n}",
    "options": {}
  },
  "name": "Status: extracting_ai",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "onError": "continueRegularOutput"
}
```

### Checkpoint 3 — `creating_order`

**Posición sugerida**: justo antes de `HTTP Request4` (el que llama a
`receive-order`). Le dice al dashboard que la IA terminó y vamos a crear el
pedido en la base de datos.

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/update-pdf-status",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"pendingPdfId\": \"{{ $('Webhook').first().json.body.pendingPdfId }}\",\n  \"status\": \"creating_order\"\n}",
    "options": {}
  },
  "name": "Status: creating_order",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "onError": "continueRegularOutput"
}
```

### Checkpoint 4 — `failed` (opcional, recomendado)

**Posición sugerida**: conectado al output de error de `Stop and Error` (o
en cualquier branch que termine en error). Marca el pending_pdf como `failed`
para que el dashboard pinte el paso en rojo y muestre el mensaje.

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://wfbdxxpegggmbvfoteml.supabase.co/functions/v1/update-pdf-status",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"pendingPdfId\": \"{{ $('Webhook').first().json.body.pendingPdfId }}\",\n  \"status\": \"failed\",\n  \"errorMessage\": \"{{ $json.error || 'Procesamiento fallido' }}\"\n}",
    "options": {}
  },
  "name": "Status: failed",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "onError": "continueRegularOutput"
}
```

## Notas

- **`onError: continueRegularOutput`** en los 3 nodos: si el callback de
  status falla por cualquier motivo, no queremos que rompa el procesamiento
  del pedido. El status es solo UX.
- **`{{ $('Webhook').first().json.body.pendingPdfId }}`** asume que el primer
  nodo del workflow se llama `Webhook` (es el caso). Si renombras el nodo,
  ajusta la expresión.
- **Si no añades estos nodos**, el dashboard sigue funcionando: el frontend
  tiene un timer de fallback (8s) que mueve el stepper de "sending" a
  "extracting" automáticamente, y `receive-order` sigue marcando `completed`
  al final. Pero no verás el momento exacto en el que la IA empezó a procesar
  ni cuando se está creando el pedido en la BD.

## Cómo probar localmente

1. Aplica la migración (`supabase db push`).
2. Despliega `update-pdf-status` y `receive-order` (`supabase functions deploy ...`).
3. Sube un PDF desde el dashboard.
4. Mientras procesa, abre la consola del navegador y deberías ver logs:
   ```
   🔔 pending_pdf realtime update: { status: 'sent_to_n8n', ... }
   🔔 pending_pdf realtime update: { status: 'received_by_llamaindex', ... } ← checkpoint 1
   🔔 pending_pdf realtime update: { status: 'extracting_ai', ... }          ← checkpoint 2
   🔔 pending_pdf realtime update: { status: 'creating_order', ... }         ← checkpoint 3
   🔔 pending_pdf realtime update: { status: 'completed', ... }              ← lo emite receive-order
   ```
5. Verifica con SQL:
   ```sql
   SELECT id, file_name, status, status_updated_at
   FROM pending_pdfs
   ORDER BY uploaded_at DESC LIMIT 5;
   ```
