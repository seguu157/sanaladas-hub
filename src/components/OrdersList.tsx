import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Order } from '../types';
import { FileText, Calendar, Users, Trash2, CheckCircle, Clock, Eye, Download, Palette, Edit2, Check, X } from 'lucide-react';
import { getPDFDownloadUrl, supabase } from '../lib/supabase';
import { usePageVisibility } from '../hooks/usePageVisibility';

const ORDER_COLORS = [
  { value: 'blue', label: 'Azul', bg: 'bg-blue-100', border: 'border-blue-300', dot: 'bg-blue-500' },
  { value: 'green', label: 'Verde', bg: 'bg-green-100', border: 'border-green-300', dot: 'bg-green-500' },
  { value: 'red', label: 'Rojo', bg: 'bg-red-100', border: 'border-red-300', dot: 'bg-red-500' },
  { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-100', border: 'border-yellow-300', dot: 'bg-yellow-500' },
];

interface OrdersListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onRefreshOrders?: () => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onSelectOrder, onDeleteOrder, onRefreshOrders }) => {
  const [orderProgress, setOrderProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [orderColors, setOrderColors] = useState<Record<string, string[]>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderName, setEditingOrderName] = useState<string>('');
  const progressChannelRef = useRef<any>(null);
  const ordersChannelRef = useRef<any>(null);

  // Cargar colores de pedidos desde el prop orders (actualizado por Realtime)
  useEffect(() => {
    console.log('🎨 OrdersList: Syncing colors from orders prop');
    const colors: Record<string, string[]> = {};
    orders.forEach(order => {
      if (order.orderColors && order.orderColors.length > 0) {
        colors[order.id] = order.orderColors;
      } else if (order.orderColor) {
        colors[order.id] = [order.orderColor];
      }
    });

    console.log('✅ OrdersList: Colors updated from props', colors);
    setOrderColors(colors);
  }, [orders]);

