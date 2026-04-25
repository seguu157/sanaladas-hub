import React, { useState } from 'react';
import { Webhook, CheckCircle, Clock, Copy, ExternalLink } from 'lucide-react';

interface WebhookReceiverProps {
  isListening: boolean;
  lastReceived: Date | null;
}

const WebhookReceiver: React.FC<WebhookReceiverProps> = ({ isListening, lastReceived }) => {
  const [showInstructions, setShowInstructions] = useState(false);
  
  // URL del webhook (en producción sería tu dominio real)
  const webhookUrl = `${window.location.origin}/api/receive-order`;
  
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  const n8nInstructions = `
// Configuración en N8N:

1. WEBHOOK NODE (Trigger):
   - Method: POST
   - Path: /receive-order
   - Response Mode: Respond to Webhook

2. FUNCTION NODE (Procesar PDF):
   // Tu lógica de extracción aquí
   // Debe devolver el JSON en el formato requerido

3. HTTP REQUEST NODE (Enviar a App):
   - Method: POST
   - URL: ${window.location.origin}/api/receive-order
   - Headers: 
     * Content-Type: application/json
   - Body (JSON):
   {
     "extractedData": {{$json.extractedData}},
     "fileName": {{$json.fileName || "Pedido-N8N"}},
     "clientName": {{$json.extractedData.client_details.company_name}},
     "clientId": {{$json.extractedData.client_details.company_name.toLowerCase().replace(/\\s+/g, '-')}}
   }

// Ejemplo de respuesta esperada:
{
  "extractedData": {
    "client_details": {
      "company_name": "Empresa Ejemplo",
      "contact_person": "Juan Pérez",
      "address": "Calle Mayor 123",
      "phone_number": "912345678"
    },
    "order_information": {
      "event_date": "25 diciembre",
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
    "packaging_and_tableware": {
      "tableware_details": [
        {
          "item_name": "Platos 20cm",
          "quantity": "50"
        }
      ]
    },
    "product_details": [
      {
        "Categoria": "Sandwiches",
        "product_name": "Bocadillo de jamón ibérico",
        "quantity": "25",
        "format": "Medio bocadillo",
        "size": "15cm",
        "packaging": "Bandeja"
      }
    ]
  },
  "fileName": "Pedido-Cliente-25-Dic",
  "clientName": "Empresa Ejemplo",
  "clientId": "empresa-ejemplo"
}
`;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isListening ? 'bg-green-100' : 'bg-slate-100'
          }`}>
            <Webhook className={`h-5 w-5 ${
              isListening ? 'text-green-600' : 'text-slate-400'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Receptor N8N
            </h3>
            <div className="flex items-center gap-2 text-sm">
              {isListening ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Escuchando webhooks</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Desconectado</span>
                </>
              )}
              {lastReceived && (
                <span className="text-slate-500 ml-2">
                  • Último: {lastReceived.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Configurar N8N
        </button>
      </div>

      {/* URL del Webhook */}
      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs text-slate-600 mb-1">URL del Webhook:</p>
            <code className="text-sm text-slate-800 break-all">
              {webhookUrl}
            </code>
          </div>
          <button
            onClick={copyWebhookUrl}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Copiar URL"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      {showInstructions && (
        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-3">
            Configuración en N8N
          </h4>
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-xs whitespace-pre-wrap">
              {n8nInstructions}
            </pre>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Importante:</strong> Asegúrate de que el JSON que envía N8N 
              coincida exactamente con la estructura definida en la documentación.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookReceiver;