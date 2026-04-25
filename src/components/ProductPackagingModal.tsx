import React, { useState, useEffect } from 'react';
import { X, Package, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

interface PackagingType {
  id: string;
  name: string;
  description: string;
  product_reference: string;
}

interface PackagingSelection {
  packagingId: string;
  quantity: number;
}

interface ProductWithPackaging extends Product {
  selectedPackaging?: PackagingSelection[];
}

interface ProductPackagingModalProps {
  products: Product[];
  orderId?: string | null;
  onConfirm: (productsWithPackaging: ProductWithPackaging[]) => void;
  onCancel: () => void;
}

const ProductPackagingModal: React.FC<ProductPackagingModalProps> = ({
  products,
  orderId,
  onConfirm,
  onCancel
}) => {
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [productPackaging, setProductPackaging] = useState<{ [key: number]: PackagingSelection[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('🚀 ProductPackagingModal montado - orderId:', orderId);
    console.log('🚀 Productos:', products.length);

    setIsLoading(true);

    // Timeout de seguridad
    const safetyTimeout = setTimeout(() => {
      console.warn('Loading packaging modal timeout - forcing loading state to false');
      setIsLoading(false);
    }, 10000);

    const loadPackagingTypes = async () => {
      try {
        console.log('🔄 Cargando packaging types...');
        const { data, error } = await supabase
          .from('packaging_types')
          .select('id, name, description, product_reference')
          .order('name', { ascending: true })
          .limit(200);

        console.log('📦 Packaging types result:', { data, error, count: data?.length || 0 });

        if (error) {
          console.error('❌ Error en query:', error);
          throw error;
        }

        setPackagingTypes(data || []);
        console.log('✅ Packaging types cargados:', data?.length || 0);
      } catch (error) {
        console.error('❌ Error loading packaging types:', error);
      } finally {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      }
    };

    const loadExistingPackaging = async () => {
      if (!orderId) return;

      try {
        const { data, error } = await supabase
          .from('order_packaging')
          .select('*')
          .eq('order_id', orderId);

        if (error) throw error;

        if (data && data.length > 0) {
          const packagingByProduct: { [key: number]: PackagingSelection[] } = {};

          data.forEach((item) => {
            const productIndex = products.findIndex(p => p.product_name === item.product_name);
            if (productIndex !== -1) {
              if (!packagingByProduct[productIndex]) {
                packagingByProduct[productIndex] = [];
              }
              packagingByProduct[productIndex].push({
                packagingId: item.packaging_type_id,
                quantity: item.quantity
              });
            }
          });

          setProductPackaging(packagingByProduct);
        }
      } catch (error) {
        console.error('Error loading existing packaging:', error);
      }
    };

    loadPackagingTypes();
    if (orderId) {
      loadExistingPackaging();
    }

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [orderId, products]);

  const addPackaging = (productIndex: number) => {
    setProductPackaging(prev => ({
      ...prev,
      [productIndex]: [...(prev[productIndex] || []), { packagingId: '', quantity: 1 }]
    }));
  };

  const removePackaging = (productIndex: number, packagingSelectionIndex: number) => {
    setProductPackaging(prev => {
      const updated = [...(prev[productIndex] || [])];
      updated.splice(packagingSelectionIndex, 1);
      return {
        ...prev,
        [productIndex]: updated
      };
    });
  };

  const updatePackaging = (
    productIndex: number,
    packagingSelectionIndex: number,
    field: 'packagingId' | 'quantity',
    value: string | number
  ) => {
    setProductPackaging(prev => {
      const updated = [...(prev[productIndex] || [])];
      updated[packagingSelectionIndex] = {
        ...updated[packagingSelectionIndex],
        [field]: value
      };
      return {
        ...prev,
        [productIndex]: updated
      };
    });
  };

  const handleConfirm = async () => {
    console.log('📦 handleConfirm called - orderId:', orderId);
    console.log('📦 isSaving:', isSaving);

    if (!orderId) {
      console.error('❌ No order ID provided');
      alert('Error: No se pudo identificar el pedido. Por favor, cierra este modal e intenta de nuevo.');
      return;
    }

    try {
      setIsSaving(true);
      console.log('💾 Guardando packaging para order:', orderId);

      // Eliminar packaging existente
      console.log('🗑️ Eliminando packaging existente...');
      const { error: deleteError } = await supabase
        .from('order_packaging')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) {
        console.error('❌ Error deleting existing packaging:', deleteError);
        alert(`Error al eliminar packaging existente: ${deleteError.message}`);
        throw deleteError;
      }

      console.log('✅ Packaging existente eliminado');

      const packagingRecords: Array<{
        order_id: string;
        product_name: string;
        packaging_type_id: string;
        quantity: number;
      }> = [];

      products.forEach((product, index) => {
        const selections = productPackaging[index] || [];
        const validSelections = selections.filter(s => s.packagingId && s.quantity > 0);

        validSelections.forEach(selection => {
          packagingRecords.push({
            order_id: orderId,
            product_name: product.product_name,
            packaging_type_id: selection.packagingId,
            quantity: selection.quantity
          });
        });
      });

      console.log('📋 Packaging records to insert:', packagingRecords.length, 'records');
      console.log('📋 Records:', JSON.stringify(packagingRecords, null, 2));

      if (packagingRecords.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('order_packaging')
          .insert(packagingRecords)
          .select();

        if (insertError) {
          console.error('❌ Error inserting packaging:', insertError);
          alert(`Error al guardar packaging: ${insertError.message}`);
          throw insertError;
        }

        console.log('✅ Packaging insertado:', insertedData);
      } else {
        console.log('⚠️ No hay registros de packaging para insertar');
      }

      const productsWithPackaging: ProductWithPackaging[] = products.map((product, index) => {
        const selections = productPackaging[index] || [];
        const validSelections = selections.filter(s => s.packagingId && s.quantity > 0);

        const packagingNames = validSelections
          .map(s => {
            const pkg = packagingTypes.find(p => p.id === s.packagingId);
            return pkg ? `${pkg.name} (x${s.quantity})` : '';
          })
          .filter(Boolean)
          .join(', ');

        return {
          ...product,
          packaging: packagingNames || product.packaging,
          selectedPackaging: validSelections
        };
      });

      console.log('✅ Packaging guardado exitosamente - cerrando modal');
      alert('Packaging guardado exitosamente');
      onConfirm(productsWithPackaging);
    } catch (error: any) {
      console.error('❌ Error saving packaging:', error);
      alert(`Error al guardar el packaging: ${error?.message || 'Error desconocido'}. Por favor intenta de nuevo.`);
    } finally {
      setIsSaving(false);
    }
  };

  const allProductsHavePackaging = products.every((_, index) => {
    const selections = productPackaging[index] || [];
    return selections.some(s => s.packagingId && s.quantity > 0);
  });

  const someProductsHavePackaging = Object.values(productPackaging).some(
    selections => selections.some(s => s.packagingId && s.quantity > 0)
  );

  const hasExistingPackaging = Object.keys(productPackaging).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                {hasExistingPackaging ? 'Modificar Packaging' : 'Asociar Packaging'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 truncate">
                {hasExistingPackaging
                  ? 'Modifica el packaging de los productos'
                  : 'Selecciona el tipo de packaging para cada producto'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-slate-400 animate-pulse" />
                <p className="text-sm sm:text-base text-slate-600">Cargando tipos de packaging...</p>
              </div>
            </div>
          ) : packagingTypes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 text-center">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900 mb-2 text-sm sm:text-base">
                No hay tipos de packaging disponibles
              </h3>
              <p className="text-xs sm:text-sm text-yellow-700 mb-4">
                Primero debes crear tipos de packaging en la Biblioteca
              </p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                Ir a Biblioteca
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1 text-xs sm:text-sm">Instrucciones</h4>
                    <p className="text-xs sm:text-sm text-blue-700">
                      Selecciona el packaging adecuado para cada producto. Puedes confirmar sin completar todos
                      los campos, pero es recomendable asociar packaging a todos los productos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de productos */}
              {products.map((product, index) => {
                const selections = productPackaging[index] || [];
                const hasValidSelection = selections.some(s => s.packagingId && s.quantity > 0);

                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Info del producto */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {product.product_name}
                          </h3>
                          {hasValidSelection && (
                            <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs">Asignado</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                          <p>
                            <span className="font-medium">Categoría:</span> {product.Categoria}
                          </p>
                          <p>
                            <span className="font-medium">Cantidad:</span> {product.quantity}
                          </p>
                          {product.packaging && (
                            <p>
                              <span className="font-medium">Packaging sugerido:</span>{' '}
                              <span className="text-blue-600">{product.packaging}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selecciones de packaging */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700">
                          Tipos de Packaging
                        </label>
                        <button
                          onClick={() => addPackaging(index)}
                          className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          Agregar
                        </button>
                      </div>

                      {selections.length === 0 ? (
                        <div className="text-center py-4 sm:py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-xs sm:text-sm text-slate-500 mb-2">
                            No hay packaging asignado
                          </p>
                          <button
                            onClick={() => addPackaging(index)}
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Agregar packaging
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selections.map((selection, selectionIndex) => (
                            <div
                              key={selectionIndex}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 sm:p-3 bg-slate-50 rounded-lg"
                            >
                              <select
                                value={selection.packagingId}
                                onChange={(e) =>
                                  updatePackaging(index, selectionIndex, 'packagingId', e.target.value)
                                }
                                className="flex-1 px-2 sm:px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm"
                              >
                                <option value="">Seleccionar...</option>
                                {packagingTypes.map((packaging) => (
                                  <option key={packaging.id} value={packaging.id}>
                                    {packaging.name}{' '}
                                    {packaging.product_reference && `(${packaging.product_reference})`}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={selection.quantity}
                                  onChange={(e) =>
                                    updatePackaging(
                                      index,
                                      selectionIndex,
                                      'quantity',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-20 px-2 sm:px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                  placeholder="Cant."
                                />
                                <span className="text-xs text-slate-500">uds</span>
                                <button
                                  onClick={() => removePackaging(index, selectionIndex)}
                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
              {someProductsHavePackaging ? (
                <>
                  {Object.values(productPackaging).filter(selections =>
                    selections.some(s => s.packagingId && s.quantity > 0)
                  ).length} de {products.length} productos con packaging
                  {allProductsHavePackaging && (
                    <span className="ml-2 text-green-600 font-medium">✓ Completo</span>
                  )}
                </>
              ) : (
                'Ningún producto tiene packaging asignado'
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={onCancel}
                className="w-full sm:w-auto order-2 sm:order-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('🖱️ Botón Guardar Packaging clickeado');
                  console.log('🖱️ Estado - orderId:', orderId, 'isSaving:', isSaving);
                  handleConfirm();
                }}
                disabled={isSaving || !orderId}
                className="w-full sm:w-auto order-1 sm:order-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar Packaging
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPackagingModal;
