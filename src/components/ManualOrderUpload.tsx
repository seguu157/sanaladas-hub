import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ManualOrderUpload: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const payload = JSON.parse(jsonInput);

      if (!payload.extractedData) {
        throw new Error('El JSON debe contener "extractedData"');
      }

      const extractedData = payload.extractedData;
      const fileName = payload.fileName || `Pedido-${extractedData.client_details.company_name}`;

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
          completion_status: {
            tableware: 0,
            products: 0,
            totalTableware: extractedData.packaging_and_tableware.tableware_details.filter((item: any) => parseInt(item.quantity || 0) > 0).length,
            totalProducts: extractedData.product_details.length
          }
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (extractedData.product_details && extractedData.product_details.length > 0) {
        const products = extractedData.product_details.map((product: any) => ({
          order_id: order.id,
          product_name: product.product_name || '',
          category: product.category || product.Categoria || '',
          quantity: parseInt(product.quantity) || 0,
          format: product.format || '',
          size: product.size || '',
          packaging: product.packaging || ''
        }));

        await supabase.from('order_products').insert(products);
      }

      if (extractedData.packaging_and_tableware?.tableware_details &&
          extractedData.packaging_and_tableware.tableware_details.length > 0) {
        const tableware = extractedData.packaging_and_tableware.tableware_details
          .filter((item: any) => parseInt(item.quantity || 0) > 0)
          .map((item: any) => ({
            order_id: order.id,
            item_name: item.item_name || '',
            quantity: parseInt(item.quantity) || 0
          }));

        if (tableware.length > 0) {
          await supabase.from('order_tableware').insert(tableware);
        }
      }

      const mealTimes = extractedData.order_information.meal_times;
      const mealTimesArray = [];

      if (mealTimes.breakfast) {
        mealTimesArray.push({
          order_id: order.id,
          meal_type: 'breakfast',
          preparation_time: mealTimes.breakfast.preparation_time,
          travel_time: mealTimes.breakfast.travel_time,
          delivery_time: mealTimes.breakfast.delivery_time,
          delivery_responsible: mealTimes.breakfast.delivery_responsible
        });
      }

      if (mealTimes.lunch) {
        mealTimesArray.push({
          order_id: order.id,
          meal_type: 'lunch',
          preparation_time: mealTimes.lunch.preparation_time,
          travel_time: mealTimes.lunch.travel_time,
          delivery_time: mealTimes.lunch.delivery_time,
          delivery_responsible: mealTimes.lunch.delivery_responsible
        });
      }

      if (mealTimes.dinner) {
        mealTimesArray.push({
          order_id: order.id,
          meal_type: 'dinner',
          preparation_time: mealTimes.dinner.preparation_time,
          travel_time: mealTimes.dinner.travel_time,
          delivery_time: mealTimes.dinner.delivery_time,
          delivery_responsible: mealTimes.dinner.delivery_responsible
        });
      }

      if (mealTimesArray.length > 0) {
        await supabase.from('meal_times').insert(mealTimesArray);
      }

      setStatus('success');
      setMessage(`Pedido "${fileName}" creado exitosamente`);
      setJsonInput('');

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Error al procesar el JSON');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Upload className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Subida Manual de Pedidos
          </h3>
          <p className="text-sm text-slate-500">
            Pega el JSON del pedido y haz clic en Subir
          </p>
        </div>
      </div>

      <div className="mb-4">
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"extractedData": {...}, "fileName": "Pedido-123"}'
          className="w-full h-64 p-4 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={status === 'loading'}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!jsonInput.trim() || status === 'loading'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Subiendo...' : 'Subir Pedido'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{message}</span>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600 font-semibold mb-2">Formato esperado:</p>
        <pre className="text-xs text-slate-700 overflow-x-auto">
{`{
  "extractedData": {
    "client_details": {...},
    "order_information": {...},
    "packaging_and_tableware": {...},
    "product_details": [...]
  },
  "fileName": "Pedido-Cliente-123"
}`}
        </pre>
      </div>
    </div>
  );
};

export default ManualOrderUpload;
