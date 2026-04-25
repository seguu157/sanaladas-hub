import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { ExtractedData } from '../types';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ExtractedData['product_details'];
  categories: string[];
  onSave: (products: ExtractedData['product_details']) => void;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Platos': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'Sandwiches': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  'Wraps': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'Bolleria': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'Postres': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  'Bebidas': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  'General': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  'Ensaladas': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Sopas': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  'Snacks': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  'Extras': { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  'Complementos': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  'Bocadillos': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  'Bocadillos Vegetales': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'Platos Vegetarianos': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Postres/Frutas': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  'Transporte': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
};

const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onSave,
}) => {
  const [editedProducts, setEditedProducts] = useState(products);
  const [newCategory, setNewCategory] = useState('');
  const [allCategories, setAllCategories] = useState(categories);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  if (!isOpen) return null;

  const handleProductChange = (index: number, field: keyof typeof products[0], value: string) => {
    const updated = [...editedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProducts(updated);
  };

  const handleAddProduct = () => {
    const newProduct = {
      product_name: 'Nuevo producto',
      Categoria: allCategories[0] || 'General',
      quantity: '1',
      description: '',
    };
    setEditedProducts([...editedProducts, newProduct]);
  };

  const handleDeleteProduct = (index: number) => {
    const updated = editedProducts.filter((_, i) => i !== index);
    setEditedProducts(updated);
  };

  const handleAddCategory = () => {
    if (newCategory && !allCategories.includes(newCategory)) {
      setAllCategories([...allCategories, newCategory]);
      setNewCategory('');
    }
  };

  const handleStartEditCategory = (categoryName: string) => {
    setEditingCategory(categoryName);
    setEditCategoryName(categoryName);
  };

  const handleSaveCategory = (oldName: string) => {
    if (editCategoryName.trim() && editCategoryName !== oldName) {
      // Actualizar el nombre de la categoría en la lista
      const updatedCategories = allCategories.map(cat =>
        cat === oldName ? editCategoryName : cat
      );
      setAllCategories(updatedCategories);

      // Actualizar todos los productos que tengan esa categoría
      const updatedProducts = editedProducts.map(product =>
        product.Categoria === oldName
          ? { ...product, Categoria: editCategoryName }
          : product
      );
      setEditedProducts(updatedProducts);
    }
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = (categoryName: string) => {
    // Solo permitir eliminar si no hay productos en esa categoría
    const hasProducts = editedProducts.some(p => p.Categoria === categoryName);
    if (hasProducts) {
      alert('No se puede eliminar una categoría que tiene productos. Por favor reasigna los productos primero.');
      return;
    }
    setAllCategories(allCategories.filter(cat => cat !== categoryName));
  };

  const handleSave = () => {
    onSave(editedProducts);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">Editar Productos y Categorías</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Categorías disponibles</h3>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Agregar Producto
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {allCategories.map((cat) => {
                const style = categoryColors[cat] || categoryColors['General'];
                const productsInCategory = editedProducts.filter(p => p.Categoria === cat).length;

                if (editingCategory === cat) {
                  return (
                    <div key={cat} className="flex items-center gap-1 px-3 py-1 bg-white border-2 border-blue-500 rounded-full">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveCategory(cat);
                          } else if (e.key === 'Escape') {
                            setEditingCategory(null);
                          }
                        }}
                        onBlur={() => handleSaveCategory(cat)}
                        className="w-32 px-2 py-0.5 text-sm font-medium focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveCategory(cat)}
                        className="p-0.5 hover:bg-green-100 rounded transition-colors"
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat}
                    className={`group flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text} border ${style.border} cursor-pointer hover:shadow-md transition-all`}
                  >
                    <span
                      onDoubleClick={() => handleStartEditCategory(cat)}
                      title="Doble clic para editar"
                    >
                      {cat}
                    </span>
                    {productsInCategory > 0 && (
                      <span className="text-xs bg-white bg-opacity-50 px-1.5 py-0.5 rounded-full">
                        {productsInCategory}
                      </span>
                    )}
                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {productsInCategory === 0 && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                        title="Eliminar categoría"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Productos ({editedProducts.length})
            </h3>
            {editedProducts.map((product, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={product.product_name}
                    onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Categoría
                  </label>
                  <select
                    value={product.Categoria}
                    onChange={(e) => handleProductChange(index, 'Categoria', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    min="0"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-end">
                  <button
                    onClick={() => handleDeleteProduct(index)}
                    className="w-full p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 className="h-4 w-4 mx-auto" />
                  </button>
                </div>

                <div className="col-span-12">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={product.description || ''}
                    onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Descripción opcional..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Save className="h-4 w-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
