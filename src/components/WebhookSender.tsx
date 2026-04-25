import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface WebhookSenderProps {
  pdfFile?: File;
  orderId?: string;
}

const WebhookSender: React.FC<WebhookSenderProps> = ({ pdfFile, orderId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const webhookUrl = 'https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload';

  const sendToWebhook = async () => {
    if (!pdfFile) {
      setError('No hay archivo PDF para enviar');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('orderId', orderId || Date.now().toString());
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'SANALADAS_HUB');
      formData.append('fileName', pdfFile.name);

      console.log('Enviando PDF al webhook:', webhookUrl);
      console.log('Archivo:', pdfFile.name, 'Tamaño:', pdfFile.size);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos timeout

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Respuesta del webhook:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Error desconocido');
          throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
        }

        // Intentar leer la respuesta
        const responseData = await response.json().catch(() => null);
        console.log('Datos recibidos:', responseData);

        setSuccess(true);
        setLastSent(new Date());
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('El procesamiento está tardando demasiado (más de 3 minutos). Por favor verifica N8N.');
        }
        throw fetchError;
      }
      
      // Limpiar el estado de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error('Error sending to webhook:', err);
      if (err.message?.includes('CORS')) {
        setError('Error CORS: Configura el webhook N8N para permitir solicitudes desde este dominio');
      } else if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setError('Error de red: No se puede conectar con el webhook N8N');
      } else {
        setError(err.message || 'Error al procesar PDF');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            success ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Send className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Enviar a N8N
            </h3>
            <div className="flex items-center gap-2 text-sm">
              {success ? (
                <span className="text-green-600">✓ Enviado correctamente</span>
              ) : error ? (
                <span className="text-red-600">✗ Error al enviar</span>
              ) : (
                <span className="text-slate-500">Listo para enviar</span>
              )}
              {lastSent && (
                <span className="text-slate-500 ml-2">
                  • Último envío: {lastSent.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={sendToWebhook}
          disabled={isLoading || !pdfFile}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
            success
              ? 'bg-green-600 text-white'
              : error
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : success ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Enviado
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar PDF
            </>
          )}
        </button>
      </div>

      {/* URL del Webhook */}
      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <p className="text-xs text-slate-600 mb-1">Webhook URL:</p>
        <code className="text-xs text-slate-800 break-all">
          {webhookUrl}
        </code>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Información del archivo */}
      {pdfFile && (
        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-2 text-sm">
            Archivo que se enviará:
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
            <div>
              <span className="font-medium">Nombre:</span> {pdfFile.name}
            </div>
            <div>
              <span className="font-medium">Tamaño:</span> {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <div>
              <span className="font-medium">Tipo:</span> {pdfFile.type}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookSender;