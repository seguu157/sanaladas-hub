import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChefHat, Plus, Edit2, Trash2, Save, X, Search, Upload, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageVisibility } from '../hooks/usePageVisibility';

interface Recipe {
  id: string;
  nombre_receta: string;
  es_subreceta: boolean;
  unidad_subreceta: string;
  cantidad_subreceta: number;
  ingrediente: string;
  cantidad_ingrediente: number;
  created_at: string;
  updated_at: string;
}

interface Ingrediente {
  nombre: string;
  cantidad: number;
}

const RecipeBook: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre_receta: '',
    es_subreceta: false,
    unidad_subreceta: '',
    cantidad_subreceta: 0
  });
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([{ nombre: '', cantidad: 0 }]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const loadRecipes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, nombre_receta, es_subreceta, unidad_subreceta, cantidad_subreceta, ingrediente, cantidad_ingrediente, created_at, updated_at')
        .order('nombre_receta', { ascending: true })
        .limit(100)
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  }, []);

  const setupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('recipes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes'
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from('recipes')
              .select('id, nombre_receta, es_subreceta, unidad_subreceta, cantidad_subreceta, ingrediente, cantidad_ingrediente, created_at, updated_at')
              .order('nombre_receta', { ascending: true })
              .limit(100)
              .abortSignal(AbortSignal.timeout(15000));
            if (!error) setRecipes(data || []);
          } catch (error) {
            console.error('Error in recipes silent refresh:', error);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Solo mostrar loading si no hay recetas cargadas
    const shouldShowLoading = recipes.length === 0;
    if (shouldShowLoading) {
      setIsLoading(true);
    }

    // Timeout de seguridad solo si mostramos loading
    const safetyTimeout = shouldShowLoading ? setTimeout(() => {
      console.warn('Loading recipes timeout - forcing loading state to false');
      setIsLoading(false);
    }, 10000) : null;

    const initLoad = async () => {
      await loadRecipes();
      if (safetyTimeout) clearTimeout(safetyTimeout);
      setIsLoading(false);
    };

    initLoad();
    setupChannel();

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, loadRecipes, setupChannel]);

  const handleAdd = async () => {
    if (!formData.nombre_receta?.trim() || !user) return;
    if (ingredientes.every(ing => !ing.nombre.trim())) {
      alert('Debes agregar al menos un ingrediente');
      return;
    }

    try {
      const ingredientesValidos = ingredientes.filter(ing => ing.nombre.trim());

      for (const ing of ingredientesValidos) {
        const { error } = await supabase
          .from('recipes')
          .insert({
            nombre_receta: formData.nombre_receta,
            es_subreceta: formData.es_subreceta,
            unidad_subreceta: formData.unidad_subreceta,
            cantidad_subreceta: formData.cantidad_subreceta,
            ingrediente: ing.nombre,
            cantidad_ingrediente: ing.cantidad,
            created_by: user.id
          });

        if (error) throw error;
      }

      setFormData({
        nombre_receta: '',
        es_subreceta: false,
        unidad_subreceta: '',
        cantidad_subreceta: 0
      });
      setIngredientes([{ nombre: '', cantidad: 0 }]);
      setIsAdding(false);
      loadRecipes();
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  };

  const handleUpdate = async () => {
    if (!formData.nombre_receta?.trim() || !editingId || !user) return;
    if (ingredientes.every(ing => !ing.nombre.trim())) {
      alert('Debes agregar al menos un ingrediente');
      return;
    }

    try {
      const recipeToEdit = recipes.find(r => r.id === editingId);
      if (!recipeToEdit) return;

      const allRecipeIds = recipes
        .filter(r =>
          r.nombre_receta === recipeToEdit.nombre_receta &&
          r.es_subreceta === recipeToEdit.es_subreceta &&
          r.unidad_subreceta === recipeToEdit.unidad_subreceta &&
          r.cantidad_subreceta === recipeToEdit.cantidad_subreceta
        )
        .map(r => r.id);

      const { error: deleteError } = await supabase
        .from('recipes')
        .delete()
        .in('id', allRecipeIds);

      if (deleteError) throw deleteError;

      const ingredientesValidos = ingredientes.filter(ing => ing.nombre.trim());

      for (const ing of ingredientesValidos) {
        const { error } = await supabase
          .from('recipes')
          .insert({
            nombre_receta: formData.nombre_receta,
            es_subreceta: formData.es_subreceta,
            unidad_subreceta: formData.unidad_subreceta,
            cantidad_subreceta: formData.cantidad_subreceta,
            ingrediente: ing.nombre,
            cantidad_ingrediente: ing.cantidad,
            created_by: user.id
          });

        if (error) throw error;
      }

      setFormData({
        nombre_receta: '',
        es_subreceta: false,
        unidad_subreceta: '',
        cantidad_subreceta: 0
      });
      setIngredientes([{ nombre: '', cantidad: 0 }]);
      setEditingId(null);
      loadRecipes();
    } catch (error) {
      console.error('Error updating recipe:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta receta?')) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const handleDeleteRecipe = async (recipeName: string, ids: string[]) => {
    if (!confirm('¿Estás seguro de eliminar esta receta y todos sus ingredientes?')) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .in('id', ids);

      if (error) throw error;
      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const startEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setFormData({
      nombre_receta: recipe.nombre_receta,
      es_subreceta: recipe.es_subreceta,
      unidad_subreceta: recipe.unidad_subreceta,
      cantidad_subreceta: recipe.cantidad_subreceta
    });

    const sameRecipeIngredients = recipes
      .filter(r =>
        r.nombre_receta === recipe.nombre_receta &&
        r.es_subreceta === recipe.es_subreceta &&
        r.unidad_subreceta === recipe.unidad_subreceta &&
        r.cantidad_subreceta === recipe.cantidad_subreceta
      )
      .map(r => ({ nombre: r.ingrediente, cantidad: r.cantidad_ingrediente }));

    setIngredientes(sameRecipeIngredientes.length > 0 ? sameRecipeIngredients : [{ nombre: '', cantidad: 0 }]);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      nombre_receta: '',
      es_subreceta: false,
      unidad_subreceta: '',
      cantidad_subreceta: 0
    });
    setIngredientes([{ nombre: '', cantidad: 0 }]);
  };

  const addIngrediente = () => {
    setIngredientes([...ingredientes, { nombre: '', cantidad: 0 }]);
  };

  const removeIngrediente = (index: number) => {
    if (ingredientes.length > 1) {
      setIngredientes(ingredientes.filter((_, i) => i !== index));
    }
  };

  const updateIngrediente = (index: number, field: 'nombre' | 'cantidad', value: string | number) => {
    const newIngredientes = [...ingredientes];
    newIngredientes[index] = {
      ...newIngredientes[index],
      [field]: value
    };
    setIngredientes(newIngredientes);
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

  const parseCSV = (text: string): Partial<Recipe>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const result: Partial<Recipe>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

      if (parts.length >= 6) {
        result.push({
          nombre_receta: parts[0]?.replace(/^"|"$/g, '').trim() || '',
          es_subreceta: parts[1]?.replace(/^"|"$/g, '').trim().toLowerCase() === 'si',
          unidad_subreceta: parts[2]?.replace(/^"|"$/g, '').trim() || '',
          cantidad_subreceta: parseFloat(parts[3]?.replace(/^"|"$/g, '').trim() || '0'),
          ingrediente: parts[4]?.replace(/^"|"$/g, '').trim() || '',
          cantidad_ingrediente: parseFloat(parts[5]?.replace(/^"|"$/g, '').trim() || '0')
        });
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
            .from('recipes')
            .insert({
              ...item,
              created_by: user.id
            });

          if (error) {
            errors.push(`Error en "${item.nombre_receta}": ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`Error en "${item.nombre_receta}": ${err}`);
        }
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      if (successCount > 0) {
        await loadRecipes();
        alert(`Se importaron ${successCount} recetas correctamente`);

        if (errors.length === 0) {
          setShowImportModal(false);
          setImportData('');
        }
      }
    } catch (error) {
      console.error('Error importing recipes:', error);
      setImportErrors(['Error general al importar los datos']);
    }
  };

  const handleExportTemplate = () => {
    const csv = 'Nombre Receta,Subreceta (Si/No),Unidad Subreceta,Cantidad Subreceta,Ingrediente,Cantidad Ingrediente\n"Ensalada César","No","","0","Lechuga romana","400"\n"Base Ensalada","Si","kg","0.5","Aceite de oliva","50"';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_recetas.csv';
    link.click();
  };

  const handleExportCurrent = () => {
    const header = 'Nombre Receta,Subreceta (Si/No),Unidad Subreceta,Cantidad Subreceta,Ingrediente,Cantidad Ingrediente\n';
    const rows = recipes.map(recipe =>
      `"${recipe.nombre_receta}","${recipe.es_subreceta ? 'Si' : 'No'}","${recipe.unidad_subreceta}","${recipe.cantidad_subreceta}","${recipe.ingrediente}","${recipe.cantidad_ingrediente}"`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'recetario_exportado.csv';
    link.click();
  };

  const filteredRecipes = useMemo(() =>
    recipes.filter(recipe =>
      recipe.nombre_receta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingrediente.toLowerCase().includes(searchQuery.toLowerCase())
    ), [recipes, searchQuery]);

  const groupedRecipes = useMemo(() => {
    const grouped = new Map<string, {
      recipe: Recipe;
      ingredientes: Array<{ ingrediente: string; cantidad_ingrediente: number; id: string }>;
    }>();

    filteredRecipes.forEach(recipe => {
      const key = `${recipe.nombre_receta}-${recipe.es_subreceta}-${recipe.unidad_subreceta}-${recipe.cantidad_subreceta}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          recipe: recipe,
          ingredientes: []
        });
      }

      grouped.get(key)!.ingredientes.push({
        ingrediente: recipe.ingrediente,
        cantidad_ingrediente: recipe.cantidad_ingrediente,
        id: recipe.id
      });
    });

    return Array.from(grouped.values());
  }, [filteredRecipes]);

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!user) return;

      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting realtime for RecipeBook...');

        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          console.warn('⚠️ Session refresh failed on wake:', e);
        }

        await loadRecipes();
        setupChannel();
      }
    }, [user, loadRecipes, setupChannel])
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-3 text-slate-400 animate-pulse" />
          <p className="text-slate-600">Cargando recetario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Recetario</h2>
          <p className="text-slate-600 mt-1">
            Gestiona las recetas y sus ingredientes
          </p>
        </div>
        <div className="flex gap-2">
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
                nombre_receta: '',
                es_subreceta: false,
                unidad_subreceta: '',
                cantidad_subreceta: 0
              });
              setIngredientes([{ nombre: '', cantidad: 0 }]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Receta
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar recetas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isAdding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Nueva Receta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre Receta *
              </label>
              <input
                type="text"
                value={formData.nombre_receta}
                onChange={(e) => setFormData({ ...formData, nombre_receta: e.target.value })}
                placeholder="Ej: Ensalada César"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ¿Es Subreceta?
              </label>
              <select
                value={formData.es_subreceta ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, es_subreceta: e.target.value === 'si' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unidad Subreceta
              </label>
              <input
                type="text"
                value={formData.unidad_subreceta}
                onChange={(e) => setFormData({ ...formData, unidad_subreceta: e.target.value })}
                placeholder="Ej: kg, litros, unidades"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cantidad Subreceta
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cantidad_subreceta}
                onChange={(e) => setFormData({ ...formData, cantidad_subreceta: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Ingredientes *
              </label>
              <button
                onClick={addIngrediente}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Añadir Ingrediente
              </button>
            </div>
            <div className="space-y-2">
              {ingredientes.map((ing, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={ing.nombre}
                      onChange={(e) => updateIngrediente(index, 'nombre', e.target.value)}
                      placeholder="Ej: Lechuga romana"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      step="0.01"
                      value={ing.cantidad}
                      onChange={(e) => updateIngrediente(index, 'cantidad', parseFloat(e.target.value) || 0)}
                      placeholder="Cantidad"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {ingredientes.length > 1 && (
                    <button
                      onClick={() => removeIngrediente(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={!formData.nombre_receta?.trim()}
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

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {searchQuery ? 'No se encontraron resultados' : 'No hay recetas'}
            </h3>
            <p className="text-slate-500">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza agregando una nueva receta'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nombre Receta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Subreceta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Cantidad Subreceta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Ingrediente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Cantidad Ingrediente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groupedRecipes.map((group) => (
                  <tr key={group.recipe.id} className="hover:bg-slate-50 transition-colors">
                    {editingId === group.recipe.id ? (
                      <td colSpan={7} className="p-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-slate-900 mb-3">Editar Receta</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre Receta *
                              </label>
                              <input
                                type="text"
                                value={formData.nombre_receta}
                                onChange={(e) => setFormData({ ...formData, nombre_receta: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                ¿Es Subreceta?
                              </label>
                              <select
                                value={formData.es_subreceta ? 'si' : 'no'}
                                onChange={(e) => setFormData({ ...formData, es_subreceta: e.target.value === 'si' })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="no">No</option>
                                <option value="si">Sí</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Unidad Subreceta
                              </label>
                              <input
                                type="text"
                                value={formData.unidad_subreceta}
                                onChange={(e) => setFormData({ ...formData, unidad_subreceta: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cantidad Subreceta
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.cantidad_subreceta}
                                onChange={(e) => setFormData({ ...formData, cantidad_subreceta: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-slate-700">
                                Ingredientes *
                              </label>
                              <button
                                onClick={addIngrediente}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                Añadir Ingrediente
                              </button>
                            </div>
                            <div className="space-y-2">
                              {ingredientes.map((ing, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={ing.nombre}
                                      onChange={(e) => updateIngrediente(index, 'nombre', e.target.value)}
                                      placeholder="Ej: Lechuga romana"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div className="w-32">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={ing.cantidad}
                                      onChange={(e) => updateIngrediente(index, 'cantidad', parseFloat(e.target.value) || 0)}
                                      placeholder="Cantidad"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  {ingredientes.length > 1 && (
                                    <button
                                      onClick={() => removeIngrediente(index)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleUpdate}
                              disabled={!formData.nombre_receta?.trim()}
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
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-slate-900">{group.recipe.nombre_receta}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            group.recipe.es_subreceta
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {group.recipe.es_subreceta ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{group.recipe.unidad_subreceta}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{group.recipe.cantidad_subreceta}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="space-y-1">
                            {group.ingredientes.map((ing, idx) => (
                              <div key={ing.id} className="text-slate-600">
                                {ing.ingrediente}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="space-y-1">
                            {group.ingredientes.map((ing, idx) => (
                              <div key={ing.id} className="text-slate-600">
                                {ing.cantidad_ingrediente}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(group.recipe)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipe(group.recipe.nombre_receta, group.ingredientes.map(i => i.id))}
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <ChefHat className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Sobre el Recetario</h4>
            <p className="text-sm text-blue-700">
              Gestiona tus recetas definiendo si son subrecetas y los ingredientes que las componen.
              Puedes especificar cantidades y unidades para cada ingrediente.
            </p>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Importar Recetas Masivo</h2>
                  <p className="text-sm text-slate-600">
                    Importa múltiples recetas desde un archivo CSV
                  </p>
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
                      <p className="text-sm text-blue-700 mb-2">
                        El archivo debe tener 6 columnas: Nombre Receta, Subreceta (Si/No), Unidad Subreceta, Cantidad Subreceta, Ingrediente, Cantidad Ingrediente
                      </p>
                      <p className="text-xs text-blue-600 font-mono bg-white p-2 rounded">
                        Nombre Receta,Subreceta (Si/No),Unidad Subreceta,Cantidad Subreceta,Ingrediente,Cantidad Ingrediente<br />
                        "Ensalada César","No","","0","Lechuga romana","400"<br />
                        "Base Ensalada","Si","kg","0.5","Aceite de oliva","50"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    O pega el contenido CSV aquí:
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder='Nombre Receta,Subreceta (Si/No),Unidad Subreceta,Cantidad Subreceta,Ingrediente,Cantidad Ingrediente
"Ensalada César","No","","0","Lechuga romana","400"
"Base Ensalada","Si","kg","0.5","Aceite de oliva","50"'
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
                  Importar Recetas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBook;
