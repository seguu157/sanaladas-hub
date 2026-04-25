import { useState, useEffect } from 'react';
import { ExtractedData, Order } from '../types';

interface WebhookData {
  extractedData: ExtractedData;
  fileName?: string;
  clientName?: string;
  clientId?: string;
}

export const useWebhookReceiver = (onOrderReceived: (order: Order) => void, onClientConversation?: (clientName: string, clientId: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [lastReceived, setLastReceived] = useState<Date | null>(null);

  useEffect(() => {
    // Crear endpoint para recibir datos de N8N
    const handleWebhookData = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'N8N_ORDER_DATA') {
        const webhookData: WebhookData = event.data.payload;
        
        // Si hay información del cliente, crear/actualizar conversación
        if (webhookData.clientName && webhookData.clientId && onClientConversation) {
          onClientConversation(webhookData.clientName, webhookData.clientId);
        }
        
        // Crear nueva orden con los datos recibidos
        const newOrder: Order = {
          id: Date.now().toString(),
          fileName: webhookData.fileName || `Pedido-${new Date().toLocaleDateString()}`,
          uploadDate: new Date(),
          data: webhookData.extractedData,
          completionStatus: {
            tableware: 0,
            products: 0,
            totalTableware: 0,
            totalProducts: webhookData.extractedData.product_details.length
          },
          comments: []
        };
        
        onOrderReceived(newOrder);
        setLastReceived(new Date());
      }
    };

    window.addEventListener('message', handleWebhookData);
    setIsListening(true);

    return () => {
      window.removeEventListener('message', handleWebhookData);
      setIsListening(false);
    };
  }, [onOrderReceived, onClientConversation]);

  return { isListening, lastReceived };
};