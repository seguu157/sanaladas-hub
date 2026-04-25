import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingBag, Package, Tag, Check, Layers, AlertTriangle, Edit2, X, Save, Edit } from 'lucide-react';
import { ExtractedData } from '../../types';
import ProductPackagingModal from '../ProductPackagingModal';
import ProductEditModal from '../ProductEditModal';
import { supabase } from '../../lib/supabase';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { withHangGuard } from '../../lib/supabaseHangGuard';

interface ProductsProps {
  data: ExtractedData['product_details'];
  orderId?: string | null;
  onUpdateCompletion?: (tableware: number, products: number) => void;
  onUpdateProducts?: (products: ExtractedData['product_details']) => void;
}

// Color palette for auto-assigning to new categories
const COLOR_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
];

interface CategoryColor {
  bg: string;
  text: string;
  border: string;
}

const Products: React.FC<ProductsProps> = ({ data, orderId, onUpdateCompletion, onUpdateProducts }) => {
  const [checkedProducts, setCheckedProducts] = useState<Record<string, boolean>>({});
  const [allergyProducts, setAllergyProducts] = useState<Record<string, boolean>>({});
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productPackaging, setProductPackaging] = useState<Record<string, string>>({});
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editSize, setEditSize] = useState('');
  const [localProducts, setLocalProducts] = useState(data);
  const [categoryColors, setCategoryColors] = useState<Record<string, CategoryColor>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const categoriesChannelRef = useRef<any>(null);
  const progressChannelRef = useRef<any>(null);
  const packagingChannelRef = useRef<any>(null);

  // Sincronizar localProducts cuando data cambia
  useEffect(() => {
    setLocalProducts(data);
  }, [data]);

  const loadCategories = useCallback(async () => {
    try {
      const { data: categories, error } = await supabase
        .from('product_categories')
        .select('*')
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;

      // Si la query devuelve vacío (RLS / sesión que se está refrescando /
      // race condition tras wake) NO sobreescribimos el state — preferimos
      // mantener los colores antiguos a borrarlos y dejar todo gris.
      if (!categories || categories.length === 0) {
        console.warn('loadCategories: 0 filas, manteniendo colores actuales');
        return;
      }

      const colorMap: Record<string, CategoryColor> = {};
      categories.forEach(cat => {
        colorMap[cat.name] = {
          bg: cat.bg_color,
          text: cat.text_color,
          border: cat.border_color
        };
      });

      console.log('Loaded categories from DB:', Object.keys(colorMap));
      setCategoryColors(colorMap);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const setupCategoriesChannel = useCallback(() => {
    if (categoriesChannelRef.current) {
      supabase.removeChannel(categoriesChannelRef.current);
      categoriesChannelRef.current = null;
    }
    const channel = supabase
      .channel('product_categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_categories'
        },
        async () => {
          await loadCategories();
        }
      )
      .subscribe();
    categoriesChannelRef.current = channel;
  }, [loadCategories]);

  // Cargar categorías desde la base de datos y verificar las faltantes
  useEffect(() => {
    const initializeCategories = async () => {
      await loadCategories();
      if (localProducts.length > 0) {
        await ensureAllCategoriesExist();
      }
    };

    initializeCategories();
    setupCategoriesChannel();

    return () => {
      if (categoriesChannelRef.current) {
        supabase.removeChannel(categoriesChannelRef.current);
        categoriesChannelRef.current = null;
      }
    };
  }, [localProducts, loadCategories, setupCategoriesChannel]);

  const ensureAllCategoriesExist = async () => {
    try {
      // Obtener todas las categorías únicas de los productos
      const productCategories = [...new Set(localProducts.map(p => p.Categoria))];
      console.log('Product categories found:', productCategories);

      // Verificar cuáles no existen en el estado
      const missingCategories = productCategories.filter(cat => !categoryColors[cat]);
      console.log('Missing categories in state:', missingCategories);

      if (missingCategories.length === 0) return;

      // Obtener categorías existentes en DB
      const { data: existingCategories, error: fetchError } = await supabase
        .from('product_categories')
        .select('name')
        .in('name', missingCategories);

      if (fetchError) throw fetchError;

      const existingNames = new Set(existingCategories?.map(c => c.name) || []);
      const categoriesToCreate = missingCategories.filter(cat => !existingNames.has(cat));
      console.log('Categories to create in DB:', categoriesToCreate);

      if (categoriesToCreate.length > 0) {
        // Crear nuevas categorías con colores del paleta
        const newCategories = categoriesToCreate.map((cat, index) => {
          const colorIndex = index % COLOR_PALETTE.length;
          const colors = COLOR_PALETTE[colorIndex];
          return {
            name: cat,
            bg_color: colors.bg,
            text_color: colors.text,
            border_color: colors.border
          };
        });

        console.log('Creating categories:', newCategories);
        const { error: insertError } = await supabase
          .from('product_categories')
          .insert(newCategories);

        if (insertError) throw insertError;
        console.log('Categories created successfully');
      }

      // Recargar todas las categorías
      await loadCategories();
    } catch (error) {
      console.error('Error ensuring categories exist:', error);
    }
  };

  const setupOrderChannels = useCallback(() => {
    if (!orderId) return;

    if (progressChannelRef.current) {
      supabase.removeChannel(progressChannelRef.current);
      progressChannelRef.current = null;
    }
    if (packagingChannelRef.current) {
      supabase.removeChannel(packagingChannelRef.current);
      packagingChannelRef.current = null;
    }

    const progressChannel = supabase
      .channel(`order_progress_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_progress',
          filter: `order_id=eq.${orderId}`
        },
        async () => {
          await loadOrderProgress();
        }
      )
      .subscribe();
    progressChannelRef.current = progressChannel;

    const packagingChannel = supabase
      .channel(`order_packaging_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_packaging',
          filter: `order_id=eq.${orderId}`
        },
        async () => {
          await loadOrderPackaging();
        }
      )
      .subscribe();
    packagingChannelRef.current = packagingChannel;
  }, [orderId]);

  // Cargar estado desde DB e inicializar progreso
  useEffect(() => {
    if (orderId) {
      initializeOrderProgress();
      loadOrderProgress();
      loadOrderPackaging();
      setupOrderChannels();

      return () => {
        if (progressChannelRef.current) {
          supabase.removeChannel(progressChannelRef.current);
          progressChannelRef.current = null;
        }
        if (packagingChannelRef.current) {
          supabase.removeChannel(packagingChannelRef.current);
          packagingChannelRef.current = null;
        }
      };
    }
  }, [orderId, setupOrderChannels]);

  // Refresco al volver de pestaña/idle: re-cargar categorías, progreso,
  // packaging y resuscribir todos los canales realtime.
  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (timeHidden <= 3000) return;
      console.log('🔄 Reconnecting realtime for Products section...');

      try {
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('⚠️ Session refresh failed on wake:', e);
      }

      await loadCategories();
      setupCategoriesChannel();

      if (orderId) {
        await Promise.all([loadOrderProgress(), loadOrderPackaging()]);
        setupOrderChannels();
      }
    }, [orderId, loadCategories, setupCategoriesChannel, setupOrderChannels])
  });

  const initializeOrderProgress = async () => {
    if (!orderId) return;

    try {
      // Verificar qu\u00e9 productos ya existen en order_progress
      const { data: existingProgress, error: fetchError } = await supabase
        .from('order_progress')
        .select('item_name')
        .eq('order_id', orderId)
        .eq('item_type', 'product');

      if (fetchError) throw fetchError;

      const existingProductNames = new Set(existingProgress?.map(p => p.item_name) || []);

      // Crear registros para productos que no existen aún
      const newProducts = data.filter(p => !existingProductNames.has(p.product_name));

      if (newProducts.length > 0) {
        const progressRecords = newProducts.map(product => ({
          order_id: orderId,
          item_type: 'product',
          item_name: product.product_name,
          is_completed: false,
          has_allergy: false
        }));

        const { error: insertError } = await supabase
          .from('order_progress')
          .insert(progressRecords);

        if (insertError) throw insertError;

        // Actualizar completion_status despu\u00e9s de inicializar
        await updateCompletionStatus();
      }
    } catch (error) {
      console.error('Error initializing order progress:', error);
    }
  };

  const loadOrderProgress = async () => {
    if (!orderId) return;

    try {
      const { data: progressData, error } = await supabase
        .from('order_progress')
        .select('*')
        .eq('order_id', orderId)
        .eq('item_type', 'product')
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;

      const checked: Record<string, boolean> = {};
      const allergies: Record<string, boolean> = {};

      progressData?.forEach(item => {
        checked[item.item_name] = item.is_completed;
        allergies[item.item_name] = item.has_allergy;
      });

      setCheckedProducts(checked);
      setAllergyProducts(allergies);
    } catch (error) {
      console.error('Error loading order progress:', error);
    }
  };

  const loadOrderPackaging = async () => {
    if (!orderId) return;

    try {
      const { data: packagingData, error } = await supabase
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

      if (packagingData) {
        const grouped = packagingData.reduce((acc, item) => {
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
  };

  // Actualizar progreso cuando cambian los checkboxes
  useEffect(() => {
    if (onUpdateCompletion && orderId) {
      const completedProducts = data.filter(product => checkedProducts[product.product_name]).length;
      onUpdateCompletion(0, completedProducts);
    }
  }, [checkedProducts, orderId, onUpdateCompletion, data]);

  const handleCheck = async (productName: string) => {
    const newValue = !checkedProducts[productName];
    setCheckedProducts(prev => ({
      ...prev,
      [productName]: newValue
    }));

    if (orderId) {
      await saveProductProgress(productName, newValue, allergyProducts[productName] || false);
    }
  };

  const handleToggleAllergy = async (productName: string) => {
    const newValue = !allergyProducts[productName];
    setAllergyProducts(prev => ({
      ...prev,
      [productName]: newValue
    }));

    if (orderId) {
      await saveProductProgress(productName, checkedProducts[productName] || false, newValue);
    }
  };

  const saveProductProgress = async (productName: string, isCompleted: boolean, hasAllergy: boolean) => {
    if (!orderId) return;

    try {
      // Guardar en order_progress
      const { error } = await withHangGuard(
        supabase
          .from('order_progress')
          .upsert({
            order_id: orderId,
            item_type: 'product',
            item_name: productName,
            is_completed: isCompleted,
            has_allergy: hasAllergy,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'order_id,item_type,item_name'
          }),
        'saveProductProgress'
      );

      if (error) throw error;

      // Recalcular el completion_status total y actualizar la orden
      await updateCompletionStatus();
    } catch (error) {
      console.error('Error saving product progress:', error);
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

      // Actualizar en la tabla orders
      await supabase
        .from('orders')
        .update({
          completion_status: {
            products: completedProducts,
            totalProducts: products.length,
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

  const handleSaveProducts = async (updatedProducts: ExtractedData['product_details']) => {
    if (!orderId) return;

    try {
      // Primero obtener el extracted_data actual
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('extracted_data')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Actualizar en la base de datos
      const { error } = await supabase
        .from('orders')
        .update({
          extracted_data: {
            ...orderData.extracted_data,
            product_details: updatedProducts
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Actualizar estado local
      setLocalProducts(updatedProducts);
      if (onUpdateProducts) {
        onUpdateProducts(updatedProducts);
      }

      // Reinicializar el progreso con los nuevos productos
      await initializeOrderProgress();
    } catch (error) {
      console.error('Error saving products:', error);
      alert('Error al guardar los productos');
    }
  };

  const handleSaveCategory = async (oldCategoryName: string, newCategoryName: string) => {
    if (!newCategoryName.trim() || oldCategoryName === newCategoryName) {
      setEditingCategory(null);
      return;
    }

    try {
      // Actualizar el nombre de la categoría en la base de datos
      const { error: updateError } = await supabase
        .from('product_categories')
        .update({ name: newCategoryName })
        .eq('name', oldCategoryName);

      if (updateError) throw updateError;

      // Actualizar todos los productos que tengan esta categoría
      const updatedProducts = localProducts.map(product =>
        product.Categoria === oldCategoryName
          ? { ...product, Categoria: newCategoryName }
          : product
      );

      // Guardar los productos actualizados
      await handleSaveProducts(updatedProducts);

      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error al actualizar la categoría');
    }
  };

  const totalQuantity = localProducts.reduce((sum, product) => sum + parseInt(product.quantity), 0);
  const completedProducts = localProducts.filter(product => checkedProducts[product.product_name]).length;

  // Agrupar productos por categoría
  const groupedProducts = localProducts.reduce((acc, product) => {
    const category = product.Categoria;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof localProducts>);

  const allCategories = Object.keys(groupedProducts);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-1.5 sm:p-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">
              Productos del Pedido
            </h3>
            <div className="text-xs text-slate-600 leading-tight">
              <p>{Object.keys(groupedProducts).length} categorías • {localProducts.length} productos • {totalQuantity} uds</p>
              <p className="text-green-600 font-medium mt-0.5">
                {completedProducts}/{localProducts.length} productos completados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
            >
              <Edit className="h-3 w-3" />
              <span className="hidden sm:inline">Editar Productos</span>
              <span className="sm:hidden">Editar</span>
            </button>
            <button
              onClick={() => setShowPackagingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
            >
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">
                {Object.keys(productPackaging).length > 0 ? 'Modificar Packaging' : 'Asociar Packaging'}
              </span>
              <span className="sm:hidden">
                {Object.keys(productPackaging).length > 0 ? 'Modificar' : 'Asociar'}
              </span>
            </button>
          </div>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
        {Object.entries(groupedProducts).map(([category, products]) => {
          const categoryStyle = categoryColors[category] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };
          const categoryTotal = products.reduce((sum, product) => sum + parseInt(product.quantity), 0);
          const categoryCompleted = products.filter(product => checkedProducts[product.product_name]).length;

          return (
            <div key={category} className="space-y-0.5">
              <div className={`flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 shadow-sm ${categoryStyle.border} ${categoryStyle.bg} group`}>
                <div className="flex items-center gap-2 flex-1">
                  <Tag className={`h-4 w-4 sm:h-5 sm:w-5 ${categoryStyle.text} flex-shrink-0`} />
                  {editingCategory === category ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveCategory(category, editCategoryName);
                          } else if (e.key === 'Escape') {
                            setEditingCategory(null);
                          }
                        }}
                        onBlur={() => handleSaveCategory(category, editCategoryName)}
                        className="flex-1 px-3 py-1.5 border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-base sm:text-lg font-bold"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <h4
                        className={`font-bold text-base sm:text-lg tracking-tight ${categoryStyle.text} cursor-pointer hover:opacity-70 transition-opacity`}
                        onDoubleClick={() => {
                          setEditingCategory(category);
                          setEditCategoryName(category);
                        }}
                        title="Doble clic para editar"
                      >
                        {category}
                      </h4>
                      <Edit2 className={`hidden sm:block h-4 w-4 ${categoryStyle.text} opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0`} />
                    </>
                  )}
                </div>
                {!editingCategory && (
                  <div className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold ${categoryStyle.bg} ${categoryStyle.text} border-2 ${categoryStyle.border} shadow-sm flex-shrink-0 whitespace-nowrap`}>
                    {categoryTotal} unidades
                  </div>
                )}
              </div>
              
              <div className="space-y-0.5 ml-1">
                {products.map((product, index) => {
                  const hasAllergy = allergyProducts[product.product_name];
                  const isChecked = checkedProducts[product.product_name];

                  return (
                  <div
                    key={index}
                    className={`flex items-stretch justify-between p-2 border rounded-md transition-all ${
                      hasAllergy
                        ? 'border-red-400 bg-red-50'
                        : isChecked
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => handleCheck(product.product_name)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          isChecked
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 hover:border-green-400'
                        }`}
                      >
                        {isChecked && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1">
                          {editingProduct === product.product_name ? (
                            <div className="flex-1 space-y-2 mr-12">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Nombre del producto"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                                placeholder="Descripcion opcional (ej: sin cebolla, extra queso)"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editFormat}
                                  onChange={(e) => setEditFormat(e.target.value)}
                                  className="flex-1 px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                                  placeholder="Formato (ej: 18 bocaditos)"
                                />
                                <input
                                  type="text"
                                  value={editSize}
                                  onChange={(e) => setEditSize(e.target.value)}
                                  className="flex-1 px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                                  placeholder="Tamaño (ej: grande)"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 group cursor-pointer" onDoubleClick={() => {
                                setEditingProduct(product.product_name);
                                setEditName(product.product_name);
                                setEditDescription(product.description || '');
                                setEditFormat(product.format || '');
                                setEditSize(product.size || '');
                              }}>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className={`font-medium text-sm sm:text-base break-words leading-snug ${
                                      isChecked
                                        ? 'text-slate-600 line-through'
                                        : hasAllergy
                                        ? 'text-red-700'
                                        : 'text-slate-800'
                                    }`}>
                                      {product.product_name}
                                    </h5>
                                    <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  </div>
                                  {hasAllergy && (
                                    <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700 w-fit">
                                      <AlertTriangle className="h-3 w-3" />
                                      Intolerancia
                                    </span>
                                  )}
                                </div>
                                {product.description && (
                                  <p className="text-base sm:text-lg text-slate-500 italic leading-tight mt-0.5">
                                    {product.description}
                                  </p>
                                )}
                                {(product.format || product.size) && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {product.format && (
                                      <span className="text-[11px] sm:text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                                        {product.format}
                                      </span>
                                    )}
                                    {product.size && (
                                      <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                        {product.size}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-base sm:text-lg text-slate-500 leading-tight mt-1">
                          {productPackaging[product.product_name] && (
                            <div className="flex items-center gap-2 text-blue-600 font-medium">
                              <Layers className="h-4 w-4" />
                              <span>{productPackaging[product.product_name]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 px-1">
                      {editingProduct === product.product_name ? (
                        <>
                          <button
                            onClick={async () => {
                              const updatedProducts = localProducts.map(p =>
                                p.product_name === product.product_name
                                  ? {
                                      ...p,
                                      product_name: editName,
                                      description: editDescription,
                                      format: editFormat,
                                      size: editSize
                                    }
                                  : p
                              );
                              await handleSaveProducts(updatedProducts);
                              setEditingProduct(null);
                            }}
                            className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded transition-colors shadow-sm"
                            title="Guardar"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors shadow-sm"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className={`px-2.5 py-1 rounded-lg text-sm sm:text-base font-bold min-w-[36px] text-center shadow-sm ${
                            hasAllergy
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                              : isChecked
                              ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                              : 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                          }`}>
                            {product.quantity}
                          </div>
                          <button
                            onClick={() => handleToggleAllergy(product.product_name)}
                            className={`p-1.5 rounded transition-all ${
                              hasAllergy
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                            }`}
                            title={hasAllergy ? 'Quitar marca de intolerancia' : 'Marcar como intolerancia'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-4 border-t border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Total de productos:</span>
            <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">
              {totalQuantity} unidades
            </div>
          </div>
          
          {completedProducts === data.length && data.length > 0 && (
            <div className="p-3 bg-green-100 border border-green-200 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                <span className="font-medium">¡Todos los productos están listos!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showPackagingModal && (
      <ProductPackagingModal
        products={data}
        orderId={orderId || null}
        onConfirm={(productsWithPackaging) => {
          const packagingMap: Record<string, string> = {};
          productsWithPackaging.forEach((product) => {
            if (product.selectedPackaging && product.selectedPackaging.length > 0) {
              packagingMap[product.product_name] = product.packaging || '';
            }
          });
          setProductPackaging(packagingMap);
          setShowPackagingModal(false);
          loadOrderPackaging();
        }}
        onCancel={() => setShowPackagingModal(false)}
      />
    )}

    {showEditModal && (
      <ProductEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        products={localProducts}
        categories={allCategories}
        onSave={handleSaveProducts}
      />
    )}
    </>
  );
};

export default Products;