  // Cerrar selector de color cuando se hace clic fuera
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = () => {
      setShowColorPicker(null);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showColorPicker]);

  // Cargar progreso de todos los pedidos
  useEffect(() => {
    loadAllOrdersProgress();
  }, [orders]);

  // Suscripción en tiempo real para cambios en order_progress
  useEffect(() => {
    const channel = supabase
      .channel('orders-progress-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_progress'
        },
        (payload) => {
          console.log('Order progress changed:', payload);
          loadAllOrdersProgress();
        }
      )
      .subscribe();

    progressChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Suscripción para cambios en la tabla orders (cuando se actualiza completion_status)
  useEffect(() => {
    const channel = supabase
      .channel('orders-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order updated:', payload);

          // Actualizar el estado local de colores inmediatamente
          if (payload.new && payload.new.id) {
            const newColors = payload.new.order_colors || [];
            setOrderColors(prev => ({
              ...prev,
              [payload.new.id]: newColors
            }));
            console.log('🔄 Order colors updated in local state:', { orderId: payload.new.id, colors: newColors });
          }

          // Forzar recarga del componente padre
          loadAllOrdersProgress();
        }
      )
      .subscribe();

    ordersChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAllOrdersProgress = async () => {
    try {
      const orderIds = orders.map(o => o.id);
      if (orderIds.length === 0) return;

      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('order_id, is_completed, item_type')
        .in('order_id', orderIds);

      if (error) throw error;

      const progressMap: Record<string, { completed: number; total: number }> = {};

      orderIds.forEach(orderId => {
        // Solo contar productos para el porcentaje de completado
        const productItems = progressData?.filter(p => p.order_id === orderId && p.item_type === 'product') || [];
        const completedProducts = productItems.filter(p => p.is_completed).length;

        progressMap[orderId] = {
          completed: completedProducts,
          total: productItems.length
        };
      });

      setOrderProgress(progressMap);
    } catch (error) {
      console.error('Error loading orders progress:', error);
    }
  };
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCompletionPercentage = (order: Order) => {
    // Usar datos de tiempo real de order_progress
    const progress = orderProgress[order.id];
    if (progress) {
      if (progress.total === 0) return 0;
      return Math.round((progress.completed / progress.total) * 100);
    }

    // Fallback a completion_status de la orden (solo productos)
    const total = order.completionStatus?.totalProducts || 0;
    const completed = order.completionStatus?.products || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600 bg-green-100';
    if (percentage > 50) return 'text-orange-600 bg-orange-100';
    return 'text-slate-600 bg-slate-100';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };


  const handleDownloadPDF = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();

    if (!order.pdfFilePath) {
      alert('No hay PDF disponible para este pedido');
      return;
    }

    try {
      const { url, error } = await getPDFDownloadUrl(order.pdfFilePath);

      if (error || !url) {
        alert('Error al obtener el enlace de descarga del PDF');
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = order.pdfOriginalName || order.fileName;
      link.target = '_blank';
      link.click();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const handleColorAdd = async (orderId: string, color: string) => {
    try {
      const currentColors = orderColors[orderId] || [];
      const newColors = [...currentColors, color];

      console.log(`🎨 OrdersList: Adding color ${color} to order ${orderId}`, { currentColors, newColors });
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_colors: newColors.length > 0 ? newColors : null,
          order_color: newColors.length > 0 ? newColors[0] : null
        })
        .eq('id', orderId)
        .select();

      if (error) throw error;

      console.log('✅ OrdersList: Color added to DB - Realtime will sync', data);
    } catch (error) {
      console.error('❌ Error updating order color:', error);
      alert('Error al actualizar el color del pedido');
    }
  };

  const handleColorRemove = async (orderId: string, color: string) => {
    try {
      const currentColors = orderColors[orderId] || [];
      const colorIndex = currentColors.indexOf(color);
      if (colorIndex === -1) {
        console.log(`⚠️ Color ${color} not found in order ${orderId}`);
        return;
      }

      const newColors = [...currentColors];
      newColors.splice(colorIndex, 1);

      console.log(`🎨 OrdersList: Removing color ${color} from order ${orderId}`, { currentColors, newColors });
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_colors: newColors.length > 0 ? newColors : null,
          order_color: newColors.length > 0 ? newColors[0] : null
        })
        .eq('id', orderId)
        .select();

      if (error) throw error;

      console.log('✅ OrdersList: Color removed from DB - Realtime will sync', data);
    } catch (error) {
      console.error('❌ Error updating order color:', error);
      alert('Error al actualizar el color del pedido');
    }
  };

  const handleRemoveAllColors = async (orderId: string) => {
    try {
      console.log(`🎨 OrdersList: Removing all colors from order ${orderId}`);
      const { error } = await supabase
        .from('orders')
        .update({ order_colors: null, order_color: null })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ OrdersList: All colors removed from DB - Realtime will sync');
      setShowColorPicker(null);
    } catch (error) {
      console.error('❌ Error removing order colors:', error);
      alert('Error al eliminar los colores del pedido');
    }
  };

  const handleSaveOrderName = async (orderId: string, newName: string) => {
    try {
      console.log(`📝 OrdersList: Updating order name to "${newName}"`);
      const { error } = await supabase
        .from('orders')
        .update({ order_name: newName || null })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ OrdersList: Order name updated - Waiting for Realtime sync');
      setEditingOrderId(null);
      setEditingOrderName('');
    } catch (error) {
      console.error('❌ Error updating order name:', error);
      alert('Error al actualizar el nombre del pedido');
    }
  };

  const handleStartEditingName = (order: Order) => {
    setEditingOrderId(order.id);
    setEditingOrderName(order.orderName || order.data.client_details.company_name);
  };

  const handleCancelEditingName = () => {
    setEditingOrderId(null);
    setEditingOrderName('');
  };

  const getOrderColorClasses = (orderId: string) => {
    const colors = orderColors[orderId];
    if (!colors || colors.length === 0) return { bg: 'bg-white', border: 'border-slate-200' };

    // Usar el primer color para el fondo
    const colorConfig = ORDER_COLORS.find(c => c.value === colors[0]);
    return colorConfig ? { bg: colorConfig.bg, border: colorConfig.border } : { bg: 'bg-white', border: 'border-slate-200' };
  };

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting realtime for OrdersList...');

        if (progressChannelRef.current) {
          supabase.removeChannel(progressChannelRef.current);
          progressChannelRef.current = null;
        }

        if (ordersChannelRef.current) {
          supabase.removeChannel(ordersChannelRef.current);
          ordersChannelRef.current = null;
        }

        loadAllOrdersProgress();
        if (onRefreshOrders) {
          onRefreshOrders();
        }
      }
    }, [onRefreshOrders, loadAllOrdersProgress])
  });

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">
            No hay pedidos guardados
          </h3>
          <p className="text-slate-500 mb-3">
            Los PDFs que proceses aparecerán aquí para que puedas revisarlos más tarde
          </p>
          <button
            onClick={() => {}}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Subir primer PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {orders.map((order) => {
          const completionPercentage = getCompletionPercentage(order);
          const statusColor = getStatusColor(completionPercentage);
          const colorClasses = getOrderColorClasses(order.id);
          const hasColors = orderColors[order.id] && orderColors[order.id].length > 0;
          const currentColors = orderColors[order.id] || [];

          return (
            <div
              key={order.id}
              className={`rounded-xl shadow-sm border-2 hover:shadow-lg transition-all duration-200 w-full ${colorClasses.bg} ${colorClasses.border} flex flex-col h-full`}
            >
              <div className="p-3 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingOrderId === order.id ? (
                        <div className="flex items-center gap-0.5">
                          <input
                            type="text"
                            value={editingOrderName}
                            onChange={(e) => setEditingOrderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveOrderName(order.id, editingOrderName);
                              } else if (e.key === 'Escape') {
                                handleCancelEditingName();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-1.5 py-0.5 text-xs font-semibold border-2 border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveOrderName(order.id, editingOrderName);
                            }}
                            className="p-0.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Guardar"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditingName();
                            }}
                            className="p-0.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <h3 className="font-semibold text-sm text-slate-800 truncate">
                            {order.orderName || order.data.client_details.company_name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditingName(order);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all flex-shrink-0"
                            title="Editar nombre"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 truncate">
                        {formatDate(order.uploadDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-0.5 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColorPicker(showColorPicker === order.id ? null : order.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors relative ${hasColors ? `${colorClasses.bg} text-slate-700` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        title="Asignar colores"
                      >
                        <Palette className="h-3.5 w-3.5" />
                        {hasColors && currentColors.length > 1 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {currentColors.length}
                          </span>
                        )}
                      </button>

                      {showColorPicker === order.id && (
                        <>
                          <div
                            className="fixed inset-0 bg-black bg-opacity-50"
                            style={{ zIndex: 9998 }}
                            onClick={() => setShowColorPicker(null)}
                          />
                          <div
                            className="fixed bg-white rounded-lg shadow-xl border-2 border-slate-200 p-3 w-72"
                            style={{
                              zIndex: 9999,
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-slate-700">Seleccionar colores</div>
                              <button
                                onClick={() => setShowColorPicker(null)}
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                                title="Cerrar"
                              >
                                <X className="h-4 w-4 text-slate-500" />
                              </button>
                            </div>
                          <div className="space-y-2 mb-3">
                            {ORDER_COLORS.map((color) => {
                              const count = currentColors.filter(c => c === color.value).length;
                              return (
                                <div key={color.value} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                  <div className={`w-8 h-8 rounded-full shadow-md border-2 border-white ${color.dot} flex-shrink-0`} />
                                  <span className="text-sm font-medium text-slate-700 flex-1">{color.label}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('🔘 Remove button clicked', { orderId: order.id, color: color.value });
                                        handleColorRemove(order.id, color.value);
                                      }}
                                      disabled={count === 0}
                                      className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors"
                                      title="Quitar uno"
                                    >
                                      −
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-slate-700">
                                      {count}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('🔘 Add button clicked', { orderId: order.id, color: color.value });
                                        handleColorAdd(order.id, color.value);
                                      }}
                                      className="w-6 h-6 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold text-sm transition-colors"
                                      title="Agregar uno"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {hasColors && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAllColors(order.id);
                              }}
                              className="w-full text-xs text-red-600 hover:bg-red-50 py-1.5 rounded transition-colors font-medium"
                            >
                              Limpiar todos los colores
                            </button>
                          )}
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de que quieres eliminar el pedido de "${order.data?.client_details?.company_name || order.fileName}"?`)) {
                          onDeleteOrder(order.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{order.data?.order_information?.event_date || 'Fecha no disponible'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{order.data?.order_information?.number_of_attendees || '0'} personas</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-medium truncate">{order.data?.client_details?.company_name || 'Cliente no disponible'}</span>
                  </div>

                  {/* Colores asignados */}
                  {hasColors && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentColors.map((color, idx) => {
                        const colorConfig = ORDER_COLORS.find(c => c.value === color);
                        return (
                          <div
                            key={idx}
                            className={`w-6 h-6 rounded-full shadow-md border-2 border-white ${colorConfig?.dot || 'bg-slate-500'}`}
                            title={colorConfig?.label}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-700">Progreso</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                      {getStatusIcon(completionPercentage)}
                      {completionPercentage}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        completionPercentage === 100 ? 'bg-green-500' : 
                        completionPercentage > 50 ? 'bg-orange-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Vajilla: {order.completionStatus.tableware}/{order.completionStatus.totalTableware}</span>
                    <span>Productos: {order.completionStatus.products}/{order.completionStatus.totalProducts}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={() => onSelectOrder(order)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Pedido</span>
                  </button>

                  {order.pdfFilePath && (
                    <button
                      onClick={(e) => handleDownloadPDF(e, order)}
                      className="px-2.5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      title="Descargar PDF original"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersList;