import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Check, Package } from 'lucide-react';
import { ExtractedData } from '../../types';
import { supabase } from '../../lib/supabase';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { withHangGuard } from '../../lib/supabaseHangGuard';

interface TablewareProps {
  data: ExtractedData['packaging_and_tableware'];
  orderId?: string | null;
  onUpdateCompletion?: (tableware: number, products: number) => void;
}

const Tableware: React.FC<TablewareProps> = ({ data, orderId, onUpdateCompletion }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [productPackaging, setProductPackaging] = useState<Record<string, string>>({});

  const loadOrderProgress = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('*')
        .eq('order_id', orderId)
        .eq('item_type', 'tableware')
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;

      const checked: Record<string, boolean> = {};
      progressData?.forEach(item => {
        checked[item.item_name] = item.is_completed;
      });

      setCheckedItems(checked);
    } catch (error) {
      console.error('Error loading tableware progress:', error);
    }
  }, [orderId]);

  const loadOrderPackaging = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('order_packaging')
        .select(`
          *,
          packaging_types (
            id,
            name,
            description,
            product_reference
          )
        `)
        .eq('order_id', orderId)
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;

      // Group by product and build packaging strings
      const packagingMap: Record<string, string> = {};

      if (data) {
        const grouped = data.reduce((acc, item) => {
          if (!acc[item.product_name]) {
            acc[item.product_name] = [];
          }
          acc[item.product_name].push({
            name: item.packaging_types.name,
            quantity: item.quantity
          });
          return acc;
        }, {} as Record<string, Array<{ name: string; quantity: number }>>);

        Object.entries(grouped).forEach(([productName, packagings]) => {
          packagingMap[productName] = packagings
            .map(p => `${p.name} (x${p.quantity})`)
            .join(', ');
        });
      }

      setProductPackaging(packagingMap);
    } catch (error) {
      console.error('Error loading order packaging:', error);
    }
  }, [orderId]);

  const initializeOrderProgress = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data: existingProgress, error: fetchError } = await supabase
        .from('order_progress')
        .select('item_name')
        .eq('order_id', orderId)
        .eq('item_type', 'tableware')
        .abortSignal(AbortSignal.timeout(15000));

      if (fetchError) throw fetchError;

      const existingItemNames = new Set(existingProgress?.map(p => p.item_name) || []);

      const activeItems = data.tableware_details.filter(item => parseInt(item.quantity) > 0);
      const newItems = activeItems.filter(item => !existingItemNames.has(item.item_name));

      if (newItems.length > 0) {
        const progressRecords = newItems.map(item => ({
          order_id: orderId,
          item_type: 'tableware',
          item_name: item.item_name,
          is_completed: false,
          has_allergy: false
        }));

        const { error: insertError } = await supabase
          .from('order_progress')
          .insert(progressRecords);

        if (insertError) throw insertError;

        await updateCompletionStatus();
      }
    } catch (error) {
      console.error('Error initializing tableware progress:', error);
    }
  // updateCompletionStatus se define más abajo y depende de orderId; aquí solo
  // necesitamos reentrar cuando cambia el pedido o el array de items.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, data.tableware_details]);

  // Cargar estado desde DB e inicializar progreso al montar / cambiar pedido
  useEffect(() => {
    if (orderId) {
      initializeOrderProgress();
      loadOrderProgress();
      loadOrderPackaging();
    }
  }, [orderId, initializeOrderProgress, loadOrderProgress, loadOrderPackaging]);

  // Refresco al volver de pestaña/idle
  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!orderId || timeHidden <= 3000) return;
      console.log('🔄 Reconnecting realtime for Tableware section...');

      try {
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('⚠️ Session refresh failed on wake:', e);
      }

      await Promise.all([loadOrderProgress(), loadOrderPackaging()]);
    }, [orderId, loadOrderProgress, loadOrderPackaging])
  });

  // Actualizar progreso cuando cambian los checkboxes
  useEffect(() => {
    if (onUpdateCompletion && orderId) {
      const completedItems = data.tableware_details.filter(item =>
        parseInt(item.quantity) > 0 && checkedItems[item.item_name]
      ).length;
      onUpdateCompletion(completedItems, 0);
    }
  }, [checkedItems, orderId, onUpdateCompletion, data.tableware_details]);

  const handleCheck = async (itemName: string) => {
    const newValue = !checkedItems[itemName];
    setCheckedItems(prev => ({
      ...prev,
      [itemName]: newValue
    }));

    if (orderId) {
      await saveTablewareProgress(itemName, newValue);
    }
  };

  const saveTablewareProgress = async (itemName: string, isCompleted: boolean) => {
    if (!orderId) return;

    try {
      // Guardar en order_progress
      const { error } = await withHangGuard(
        supabase
          .from('order_progress')
          .upsert({
            order_id: orderId,
            item_type: 'tableware',
            item_name: itemName,
            is_completed: isCompleted,
            has_allergy: false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'order_id,item_type,item_name'
          }),
        'saveTablewareProgress'
      );

      if (error) throw error;

      // Recalcular el completion_status total y actualizar la orden
      await updateCompletionStatus();
    } catch (error) {
      console.error('Error saving tableware progress:', error);
    }
  };

  const updateCompletionStatus = async () => {
    if (!orderId) return;

    try {
      // Obtener todos los progresos para este pedido
      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;

      // Contar productos completados
      const products = progressData?.filter(p => p.item_type === 'product') || [];
      const completedProducts = products.filter(p => p.is_completed).length;

      // Contar vajilla completada
      const tableware = progressData?.filter(p => p.item_type === 'tableware') || [];
      const completedTableware = tableware.filter(p => p.is_completed).length;

      // Obtener el total de productos del pedido actual
      const totalProducts = products.length;

      // Actualizar en la tabla orders
      await supabase
        .from('orders')
        .update({
          completion_status: {
            products: completedProducts,
            totalProducts: totalProducts,
            tableware: completedTableware,
            totalTableware: tableware.length
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    } catch (error) {
      console.error('Error updating completion status:', error);
    }
  };

  const activeItems = data.tableware_details.filter(item => parseInt(item.quantity) > 0);
  const totalItems = data.tableware_details.reduce((sum, item) => sum + parseInt(item.quantity), 0);
  const completedItems = data.tableware_details.filter(item =>
    parseInt(item.quantity) > 0 && checkedItems[item.item_name]
  ).length;

  const packagingList = Object.entries(productPackaging);
  const totalPackagingTypes = packagingList.length;

  // Agregar todos los packagings y sumar cantidades
  const packagingSummary: Record<string, number> = {};
  packagingList.forEach(([, packagingStr]) => {
    if (packagingStr) {
      // Parse string like "Bandeja (x2), Film transparente (x3)"
      const items = packagingStr.split(',').map(s => s.trim());
      items.forEach(item => {
        const match = item.match(/^(.+?)\s*\(x(\d+)\)$/);
        if (match) {
          const [, name, quantity] = match;
          packagingSummary[name] = (packagingSummary[name] || 0) + parseInt(quantity);
        }
      });
    }
  });

  const packagingSummaryList = Object.entries(packagingSummary).sort((a, b) => a[0].localeCompare(b[0]));
  const totalPackagingUnits = Object.values(packagingSummary).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Utensils className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            Vajilla y Embalaje
          </h3>
          <div className="text-sm text-slate-600">
            <p>{totalItems} artículos en total</p>
            {activeItems.length > 0 && (
              <p className="text-green-600 font-medium">
                {completedItems}/{activeItems.length} completados
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Packaging Seleccionado - Resumen Agrupado */}
      {packagingSummaryList.length > 0 && (
        <div className="mb-3 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-slate-800">Resumen de Packaging</h4>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {totalPackagingUnits} unidades totales
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packagingSummaryList.map(([packagingName, quantity]) => (
              <div
                key={packagingName}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-800 break-words">{packagingName}</span>
                </div>
                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                  {quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.tableware_details.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all ${
              parseInt(item.quantity) > 0
                ? checkedItems[item.item_name]
                  ? 'border-green-300 bg-green-100'
                  : 'border-green-200 bg-green-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {parseInt(item.quantity) > 0 && (
                <button
                  onClick={() => handleCheck(item.item_name)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    checkedItems[item.item_name]
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-slate-300 hover:border-green-400'
                  }`}
                >
                  {checkedItems[item.item_name] && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              )}
              <span className={`font-medium text-xs sm:text-sm break-words ${
                parseInt(item.quantity) > 0
                  ? checkedItems[item.item_name]
                    ? 'text-slate-600 line-through'
                    : 'text-amber-700'
                  : 'text-slate-500'
              }`}>
                {item.item_name}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${
              parseInt(item.quantity) > 0 
                ? checkedItems[item.item_name]
                  ? 'text-green-600'
                  : 'text-green-700'
                : 'text-slate-500'
            }`}>
              <span className="text-sm font-semibold">
                {item.quantity}
              </span>
              {parseInt(item.quantity) > 0 && !checkedItems[item.item_name] && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {activeItems.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Utensils className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No se requiere vajilla para este pedido</p>
        </div>
      )}
      
      {activeItems.length > 0 && completedItems === activeItems.length && (
        <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="font-medium">¡Toda la vajilla está lista!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tableware;