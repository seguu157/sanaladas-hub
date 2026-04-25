import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X, Search, Upload, Download, AlertCircle, ShoppingCart, Box, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageVisibility } from '../hooks/usePageVisibility';

interface Product {
  id: string;
  supplier_name: string;
  product_reference: string;
  product_name: string;
  tax: string;
  format_name: string;
  price: number;
  created_at: string;
  updated_at: string;
}

interface ShoppingListItem {
  id: string;
  product_id: string;
  units_remaining: number;
  units_to_buy: number;
  is_purchased: boolean;
  product?: Product;
  created_at: string;
  updated_at: string;
}

type TabType = 'products' | 'shopping';

const ProductsInventory: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    product_reference: '',
    product_name: '',
    tax: '',
    format_name: '',
    price: 0
  });
  const [shoppingFormData, setShoppingFormData] = useState({
    product_id: '',
    units_remaining: 0,
    units_to_buy: 0
  });
  const [isAddingToShoppingList, setIsAddingToShoppingList] = useState(false);
  const [editingShoppingId, setEditingShoppingId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productsChannelRef = useRef<any>(null);
  const shoppingChannelRef = useRef<any>(null);

  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products_inventory')
        .select('id, supplier_name, product_reference, product_name, tax, format_name, price, created_at, updated_at')
        .order('product_name', { ascending: true })
        .limit(200)
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  const loadShoppingList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .select(`
          id,
          product_id,
          units_remaining,
          units_to_buy,
          is_purchased,
          created_at,
          updated_at,
          product:products_inventory(id, supplier_name, product_reference, product_name, format_name, price)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;
      // Supabase tipa el join `product:products_inventory(...)` como array,
      // pero en runtime es un único objeto (FK única). Cast a any para
      // mantener el comportamiento original.
      setShoppingList((data as any) || []);
    } catch (error) {
      console.error('Error loading shopping list:', error);
    }
  }, []);

  const setupChannels = useCallback(() => {
    if (productsChannelRef.current) {
      supabase.removeChannel(productsChannelRef.current);
      productsChannelRef.current = null;
    }
    if (shoppingChannelRef.current) {
      supabase.removeChannel(shoppingChannelRef.current);
      shoppingChannelRef.current = null;
    }

    const productsChannel = supabase
      .channel('products_inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products_inventory'
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from('products_inventory')
              .select('id, supplier_name, product_reference, product_name, tax, format_name, price, created_at, updated_at')
              .order('product_name', { ascending: true })
              .limit(200)
              .abortSignal(AbortSignal.timeout(15000));
            if (!error) setProducts(data || []);
          } catch (error) {
            console.error('Error in products silent refresh:', error);
          }
        }
      )
      .subscribe();

    productsChannelRef.current = productsChannel;

    const shoppingChannel = supabase
      .channel('shopping_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list'
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from('shopping_list')
              .select(`
                id,
                product_id,
                units_remaining,
                units_to_buy,
                is_purchased,
                created_at,
                updated_at,
                product:products_inventory(id, supplier_name, product_reference, product_name, format_name, price)
              `)
              .order('created_at', { ascending: false })
              .limit(100)
              .abortSignal(AbortSignal.timeout(15000));
            if (!error) setShoppingList((data as any) || []);
          } catch (error) {
            console.error('Error in shopping list silent refresh:', error);
          }
        }
      )
      .subscribe();

    shoppingChannelRef.current = shoppingChannel;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Solo mostrar loading si no hay productos cargados
    const shouldShowLoading = products.length === 0;
    if (shouldShowLoading) {
      setIsLoading(true);
    }

    // Timeout de seguridad solo si mostramos loading
    const safetyTimeout = shouldShowLoading ? setTimeout(() => {
      console.warn('Loading products timeout - forcing loading state to false');
      setIsLoading(false);
    }, 10000) : null;

    const initLoad = async () => {
      await Promise.all([loadProducts(), loadShoppingList()]);
      if (safetyTimeout) clearTimeout(safetyTimeout);
      setIsLoading(false);
    };

    initLoad();
    setupChannels();

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (productsChannelRef.current) {
        supabase.removeChannel(productsChannelRef.current);
        productsChannelRef.current = null;
      }
      if (shoppingChannelRef.current) {
        supabase.removeChannel(shoppingChannelRef.current);
        shoppingChannelRef.current = null;
      }
    };
  }, [user, loadProducts, loadShoppingList, setupChannels]);

  const handleAdd = async () => {
    if (!formData.product_name.trim() || !formData.supplier_name.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('products_inventory')
        .insert({
          ...formData,
          created_by: user.id
        });

      if (error) throw error;

      await loadProducts();
      setIsAdding(false);
      setFormData({
        supplier_name: '',
        product_reference: '',
        product_name: '',
        tax: '',
        format_name: '',
        price: 0
      });
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setIsAdding(false);
    setFormData({
      supplier_name: product.supplier_name,
      product_reference: product.product_reference,
      product_name: product.product_name,
      tax: product.tax,
      format_name: product.format_name,
      price: product.price
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.product_name.trim() || !formData.supplier_name.trim()) return;

    try {
      const { error } = await supabase
        .from('products_inventory')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      await loadProducts();
      setEditingId(null);
      setFormData({
        supplier_name: '',
        product_reference: '',
        product_name: '',
        tax: '',
        format_name: '',
        price: 0
      });
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      supplier_name: '',
      product_reference: '',
      product_name: '',
      tax: '',
      format_name: '',
      price: 0
    });
  };

  const handleAddToShoppingList = async () => {
    if (!shoppingFormData.product_id || !user) return;

    try {
      const { error } = await supabase
        .from('shopping_list')
        .insert({
          product_id: shoppingFormData.product_id,
          units_remaining: shoppingFormData.units_remaining,
          units_to_buy: shoppingFormData.units_to_buy,
          created_by: user.id
        });

      if (error) throw error;

      await loadShoppingList();
      setIsAddingToShoppingList(false);
      setShoppingFormData({
        product_id: '',
        units_remaining: 0,
        units_to_buy: 0
      });
    } catch (error) {
      console.error('Error adding to shopping list:', error);
    }
  };

  const startEditShoppingItem = (item: ShoppingListItem) => {
    setEditingShoppingId(item.id);
    setShoppingFormData({
      product_id: item.product_id,
      units_remaining: item.units_remaining,
      units_to_buy: item.units_to_buy
    });
  };

  const handleUpdateShoppingItem = async () => {
    if (!editingShoppingId) return;

    try {
      const { error } = await supabase
        .from('shopping_list')
        .update({
          units_remaining: shoppingFormData.units_remaining,
          units_to_buy: shoppingFormData.units_to_buy,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingShoppingId);

      if (error) throw error;

      await loadShoppingList();
      setEditingShoppingId(null);
      setShoppingFormData({
        product_id: '',
        units_remaining: 0,
        units_to_buy: 0
      });
    } catch (error) {
      console.error('Error updating shopping item:', error);
    }
  };

  const togglePurchased = async (item: ShoppingListItem) => {
    if (!item.is_purchased) {
      if (!confirm('¿Marcar como comprado? El producto se eliminará de la lista.')) return;
    }

    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      await loadShoppingList();
    } catch (error) {
      console.error('Error marking as purchased:', error);
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    if (!confirm('¿Eliminar este producto de la lista de compra?')) return;

    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadShoppingList();
    } catch (error) {
      console.error('Error deleting shopping item:', error);
    }
  };

  const cancelShoppingEdit = () => {
    setEditingShoppingId(null);
    setIsAddingToShoppingList(false);
    setShoppingFormData({
      product_id: '',
      units_remaining: 0,
      units_to_buy: 0
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportData(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): Omit<Product, 'id' | 'created_at' | 'updated_at'>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const result: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

      if (parts.length >= 3) {
        const supplier_name = parts[0]?.replace(/^"|"$/g, '').trim() || '';
        const product_reference = parts[1]?.replace(/^"|"$/g, '').trim() || '';
        const product_name = parts[2]?.replace(/^"|"$/g, '').trim() || '';
        const tax = parts[3]?.replace(/^"|"$/g, '').trim() || '';
        const format_name = parts[4]?.replace(/^"|"$/g, '').trim() || '';
        const price = parseFloat(parts[5]?.replace(/^"|"$/g, '').trim() || '0');

        if (supplier_name && product_name) {
          result.push({
            supplier_name,
            product_reference,
            product_name,
            tax,
            format_name,
            price
          });
        }
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (!importData.trim() || !user) return;

    try {
      setImportErrors([]);
      const items = parseCSV(importData);

      if (items.length === 0) {
        setImportErrors(['No se encontraron datos válidos para importar']);
        return;
      }

      const errors: string[] = [];
      let successCount = 0;

      for (const item of items) {
        try {
          const { error } = await supabase
            .from('products_inventory')
            .insert({
              ...item,
              created_by: user.id
            });

          if (error) {
            errors.push(`Error en "${item.product_name}": ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`Error en "${item.product_name}": ${err}`);
        }
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      if (successCount > 0) {
        await loadProducts();
        alert(`Se importaron ${successCount} productos correctamente`);

        if (errors.length === 0) {
          setShowImportModal(false);
          setImportData('');
        }
      }
    } catch (error) {
      console.error('Error importing products:', error);
      setImportErrors(['Error general al importar los datos']);
    }
  };

  const handleExportTemplate = () => {
    const csv = 'Nombre Proveedor,REF. Producto,Nombre Producto,Impuesto,Nombre Formato,Precio\n"Proveedor Ejemplo","REF-001","Producto Ejemplo","21%","500g",15.50';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_productos.csv';
    link.click();
  };

  const handleExportCurrent = () => {
    const header = 'Nombre Proveedor,REF. Producto,Nombre Producto,Impuesto,Nombre Formato,Precio\n';
    const rows = products.map(prod =>
      `"${prod.supplier_name}","${prod.product_reference}","${prod.product_name}","${prod.tax}","${prod.format_name}",${prod.price}`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'productos_exportados.csv';
    link.click();
  };

  const handleExportShoppingList = () => {
    const header = 'Producto,Proveedor,Referencia,Unidades Restantes,Unidades a Comprar,Precio,Total\n';
    const rows = shoppingList
      .filter(item => item.product)
      .map(item => {
        const product = item.product!;
        const total = product.price * item.units_to_buy;
        return `"${product.product_name}","${product.supplier_name}","${product.product_reference}",${item.units_remaining},${item.units_to_buy},${product.price.toFixed(2)},${total.toFixed(2)}`;
      })
      .join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lista_compra.csv';
    link.click();
  };

  const filteredProducts = products.filter(prod =>
    prod.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.product_reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShoppingList = shoppingList.filter(item => {
    if (!item.product) return false;
    return (
      item.product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalShoppingCost = shoppingList.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.units_to_buy;
  }, 0);

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!user) return;

      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting realtime for ProductsInventory...');

        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          console.warn('⚠️ Session refresh failed on wake:', e);
        }

        await Promise.all([loadProducts(), loadShoppingList()]);
        setupChannels();
      }
    }, [user, loadProducts, loadShoppingList, setupChannels])
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Productos</h2>
          <p className="text-slate-600 mt-1">
            Administra tu inventario y lista de compras
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'products' ? (
            <>
              <button
                onClick={handleExportCurrent}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Importar
              </button>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setEditingId(null);
                  setFormData({
                    supplier_name: '',
                    product_reference: '',
                    product_name: '',
                    tax: '',
                    format_name: '',
                    price: 0
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nuevo Producto
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportShoppingList}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Exportar Lista
              </button>
              <button
                onClick={() => {
                  setIsAddingToShoppingList(true);
                  setEditingShoppingId(null);
                  setShoppingFormData({
                    product_id: '',
                    units_remaining: 0,
                    units_to_buy: 0
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Añadir a Lista
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="h-4 w-4" />
            Productos ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'shopping'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Lista de Compra ({shoppingList.length})
          </button>
        </div>
      </div>

      {activeTab === 'shopping' && shoppingList.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900">
                {shoppingList.length} producto{shoppingList.length !== 1 ? 's' : ''} en lista
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Coste total estimado: {totalShoppingCost.toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'products' ? 'Buscar productos...' : 'Buscar en lista de compra...'}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {activeTab === 'products' && (
        <>
          {isAdding && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-4">Nuevo Producto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre Proveedor *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    placeholder="Ej: Proveedor ABC"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    REF. Producto
                  </label>
                  <input
                    type="text"
                    value={formData.product_reference}
                    onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
                    placeholder="Ej: REF-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre Producto *
                  </label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Ej: Aceite de Oliva"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Impuesto
                  </label>
                  <input
                    type="text"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    placeholder="Ej: 21%"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre Formato
                  </label>
                  <input
                    type="text"
                    value={formData.format_name}
                    onChange={(e) => setFormData({ ...formData, format_name: e.target.value })}
                    placeholder="Ej: 500g, 1L, Caja 24 uds"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Precio (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAdd}
                  disabled={!formData.product_name.trim() || !formData.supplier_name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No hay productos todavía</p>
                <p className="text-sm text-slate-500 mt-1">Añade tu primer producto para empezar</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                  {editingId === product.id ? (
                    <div className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Proveedor *</label>
                          <input
                            type="text"
                            value={formData.supplier_name}
                            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">REF. Producto</label>
                          <input
                            type="text"
                            value={formData.product_reference}
                            onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Producto *</label>
                          <input
                            type="text"
                            value={formData.product_name}
                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Impuesto</label>
                          <input
                            type="text"
                            value={formData.tax}
                            onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Formato</label>
                          <input
                            type="text"
                            value={formData.format_name}
                            onChange={(e) => setFormData({ ...formData, format_name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Precio (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdate}
                          disabled={!formData.product_name.trim() || !formData.supplier_name.trim()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="h-3 w-3" />
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">PRODUCTO</p>
                            <p className="font-semibold text-slate-900">{product.product_name}</p>
                            {product.product_reference && (
                              <p className="text-xs text-slate-600 mt-0.5">Ref: {product.product_reference}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">PROVEEDOR</p>
                            <p className="text-sm text-slate-900">{product.supplier_name}</p>
                            {product.format_name && (
                              <p className="text-xs text-slate-600 mt-0.5">{product.format_name}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">PRECIO / IMPUESTO</p>
                            <p className="text-sm font-semibold text-green-700">{product.price.toFixed(2)}€</p>
                            {product.tax && (
                              <p className="text-xs text-slate-600 mt-0.5">{product.tax}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEdit(product)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'shopping' && (
        <>
          {isAddingToShoppingList && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
              <h3 className="font-semibold text-green-900 mb-4">Añadir a Lista de Compra</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Producto *</label>
                  <select
                    value={shoppingFormData.product_id}
                    onChange={(e) => setShoppingFormData({ ...shoppingFormData, product_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.product_name}
                        {product.product_reference && ` | Ref: ${product.product_reference}`}
                        {product.format_name && ` | ${product.format_name}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidades que quedan</label>
                  <input
                    type="number"
                    value={shoppingFormData.units_remaining}
                    onChange={(e) => setShoppingFormData({ ...shoppingFormData, units_remaining: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cuántas comprar</label>
                  <input
                    type="number"
                    value={shoppingFormData.units_to_buy}
                    onChange={(e) => setShoppingFormData({ ...shoppingFormData, units_to_buy: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddToShoppingList}
                  disabled={!shoppingFormData.product_id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Añadir
                </button>
                <button
                  onClick={cancelShoppingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredShoppingList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No hay productos en la lista de compra</p>
                <p className="text-sm text-slate-500 mt-1">Añade productos para comenzar tu lista</p>
              </div>
            ) : (
              filteredShoppingList.map((item) => {
                const product = item.product;
                if (!product) return null;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                  >
                    {editingShoppingId === item.id ? (
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unidades que quedan</label>
                            <input
                              type="number"
                              value={shoppingFormData.units_remaining}
                              onChange={(e) => setShoppingFormData({ ...shoppingFormData, units_remaining: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cuántas comprar</label>
                            <input
                              type="number"
                              value={shoppingFormData.units_to_buy}
                              onChange={(e) => setShoppingFormData({ ...shoppingFormData, units_to_buy: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateShoppingItem}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Save className="h-3 w-3" />
                            Guardar
                          </button>
                          <button
                            onClick={cancelShoppingEdit}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-1">PRODUCTO</p>
                              <p className="font-semibold text-slate-900">{product.product_name}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{product.supplier_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-1">QUEDAN</p>
                              <p className={`text-lg font-bold ${
                                item.units_remaining === 0 ? 'text-red-600' : 'text-slate-900'
                              }`}>
                                {item.units_remaining}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-1">COMPRAR</p>
                              <p className="text-lg font-bold text-blue-600">{item.units_to_buy}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-1">COSTE</p>
                              <p className="text-sm font-semibold text-green-700">
                                {(product.price * item.units_to_buy).toFixed(2)}€
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {product.price.toFixed(2)}€ x {item.units_to_buy}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => startEditShoppingItem(item)}
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => togglePurchased(item)}
                              className="p-2 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                              title="Marcar como comprado y eliminar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Importar Productos Masivo</h2>
                  <p className="text-sm text-slate-600">Importa múltiples productos desde un archivo CSV</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                  setImportErrors([]);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Formato del archivo CSV</h4>
                      <p className="text-sm text-blue-700 mb-2">El archivo debe tener 6 columnas en este orden</p>
                      <p className="text-xs text-blue-600 font-mono bg-white p-2 rounded">
                        Nombre Proveedor,REF. Producto,Nombre Producto,Impuesto,Nombre Formato,Precio<br />
                        "Proveedor ABC","REF-001","Aceite de Oliva","21%","500ml",15.50
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Plantilla
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Seleccionar Archivo CSV
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">O pega el contenido CSV aquí:</label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Nombre Proveedor,REF. Producto,Nombre Producto,Impuesto,Nombre Formato,Precio
&quot;Proveedor ABC&quot;,&quot;REF-001&quot;,&quot;Aceite de Oliva&quot;,&quot;21%&quot;,&quot;500ml&quot;,15.50"
                    rows={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                  />
                </div>

                {importErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-900 mb-2">Errores al importar:</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {importErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                    setImportErrors([]);
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar Productos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsInventory;
