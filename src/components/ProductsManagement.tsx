import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Search, Edit, Trash2, Save, X, BookOpen } from 'lucide-react';
import { Product } from '../types';

const ProductsManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('catering-products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((product: any) => ({
          ...product,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt)
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    recipe: ''
  });

  // Guardar productos en localStorage
  useEffect(() => {
    localStorage.setItem('catering-products', JSON.stringify(products));
  }, [products]);

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.recipe.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSaveProduct = () => {
    if (!formData.name || !formData.sku || !formData.recipe) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }

    // Verificar que el SKU no esté duplicado
    const existingProduct = products.find(p => 
      p.sku === formData.sku && p.id !== editingProduct?.id
    );
    
    if (existingProduct) {
      alert('Ya existe un producto con este SKU');
      return;
    }

    const now = new Date();
    const product: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.name!,
      sku: formData.sku!,
      recipe: formData.recipe!,
      createdAt: editingProduct?.createdAt || now,
      updatedAt: now
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    } else {
      setProducts(prev => [product, ...prev]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      recipe: ''
    });
    setIsCreating(false);
    setEditingProduct(null);
  };

  const handleEditProduct = (product: Product) => {
    setFormData(product);
    setEditingProduct(product);
    setIsCreating(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  if (showProductDetail) {
    return (
      <div className="w-full space-y-6">
        {/* Header del detalle */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{showProductDetail.name}</h1>
                <p className="text-slate-600">SKU: {showProductDetail.sku}</p>
              </div>
            </div>
            <button
              onClick={() => setShowProductDetail(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receta */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Receta</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-slate-700 font-mono text-sm">
              {showProductDetail.recipe}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="w-full space-y-6">
        {/* Header del formulario */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <p className="text-slate-600">
                  {editingProduct ? 'Modifica los detalles del producto' : 'Crea un nuevo producto con su receta'}
                </p>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre del Producto *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Bocadillo de jamón ibérico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: BOC-JAM-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Receta *
              </label>
              <textarea
                value={formData.recipe || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, recipe: e.target.value }))}
                rows={10}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Escribe aquí la receta completa del producto...

Ejemplo:
Ingredientes:
- Pan de barra
- Jamón ibérico 100g
- Tomate
- Aceite de oliva

Preparación:
1. Cortar el pan por la mitad
2. Untar con tomate y aceite
3. Añadir el jamón ibérico
4. Servir"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={resetForm}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProduct}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Gestión de Productos</h2>
              <p className="text-slate-600">
                {products.length} producto{products.length !== 1 ? 's' : ''} creado{products.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Buscar productos por nombre, SKU o receta..."
          />
        </div>
      </div>

      {/* Lista de productos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ChefHat className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchTerm ? 'No se encontraron productos' : 'No hay productos creados'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchTerm 
              ? 'Intenta cambiar el término de búsqueda'
              : 'Crea tu primer producto con su receta'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Crear Primer Producto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">{product.name}</h3>
                    <p className="text-sm text-blue-600 font-mono mb-2">SKU: {product.sku}</p>
                    <p className="text-sm text-slate-500 line-clamp-3">
                      {product.recipe.substring(0, 100)}...
                    </p>
                  </div>
                  
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  Creado: {product.createdAt.toLocaleDateString('es-ES')}
                  {product.updatedAt.getTime() !== product.createdAt.getTime() && (
                    <span className="ml-2">
                      • Actualizado: {product.updatedAt.toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setShowProductDetail(product)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Ver Receta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;