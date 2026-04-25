import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Package, Users, CheckCircle, Clock, Filter, Eye, Utensils, FileDown, Palette } from 'lucide-react';
import { Order } from '../types';
import { supabase } from '../lib/supabase';
import { exportTodaysOrdersToPDF } from '../lib/pdfExport';

interface TodaysOrdersProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

interface ProductSummary {
  productName: string;
  category: string;
  totalQuantity: number;
  packaging: string;
  format?: string;
  size?: string;
  orderDetails: {
    orderId: string;
    orderColor: string;
    companyName: string;
    quantity: number;
    eventDate: string;
    deliveryTime?: string;
  }[];
  isCompleted: boolean;
}

// Paleta de colores para identificar pedidos (debe coincidir con OrdersList)
const ORDER_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'blue': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
  'green': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', dot: 'bg-green-500' },
  'red': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-500' },
  'yellow': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', dot: 'bg-yellow-500' },
};

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Azul', dot: 'bg-blue-500' },
  { value: 'green', label: 'Verde', dot: 'bg-green-500' },
  { value: 'red', label: 'Rojo', dot: 'bg-red-500' },
  { value: 'yellow', label: 'Amarillo', dot: 'bg-yellow-500' },
];

const DEFAULT_COLOR = { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', dot: 'bg-slate-500' };

const TodaysOrders: React.FC<TodaysOrdersProps> = ({ orders, onSelectOrder }) => {
  const [completedProductDetails, setCompletedProductDetails] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [editingColorForOrder, setEditingColorForOrder] = useState<string | null>(null);

  // Cargar progreso de la base de datos
  useEffect(() => {
    loadAllOrdersProgress();
  }, [orders]);

  // Cerrar selector de colores al hacer click fuera
  useEffect(() => {
    if (!editingColorForOrder) return;

    const handleClickOutside = () => {
      setEditingColorForOrder(null);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editingColorForOrder]);

  const loadAllOrdersProgress = async () => {
    const orderIds = orders.map(order => order.id);
    if (orderIds.length === 0) return;

    try {
      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('*')
        .in('order_id', orderIds)
        .eq('item_type', 'product');

      if (error) throw error;

      const completed: Record<string, boolean> = {};
      progressData?.forEach(item => {
        const key = `${item.item_name}-${item.order_id}`;
        completed[key] = item.is_completed;
      });

      setCompletedProductDetails(completed);
    } catch (error) {
      console.error('Error loading orders progress:', error);
    }
  };

  // Función para agregar un color
  const handleAddColor = async (orderId: string, colorToAdd: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const currentColors = order.orderColors || (order.orderColor ? [order.orderColor] : []);
    const updatedColors = [...currentColors, colorToAdd];

    try {
      console.log(`🎨 TodaysOrders: Adding color ${colorToAdd} to order ${orderId}`);
      const { error } = await supabase
        .from('orders')
        .update({
          order_colors: updatedColors,
          order_color: updatedColors.length > 0 ? updatedColors[0] : null
        })
        .eq('id', orderId);

      if (error) throw error;
      console.log('✅ TodaysOrders: Color added - Realtime will sync');
    } catch (error) {
      console.error('❌ Error updating colors:', error);
      alert('Error al actualizar el color');
    }
  };

  // Función para quitar un color
  const handleRemoveColor = async (orderId: string, colorToRemove: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const currentColors = order.orderColors || (order.orderColor ? [order.orderColor] : []);
    const index = currentColors.indexOf(colorToRemove);
    if (index === -1) return;

    const updatedColors = [...currentColors];
    updatedColors.splice(index, 1);

    try {
      console.log(`🎨 TodaysOrders: Removing color ${colorToRemove} from order ${orderId}`);
      const { error } = await supabase
        .from('orders')
        .update({
          order_colors: updatedColors,
          order_color: updatedColors.length > 0 ? updatedColors[0] : null
        })
        .eq('id', orderId);

      if (error) throw error;
      console.log('✅ TodaysOrders: Color removed - Realtime will sync');
    } catch (error) {
      console.error('❌ Error updating colors:', error);
      alert('Error al actualizar el color');
    }
  };

  // Obtener pedidos de hoy
  const todaysOrders = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    
    return orders.filter(order => {
      const eventDate = order.data.order_information.event_date;
      
      // Convertir fecha española a Date object
      const monthMap: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      
      const parts = eventDate.toLowerCase().split(' ');
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const monthName = parts[1];
        const monthIndex = monthMap[monthName];
        
        // Comparar día y mes directamente
        return !isNaN(day) && monthIndex !== undefined && day === todayDay && monthIndex === todayMonth;
      }
      return false;
    });
  }, [orders]);

  // Crear mapa de colores por orderId para usar los colores de la BD
  const orderColorsMap = useMemo(() => {
    const colorMap = new Map<string, { bg: string; border: string; text: string; dot: string }>();
    todaysOrders.forEach(order => {
      if (order.orderColor && ORDER_COLORS[order.orderColor]) {
        colorMap.set(order.id, ORDER_COLORS[order.orderColor]);
      } else {
        colorMap.set(order.id, DEFAULT_COLOR);
      }
    });
    return colorMap;
  }, [todaysOrders]);

  // Crear mapa de arrays de colores por orderId
  const orderColorsArrayMap = useMemo(() => {
    const arrayMap = new Map<string, string[]>();
    todaysOrders.forEach(order => {
      const colors = order.orderColors || (order.orderColor ? [order.orderColor] : []);
      arrayMap.set(order.id, colors);
    });
    return arrayMap;
  }, [todaysOrders]);

  // Agrupar productos por nombre
  const productsSummary = useMemo(() => {
    const productsMap = new Map<string, ProductSummary>();

    todaysOrders.forEach((order) => {
      const orderColor = orderColorsMap.get(order.id) || ORDER_COLORS[0];

      // Obtener horario de entrega
      const activeMeals = Object.entries(order.data.order_information.meal_times)
        .filter(([_, meal]) => meal !== null);
      const deliveryTime = activeMeals.length > 0 ? activeMeals[0][1]?.delivery_time : undefined;

      order.data.product_details.forEach(product => {
        const key = product.product_name;

        if (productsMap.has(key)) {
          const existing = productsMap.get(key)!;
          existing.totalQuantity += parseInt(product.quantity);
          existing.orderDetails.push({
            orderId: order.id,
            orderColor: orderColor.dot,
            companyName: order.data.client_details.company_name,
            quantity: parseInt(product.quantity),
            eventDate: order.data.order_information.event_date,
            deliveryTime
          });
        } else {
          productsMap.set(key, {
            productName: product.product_name,
            category: product.Categoria,
            totalQuantity: parseInt(product.quantity),
            packaging: product.packaging,
            format: product.format || undefined,
            size: product.size || undefined,
            orderDetails: [{
              orderId: order.id,
              orderColor: orderColor.dot,
              companyName: order.data.client_details.company_name,
              quantity: parseInt(product.quantity),
              eventDate: order.data.order_information.event_date,
              deliveryTime
            }],
            isCompleted: false
          });
        }
      });
    });

    // Calcular si el producto está completamente terminado
    const productsArray = Array.from(productsMap.values()).map(product => ({
      ...product,
      isCompleted: product.orderDetails.every(detail =>
        completedProductDetails[`${product.productName}-${detail.orderId}`] || false
      )
    }));

    return productsArray.sort((a, b) => a.category.localeCompare(b.category));
  }, [todaysOrders, completedProductDetails, orderColorsMap]);

  // Filtrar productos según estado
  const filteredProducts = useMemo(() => {
    switch (filterStatus) {
      case 'pending':
        return productsSummary.filter(product => !product.isCompleted);
      case 'completed':
        return productsSummary.filter(product => product.isCompleted);
      default:
        return productsSummary;
    }
  }, [productsSummary, filterStatus]);

  // Agrupar por categoría
  const productsByCategory = useMemo(() => {
    const grouped = filteredProducts.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {} as Record<string, ProductSummary[]>);
    
    return grouped;
  }, [filteredProducts]);

  const handleToggleCompleteDetail = async (productName: string, orderId: string) => {
    const key = `${productName}-${orderId}`;
    const newValue = !completedProductDetails[key];

    setCompletedProductDetails(prev => ({
      ...prev,
      [key]: newValue
    }));

    try {
      const { error } = await supabase
        .from('order_progress')
        .upsert({
          order_id: orderId,
          item_type: 'product',
          item_name: productName,
          is_completed: newValue,
          has_allergy: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'order_id,item_type,item_name'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving product progress:', error);
    }
  };

  const totalProducts = productsSummary.length;
  const completedCount = productsSummary.filter(p => p.isCompleted).length;
  const totalQuantity = productsSummary.reduce((sum, product) => sum + product.totalQuantity, 0);

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    'Wrap bites': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Sandwiches': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Bebida': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'Dessert': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'Bakery': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  if (todaysOrders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">
            No hay pedidos para hoy
          </h3>
          <p className="text-slate-500">
            Los pedidos programados para hoy aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Header compacto y responsive */}
      <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Título y estadísticas */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Pedidos de Hoy</h2>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                <span className="font-medium">{totalProducts}</span>
              </div>
              <div className="flex items-center gap-1">
                <Utensils className="h-3.5 w-3.5" />
                <span className="font-medium">{totalQuantity}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium">{todaysOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Progreso y filtros */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Barra de progreso compacta */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-16 sm:w-24 bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalProducts > 0 ? (completedCount / totalProducts) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{completedCount}/{totalProducts}</span>
            </div>

            {/* Botón Exportar PDF */}
            <button
              onClick={() => exportTodaysOrdersToPDF(todaysOrders)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors shadow-sm"
              title="Exportar a PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Filtros */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Todos ({totalProducts})</option>
              <option value="pending">Pendientes ({totalProducts - completedCount})</option>
              <option value="completed">Completados ({completedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de pedidos inline compacta y responsive */}
      <div className="bg-white rounded-lg shadow-sm p-1.5 sm:p-2">
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {todaysOrders.map((order) => {
            const orderColor = orderColorsMap.get(order.id) || DEFAULT_COLOR;
            const orderColors = order.orderColors || (order.orderColor ? [order.orderColor] : []);
            const activeMeals = Object.entries(order.data.order_information.meal_times)
              .filter(([_, meal]) => meal !== null);

            const isEditingThis = editingColorForOrder === order.id;

            return (
              <div key={order.id} className="relative">
                <div
                  className={`px-2 sm:px-3 py-1.5 rounded border ${orderColor.border} ${orderColor.bg} cursor-pointer hover:shadow-sm transition-all flex items-center gap-2 sm:gap-2.5`}
                  onClick={() => onSelectOrder(order)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingColorForOrder(isEditingThis ? null : order.id);
                    }}
                    className="flex items-center gap-1 flex-shrink-0 hover:opacity-70 transition-opacity"
                    title="Editar colores"
                  >
                    {orderColors.map((color, idx) => {
                      const colorConfig = ORDER_COLORS[color] || DEFAULT_COLOR;
                      return (
                        <div key={idx} className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full shadow-md border-2 border-white ${colorConfig.dot}`}></div>
                      );
                    })}
                    {orderColors.length === 0 && (
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full shadow-md border-2 border-white ${DEFAULT_COLOR.dot}`}></div>
                    )}
                    <Palette className="w-4 h-4 opacity-50" />
                  </button>
                  <span className={`font-semibold text-[10px] sm:text-xs ${orderColor.text} truncate max-w-[100px] sm:max-w-none`}>
                    {order.data.client_details.company_name}
                  </span>
                  <span className={`text-[10px] sm:text-xs ${orderColor.text} opacity-70 whitespace-nowrap flex-shrink-0`}>
                    ({order.data.order_information.number_of_attendees}p)
                    {activeMeals.length > 0 && <span className="hidden sm:inline"> • {activeMeals[0][1]?.delivery_time}</span>}
                  </span>
                </div>

                {/* Selector de colores inline */}
                {isEditingThis && (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border-2 border-slate-200 p-2 z-50 flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {COLOR_OPTIONS.map((color) => {
                      const count = orderColors.filter(c => c === color.value).length;
                      return (
                        <div key={color.value} className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-full ${color.dot} border-2 border-white shadow-sm`} title={color.label}></div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveColor(order.id, color.value);
                              }}
                              disabled={count === 0}
                              className="w-4 h-4 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold"
                            >
                              −
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddColor(order.id, color.value);
                              }}
                              className="w-4 h-4 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Productos agrupados por categoría - Vista compacta en grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {Object.entries(productsByCategory).map(([category, products]) => {
          const categoryStyle = categoryColors[category] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
          const categoryCompleted = products.filter(p => p.isCompleted).length;

          return (
            <div key={category} className="bg-white rounded-lg shadow-sm p-2">
              <div className={`flex items-center justify-between p-1.5 sm:p-2 rounded border ${categoryStyle.border} ${categoryStyle.bg} mb-1.5`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Package className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${categoryStyle.text}`} />
                  <h3 className={`font-semibold text-xs sm:text-sm ${categoryStyle.text}`}>
                    {category}
                  </h3>
                  <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded">
                    {categoryCompleted}/{products.length}
                  </span>
                </div>
                <div className={`text-xs font-medium ${categoryStyle.text}`}>
                  {products.reduce((sum, p) => sum + p.totalQuantity, 0)}u
                </div>
              </div>

              <div className="space-y-1.5">
                {products.map((product) => (
                  <div
                    key={product.productName}
                    className={`p-2 border rounded transition-all ${
                      product.isCompleted
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={async () => {
                          const allCompleted = product.orderDetails.every(detail =>
                            completedProductDetails[`${product.productName}-${detail.orderId}`]
                          );
                          const newValue = !allCompleted;

                          const newCompleted = { ...completedProductDetails };
                          product.orderDetails.forEach(detail => {
                            const key = `${product.productName}-${detail.orderId}`;
                            newCompleted[key] = newValue;
                          });
                          setCompletedProductDetails(newCompleted);

                          try {
                            for (const detail of product.orderDetails) {
                              await supabase
                                .from('order_progress')
                                .upsert({
                                  order_id: detail.orderId,
                                  item_type: 'product',
                                  item_name: product.productName,
                                  is_completed: newValue,
                                  has_allergy: false,
                                  updated_at: new Date().toISOString()
                                }, {
                                  onConflict: 'order_id,item_type,item_name'
                                });
                            }
                          } catch (error) {
                            console.error('Error saving progress:', error);
                          }
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          product.isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 hover:border-green-400'
                        }`}
                      >
                        {product.isCompleted && <CheckCircle className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`font-semibold text-sm ${
                            product.isCompleted ? 'text-slate-600 line-through' : 'text-slate-800'
                          }`}>
                            {product.productName}
                          </h4>
                          <div className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                            product.isCompleted
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {product.totalQuantity}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 text-xs text-slate-600 mb-1.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">{product.packaging}</span>
                          {product.format && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{product.format}</span>}
                          {product.size && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{product.size}</span>}
                        </div>

                        <div className="space-y-0.5">
                          {product.orderDetails.map((detail, index) => {
                            const fullOrderColor = orderColorsMap.get(detail.orderId) || DEFAULT_COLOR;
                            const detailColors = orderColorsArrayMap.get(detail.orderId) || [];
                            const detailKey = `${product.productName}-${detail.orderId}`;
                            const isDetailCompleted = completedProductDetails[detailKey] || false;

                            return (
                              <div key={index} className={`flex items-center gap-3 text-xs p-2 rounded border transition-all ${
                                isDetailCompleted
                                  ? 'bg-green-100 border-green-300'
                                  : `${fullOrderColor.bg} ${fullOrderColor.border}`
                              }`}>
                                <button
                                  onClick={() => handleToggleCompleteDetail(product.productName, detail.orderId)}
                                  className={`w-3 h-3 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                                    isDetailCompleted
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'border-slate-400 hover:border-green-400'
                                  }`}
                                >
                                  {isDetailCompleted && <CheckCircle className="h-2 w-2" />}
                                </button>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {detailColors.map((color, colorIdx) => {
                                    const colorConfig = ORDER_COLORS[color] || DEFAULT_COLOR;
                                    return (
                                      <div key={colorIdx} className={`w-8 h-8 rounded-full shadow-md border-2 border-white ${colorConfig.dot}`}></div>
                                    );
                                  })}
                                  {detailColors.length === 0 && (
                                    <div className={`w-8 h-8 rounded-full shadow-md border-2 border-white ${DEFAULT_COLOR.dot}`}></div>
                                  )}
                                </div>
                                <span className={`font-medium truncate ${
                                  isDetailCompleted
                                    ? 'text-green-800 line-through'
                                    : fullOrderColor.text
                                }`}>
                                  {detail.companyName}
                                </span>
                                <span className={`flex-shrink-0 ${
                                  isDetailCompleted
                                    ? 'text-green-600 line-through'
                                    : 'text-slate-600'
                                }`}>
                                  {detail.quantity}u
                                </span>
                                {detail.deliveryTime && (
                                  <span className={`flex-shrink-0 ${
                                    isDetailCompleted
                                      ? 'text-green-500 line-through'
                                      : 'text-slate-500'
                                  }`}>
                                    {detail.deliveryTime}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodaysOrders;