import React from 'react';
import { ExtractedData, Order } from '../types';
import ClientDetails from './sections/ClientDetails';
import OrderInformation from './sections/OrderInformation';
import Tableware from './sections/Tableware';
import Products from './sections/Products';
import Comments from './Comments';
import { ColorPicker } from './ColorPicker';
import { RotateCcw, Download, Save, Check, User, Package, Bell, Upload, Paperclip, FileText, Palette, Edit2, X } from 'lucide-react';
import { getPDFDownloadUrl, uploadPDF, supabase } from '../lib/supabase';
import { Comment } from '../types';
import { exportCompletePDF } from '../lib/pdfExport';
import { usePageVisibility } from '../hooks/usePageVisibility';
import { usePersistedState } from '../hooks/usePersistedState';

const ORDER_COLORS = [
  { value: 'blue', label: 'Azul', bg: 'bg-blue-100', border: 'border-blue-300', dot: 'bg-blue-500', hex: '#3b82f6' },
  { value: 'green', label: 'Verde', bg: 'bg-green-100', border: 'border-green-300', dot: 'bg-green-500', hex: '#22c55e' },
  { value: 'red', label: 'Rojo', bg: 'bg-red-100', border: 'border-red-300', dot: 'bg-red-500', hex: '#ef4444' },
  { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-100', border: 'border-yellow-300', dot: 'bg-yellow-500', hex: '#eab308' },
];

interface DataVisualizerProps {
  data: ExtractedData;
  onReset: () => void;
  orderId: string | null;
  order?: Order; // Para acceder a los datos del PDF y color
  onUpdateCompletion: (orderId: string, tableware: number, products: number) => void;
  comments: Comment[];
  onAddComment: (orderId: string, text: string) => void;
  onDeleteComment: (orderId: string, commentId: string) => void;
  pdfFile?: File; // Añadir el archivo PDF
  userId?: string; // ID del usuario autenticado
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  onReset,
  orderId,
  order,
  onUpdateCompletion,
  comments,
  onAddComment,
  onDeleteComment,
  pdfFile,
  userId
}) => {
  const [isSaved, setIsSaved] = React.useState(false);
  const [currentData, setCurrentData] = React.useState(data);
  const [activeTab, setActiveTab] = usePersistedState<'cliente' | 'productos'>('visualizer:activeTab', 'cliente');
  const [totalProgress, setTotalProgress] = React.useState(0);
  const [isUploadingPDF, setIsUploadingPDF] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [orderColors, setOrderColors] = React.useState<string[]>(order?.orderColors || (order?.orderColor ? [order.orderColor] : []));
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editingName, setEditingName] = React.useState('');

  // Sincronizar currentData con data del prop (actualizaciones de Realtime)
  React.useEffect(() => {
    const dataString = JSON.stringify(data);
    const currentDataString = JSON.stringify(currentData);

    // Solo actualizar si los datos realmente cambiaron
    if (dataString !== currentDataString) {
      console.log('🔄 Syncing data from props to local state');
      setCurrentData(data);
      setIsSaved(false);
    }
  }, [data]);

  // Sincronizar colores con el order del prop (actualizaciones de Realtime)
  React.useEffect(() => {
    const newColors = order?.orderColors || (order?.orderColor ? [order.orderColor] : []);
    const colorsString = JSON.stringify(newColors);
    const currentColorsString = JSON.stringify(orderColors);

    // Solo actualizar si los colores realmente cambiaron
    if (colorsString !== currentColorsString) {
      console.log('🎨 Syncing colors from order:', newColors);
      setOrderColors(newColors);
    }
  }, [order?.orderColors, order?.orderColor]);


  const progressChannelRef = React.useRef<any>(null);

  const calculateTotalProgress = React.useCallback(async () => {
    if (!orderId) return;

    try {
      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('*')
        .eq('order_id', orderId)
        .eq('item_type', 'product')
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;

      // Contar items completados directamente (cada checkbox que está marcado)
      const completedItems = progressData?.filter(item => item.is_completed).length || 0;

      // El total es el número de items en product_details (todos los que tienen checkbox)
      const totalItems = currentData.product_details.length;

      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      setTotalProgress(progress);
    } catch (error) {
      console.error('Error calculating progress:', error);
      setTotalProgress(0);
    }
  }, [orderId, currentData]);

  React.useEffect(() => {
    if (orderId) {
      calculateTotalProgress();
    }
  }, [orderId, calculateTotalProgress]);

  const setupProgressChannel = React.useCallback(() => {
    if (!orderId) return;

    if (progressChannelRef.current) {
      supabase.removeChannel(progressChannelRef.current);
      progressChannelRef.current = null;
    }

    console.log('Setting up realtime listener for order:', orderId);

    const channel = supabase
      .channel(`order-progress-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_progress',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('Progress changed:', payload);
          calculateTotalProgress();
        }
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });

    progressChannelRef.current = channel;
  }, [orderId, calculateTotalProgress]);

  // Listener para cambios en el progreso
  React.useEffect(() => {
    if (!orderId) return;

    setupProgressChannel();

    return () => {
      console.log('Removing channel:', orderId);
      if (progressChannelRef.current) {
        supabase.removeChannel(progressChannelRef.current);
        progressChannelRef.current = null;
      }
    };
  }, [orderId, setupProgressChannel]);

  // Refresco al volver de pestaña/idle: recalcular progreso y resuscribir.
  usePageVisibility({
    onVisible: React.useCallback(async (timeHidden: number) => {
      if (!orderId || timeHidden <= 3000) return;
      console.log('🔄 Reconnecting realtime for DataVisualizer...');

      try {
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('⚠️ Session refresh failed on wake:', e);
      }

      await calculateTotalProgress();
      setupProgressChannel();
    }, [orderId, calculateTotalProgress, setupProgressChannel])
  });

  const handleSaveState = async () => {
    if (!orderId) return;

    setIsSaved(true);

    try {
      console.log('💾 Saving order data to Supabase...');
      const { error } = await supabase
        .from('orders')
        .update({
          extracted_data: currentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Error saving order data:', error);
        alert('Error al guardar el estado del pedido');
        setIsSaved(false);
        return;
      }

      console.log('✅ Order saved successfully - Realtime will sync across clients');

      // Mantener el estado guardado por 3 segundos
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving order data:', error);
      alert('Error al guardar el estado del pedido');
      setIsSaved(false);
    }
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted-data.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!order?.pdfFilePath) {
      alert('No hay PDF disponible para descargar');
      return;
    }

    try {
      const { url, error } = await getPDFDownloadUrl(order.pdfFilePath);

      if (error || !url) {
        alert('Error al obtener el enlace de descarga del PDF');
        return;
      }

      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = order.pdfOriginalName || 'pedido.pdf';
      link.target = '_blank';
      link.click();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const handleAttachPDF = () => {
    fileInputRef.current?.click();
  };

  const handlePDFFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !orderId || !userId) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setIsUploadingPDF(true);

    try {
      // Subir PDF a Supabase Storage usando la función uploadPDF
      const { path, error: uploadError } = await uploadPDF(file, userId);

      if (uploadError || !path) {
        throw new Error(uploadError || 'Error al subir el archivo');
      }

      // Actualizar el pedido con la información del PDF
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          pdf_file_path: path,
          pdf_file_size: file.size,
          pdf_original_name: file.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      alert('✅ PDF adjuntado correctamente al pedido');

      // Recargar la página o actualizar el estado
      window.location.reload();
    } catch (error: any) {
      console.error('Error attaching PDF:', error);
      alert(`Error al adjuntar el PDF: ${error.message || 'Por favor, inténtalo de nuevo.'}`);
    } finally {
      setIsUploadingPDF(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateClientDetails = (updatedClientDetails: ExtractedData['client_details']) => {
    const updatedData = {
      ...currentData,
      client_details: updatedClientDetails
    };
    setCurrentData(updatedData);
    setIsSaved(false);
  };

  const handleUpdateOrderInformation = (updatedOrderInfo: ExtractedData['order_information']) => {
    const updatedData = {
      ...currentData,
      order_information: updatedOrderInfo
    };
    setCurrentData(updatedData);
    setIsSaved(false);
  };

  const handleUpdateProducts = (updatedProducts: ExtractedData['product_details']) => {
    const updatedData = {
      ...currentData,
      product_details: updatedProducts
    };
    setCurrentData(updatedData);
    setIsSaved(false);
  };

  const isComplete = totalProgress === 100;

  // Obtener horarios de las comidas activas
  const activeMeals = Object.entries(currentData.order_information.meal_times).filter(([_, meal]) => meal !== null);

  const formatEventDate = (dateString: string) => {
    const currentYear = new Date().getFullYear();
    const monthMap: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    const parts = dateString.toLowerCase().split(' ');
    if (parts.length >= 2) {
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const monthIndex = monthMap[monthName];

      if (!isNaN(day) && monthIndex !== undefined) {
        const date = new Date(currentYear, monthIndex, day);
        return date.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        });
      }
    }
    return dateString;
  };

  const handleExportCompletePDF = () => {
    if (!order) {
      alert('No hay datos del pedido disponibles');
      return;
    }
    exportCompletePDF(order);
  };

  const handleColorToggle = async (color: string) => {
    if (!orderId) return;

    try {
      console.log(`🎨 DataVisualizer: Adding color ${color} to order ${orderId}`);
      // Siempre agregar el color (permitir duplicados)
      const newColors = [...orderColors, color];

      const { error } = await supabase
        .from('orders')
        .update({
          order_colors: newColors.length > 0 ? newColors : null,
          order_color: newColors.length > 0 ? newColors[0] : null
        })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ DataVisualizer: Color added to DB - Waiting for Realtime sync');
      // NO actualizar el estado local - dejar que Realtime lo haga
    } catch (error) {
      console.error('❌ Error updating order colors:', error);
      alert('Error al actualizar los colores del pedido');
    }
  };

  const handleColorRemove = async (color: string) => {
    if (!orderId) return;

    try {
      console.log(`🎨 DataVisualizer: Removing color ${color} from order ${orderId}`);
      // Quitar solo UNA ocurrencia del color
      const colorIndex = orderColors.indexOf(color);
      if (colorIndex === -1) return;

      const newColors = [...orderColors];
      newColors.splice(colorIndex, 1);

      const { error } = await supabase
        .from('orders')
        .update({
          order_colors: newColors.length > 0 ? newColors : null,
          order_color: newColors.length > 0 ? newColors[0] : null
        })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ DataVisualizer: Color removed from DB - Waiting for Realtime sync');
      // NO actualizar el estado local - dejar que Realtime lo haga
    } catch (error) {
      console.error('❌ Error updating order colors:', error);
      alert('Error al actualizar los colores del pedido');
    }
  };

  const handleRemoveAllColors = async () => {
    if (!orderId) return;

    try {
      console.log(`🎨 DataVisualizer: Removing all colors from order ${orderId}`);
      const { error } = await supabase
        .from('orders')
        .update({ order_colors: null, order_color: null })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ DataVisualizer: All colors removed from DB - Waiting for Realtime sync');
      setShowColorPicker(false);
      // NO actualizar el estado local - dejar que Realtime lo haga
    } catch (error) {
      console.error('❌ Error removing order colors:', error);
      alert('Error al eliminar los colores del pedido');
    }
  };

  const handleStartEditingName = () => {
    setIsEditingName(true);
    setEditingName(order?.orderName || currentData.client_details.company_name);
  };

  const handleSaveOrderName = async () => {
    if (!orderId) return;

    try {
      console.log(`📝 DataVisualizer: Updating order name to "${editingName}"`);
      const { error } = await supabase
        .from('orders')
        .update({ order_name: editingName || null })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ DataVisualizer: Order name updated - Waiting for Realtime sync');
      setIsEditingName(false);
    } catch (error) {
      console.error('❌ Error updating order name:', error);
      alert('Error al actualizar el nombre del pedido');
    }
  };

  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const getOrderColorClasses = () => {
    if (orderColors.length === 0) return { bg: 'bg-orange-500', border: '' };

    const colorConfig = ORDER_COLORS.find(c => c.value === orderColors[0]);
    if (!colorConfig) return { bg: 'bg-orange-500', border: '' };

    return {
      bg: colorConfig.dot.replace('bg-', 'bg-gradient-to-r from-') + ` to-${colorConfig.value}-600`,
      border: colorConfig.border
    };
  };

  const colorClasses = getOrderColorClasses();

  return (
    <div className="w-full space-y-2 sm:space-y-3">
      {/* Banner Pendiente de Terminar - Siempre visible arriba */}
      <div className={`text-white rounded-lg p-3 shadow-md transition-all duration-500 ${
        isComplete
          ? 'bg-gradient-to-r from-green-500 to-green-600'
          : 'bg-gradient-to-r from-orange-500 to-orange-600'
      }`}>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bell className="h-5 w-5" />
            <span className="text-sm font-bold uppercase">
              {isComplete ? 'Listo para Servir' : 'Pendiente de Terminar'}
            </span>
          </div>

          {activeMeals.length > 0 ? (
            <div className="bg-black/20 rounded-lg p-2.5">
              {/* Horas de preparación */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                {activeMeals.map(([mealType, meal], idx) => (
                  <React.Fragment key={mealType}>
                    <div className="text-2xl sm:text-3xl font-bold">
                      {meal!.preparation_time}
                    </div>
                    {idx < activeMeals.length - 1 && (
                      <span className="text-xl font-bold opacity-50">•</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Fecha */}
              <div className="text-sm font-medium text-yellow-200 mb-2">
                {formatEventDate(currentData.order_information.event_date)}
              </div>

              {/* Info adicional: Entrega y Comensales */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="text-xs font-semibold bg-white/20 rounded px-2 py-1">
                  Entrega: {activeMeals.map(([_, meal]) => meal!.delivery_time).join(', ')}
                </div>
                {currentData.order_information.number_of_attendees && (
                  <div className="text-xs font-semibold bg-white/20 rounded px-2 py-1">
                    Comensales: {currentData.order_information.number_of_attendees}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black/20 rounded-lg p-2.5">
              <div className="text-lg sm:text-xl font-bold opacity-75 mb-1">
                NO PROGRAMADO
              </div>
              <div className="text-sm font-medium opacity-75 text-yellow-200 mb-2">
                {formatEventDate(currentData.order_information.event_date)}
              </div>
              {currentData.order_information.number_of_attendees && (
                <div className="text-xs font-semibold bg-white/20 rounded px-2 py-1 inline-block">
                  Comensales: {currentData.order_information.number_of_attendees}
                </div>
              )}
            </div>
          )}

          <div className="bg-black/30 rounded-lg p-2 mt-2">
            <div className="text-lg sm:text-xl font-bold">
              {totalProgress}% Completado
            </div>
          </div>
        </div>
      </div>

      {/* Header con acciones */}
      <div className="rounded-xl shadow-sm p-2.5 sm:p-3 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-slate-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveOrderName();
                        } else if (e.key === 'Escape') {
                          handleCancelEditingName();
                        }
                      }}
                      className="flex-1 px-3 py-2 text-base sm:text-lg font-bold border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50"
                      placeholder="Nombre del pedido"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveOrderName}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      <Check className="h-4 w-4" />
                      Guardar cambios
                    </button>
                    <button
                      onClick={handleCancelEditingName}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate flex-1">
                    {order?.orderName || currentData.client_details.company_name}
                  </h2>
                  <button
                    onClick={handleStartEditingName}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0 border border-slate-300 hover:border-blue-400"
                    title="Editar nombre del pedido"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {orderColors.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {orderColors.map((color, idx) => {
                        const colorConfig = ORDER_COLORS.find(c => c.value === color);
                        return (
                          <div key={idx} className={`w-6 h-6 rounded-full shadow-md border-2 border-white ${
                            colorConfig?.dot || 'bg-slate-500'
                          }`} title={colorConfig?.label} />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs sm:text-sm text-slate-600">
                Datos procesados exitosamente con LlamaIndex
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {orderId && (
              <>
                <ColorPicker
                  orderId={orderId}
                  currentColors={orderColors}
                  onUpdateColors={async (newColors) => {
                    try {
                      const { error } = await supabase
                        .from('orders')
                        .update({
                          order_colors: newColors,
                          order_color: newColors.length > 0 ? newColors[0] : null
                        })
                        .eq('id', orderId);

                      if (error) throw error;
                      setOrderColors(newColors);
                    } catch (error) {
                      console.error('Error updating colors:', error);
                    }
                  }}
                />

                <button
                  onClick={handleSaveState}
                  disabled={isSaved}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium ${
                    isSaved
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
                {order?.pdfFilePath ? (
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                    title="Descargar PDF original"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </button>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handlePDFFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={handleAttachPDF}
                      disabled={isUploadingPDF}
                      className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors text-xs sm:text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      title="Adjuntar PDF al pedido"
                    >
                      {isUploadingPDF ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="h-4 w-4" />
                          <span>Adjuntar PDF</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </button>
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs sm:text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sistema de Pestañas */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('cliente')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'cliente'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Cliente e Información</span>
          </button>
          <button
            onClick={() => setActiveTab('productos')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'productos'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Productos y Vajilla</span>
          </button>
        </div>

        {/* Tabs Content */}
        <div className="p-3 sm:p-4">
          {activeTab === 'cliente' && (
            <div className="space-y-3">
              {orderId && (
                <div className="flex justify-end">
                  <button
                    onClick={handleExportCompletePDF}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Exportar Pedido Completo a PDF</span>
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <ClientDetails
                  data={currentData.client_details}
                  onUpdate={handleUpdateClientDetails}
                />
                <OrderInformation
                  data={currentData.order_information}
                  onUpdate={handleUpdateOrderInformation}
                />
              </div>
            </div>
          )}

          {activeTab === 'productos' && (
            <div className="space-y-3">
              {orderId && (
                <div className="flex justify-end">
                  <button
                    onClick={handleExportCompletePDF}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Exportar Pedido Completo a PDF</span>
                  </button>
                </div>
              )}
              <div className="w-full">
                <Products
                  data={currentData.product_details}
                  orderId={orderId}
                  onUpdateCompletion={(_, products) => orderId && onUpdateCompletion(orderId, 0, products)}
                  onUpdateProducts={handleUpdateProducts}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sección de comentarios - Siempre visible abajo */}
      {orderId && (
        <Comments
          orderId={orderId}
          comments={comments}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </div>
  );
};

export default DataVisualizer;