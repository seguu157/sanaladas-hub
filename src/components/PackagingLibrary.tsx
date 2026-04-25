import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X, Search, Upload, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageVisibility } from '../hooks/usePageVisibility';

interface PackagingType {
  id: string;
  name: string;
  description: string;
  product_reference: string;
  created_at?: string;
  updated_at?: string;
}

const PackagingLibrary: React.FC = () => {
  const { user } = useAuth();
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', product_reference: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPackagingTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('packaging_types')
        .select('id, name, description, product_reference')
        .order('name', { ascending: true })
        .abortSignal(AbortSignal.timeout(15000));

      if (error) throw error;
      setPackagingTypes(data || []);
    } catch (error) {
      console.error('Error loading packaging types:', error);
    }
  }, []);

  const setupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('packaging_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packaging_types'
        },
        async () => {
          // Silent refresh - actualizar sin loading
          try {
            const { data, error } = await supabase
              .from('packaging_types')
              .select('id, name, description, product_reference')
              .order('name', { ascending: true })
              .abortSignal(AbortSignal.timeout(15000));
            if (!error) setPackagingTypes(data || []);
          } catch (error) {
            console.error('Error in silent refresh:', error);
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

    // Solo mostrar loading si no hay datos cargados
    const shouldShowLoading = packagingTypes.length === 0;
    if (shouldShowLoading) {
      setIsLoading(true);
    }

    // Timeout de seguridad solo si mostramos loading
    const safetyTimeout = shouldShowLoading ? setTimeout(() => {
      console.warn('Loading packaging types timeout - forcing loading state to false');
      setIsLoading(false);
    }, 10000) : null;

    const initLoad = async () => {
      await loadPackagingTypes();
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
  }, [user, loadPackagingTypes, setupChannel]);

  const handleAdd = useCallback(async () => {
    if (!formData.name.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('packaging_types')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          product_reference: formData.product_reference.trim(),
          created_by: user.id
        });

      if (error) throw error;

      setFormData({ name: '', description: '', product_reference: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding packaging type:', error);
    }
  }, [formData, user]);

  const handleUpdate = useCallback(async () => {
    if (!formData.name.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('packaging_types')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          product_reference: formData.product_reference.trim()
        })
        .eq('id', editingId);

      if (error) throw error;

      setFormData({ name: '', description: '', product_reference: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating packaging type:', error);
    }
  }, [formData, editingId]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de packaging?')) return;

    try {
      const { error } = await supabase
        .from('packaging_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting packaging type:', error);
    }
  }, []);

  const startEdit = (packaging: PackagingType) => {
    setEditingId(packaging.id);
    setFormData({
      name: packaging.name,
      description: packaging.description,
      product_reference: packaging.product_reference || ''
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', description: '', product_reference: '' });
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

  const parseCSV = (text: string): { name: string; product_reference: string; description: string }[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const result: { name: string; product_reference: string; description: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

      if (parts.length >= 2) {
        const name = parts[0]?.replace(/^"|"$/g, '').trim() || '';
        const product_reference = parts[1]?.replace(/^"|"$/g, '').trim() || '';
        const description = parts[2]?.replace(/^"|"$/g, '').trim() || '';

        if (name) {
          result.push({ name, product_reference, description });
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

      // Insertar en lotes de 50 para mejor rendimiento
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        try {
          const itemsToInsert = batch.map(item => ({
            name: item.name,
            product_reference: item.product_reference,
            description: item.description,
            created_by: user.id
          }));

          const { error } = await supabase
            .from('packaging_types')
            .insert(itemsToInsert);

          if (error) {
            // Si falla el lote, intentar uno por uno
            for (const item of batch) {
              try {
                const { error: singleError } = await supabase
                  .from('packaging_types')
                  .insert({
                    name: item.name,
                    product_reference: item.product_reference,
                    description: item.description,
                    created_by: user.id
                  });

                if (singleError) {
                  errors.push(`Error en "${item.name}": ${singleError.message}`);
                } else {
                  successCount++;
                }
              } catch (err) {
                errors.push(`Error en "${item.name}": ${err}`);
              }
            }
          } else {
            successCount += batch.length;
          }
        } catch (err) {
          errors.push(`Error en lote: ${err}`);
        }
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      if (successCount > 0) {
        alert(`Se importaron ${successCount} productos correctamente`);

        if (errors.length === 0) {
          setShowImportModal(false);
          setImportData('');
        }
      }
    } catch (error) {
      console.error('Error importing packaging types:', error);
      setImportErrors(['Error general al importar los datos']);
    }
  };

  const handleExportTemplate = () => {
    const csv = 'Nombre,SKU/Referencia,Descripción\n"Bandeja Eco Kraft 300 ML","BAN-300","Bandeja ecológica de papel kraft"\n"Caja Pizza 32cm","CAJA-PIZ-32","Caja de cartón corrugado para pizzas"';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_packaging.csv';
    link.click();
  };

  const handleExportCurrent = () => {
    const header = 'Nombre,SKU/Referencia,Descripción\n';
    const rows = packagingTypes.map(pkg =>
      `"${pkg.name}","${pkg.product_reference}","${pkg.description}"`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'packaging_exportado.csv';
    link.click();
  };

  const filteredPackaging = useMemo(() => {
    if (!searchQuery.trim()) return packagingTypes;

    const query = searchQuery.toLowerCase();
    return packagingTypes.filter(pkg =>
      pkg.name.toLowerCase().includes(query) ||
      pkg.description.toLowerCase().includes(query) ||
      pkg.product_reference.toLowerCase().includes(query)
    );
  }, [packagingTypes, searchQuery]);

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!user) return;

      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting realtime for PackagingLibrary...');

        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          console.warn('⚠️ Session refresh failed on wake:', e);
        }

        await loadPackagingTypes();
        setupChannel();
      }
    }, [user, loadPackagingTypes, setupChannel])
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-3 text-slate-400 animate-pulse" />
          <p className="text-slate-600">Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Biblioteca de Packaging</h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Gestiona los tipos de packaging disponibles para tus productos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCurrent}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: '', description: '', product_reference: '' });
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Packaging</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar tipos de packaging..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Modal para agregar */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-blue-50">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Nuevo Tipo de Packaging</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Completa la información del nuevo packaging</p>
              </div>
              <button
                onClick={cancelEdit}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Packaging *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Bandeja, Botella, Caja..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SKU / Referencia de Producto
                  </label>
                  <input
                    type="text"
                    value={formData.product_reference}
                    onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
                    placeholder="Ej: BAN-300, CAJA-PIZ-32..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ej: Bandeja ecológica de papel kraft, apta para horno..."
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={cancelEdit}
                className="w-full sm:w-auto order-2 sm:order-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm sm:text-base font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.name.trim()}
                className="w-full sm:flex-1 order-1 sm:order-2 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                Guardar Packaging
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-green-50">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Editar Packaging</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Modifica la información del packaging</p>
              </div>
              <button
                onClick={cancelEdit}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Packaging *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SKU / Referencia de Producto
                  </label>
                  <input
                    type="text"
                    value={formData.product_reference}
                    onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
                    placeholder="Ej: SKU, código interno..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={cancelEdit}
                className="w-full sm:w-auto order-2 sm:order-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm sm:text-base font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                disabled={!formData.name.trim()}
                className="w-full sm:flex-1 order-1 sm:order-2 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                Actualizar Packaging
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {filteredPackaging.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {searchQuery ? 'No se encontraron resultados' : 'No hay tipos de packaging'}
            </h3>
            <p className="text-slate-500">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza agregando un nuevo tipo de packaging'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredPackaging.map((packaging) => (
              <div key={packaging.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{packaging.name}</h3>
                        {packaging.product_reference && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded w-fit">
                            {packaging.product_reference}
                          </span>
                        )}
                      </div>
                      {packaging.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{packaging.description}</p>
                      )}
                      {packaging.created_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          Creado: {new Date(packaging.created_at).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(packaging)}
                      className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(packaging.id)}
                      className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-shrink-0">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Sobre la Biblioteca de Packaging</h4>
            <p className="text-xs sm:text-sm text-blue-700">
              Los tipos de packaging que crees aquí estarán disponibles para asociar con productos
              cuando proceses pedidos. Esto te ayudará a mantener un registro consistente de cómo
              se empacan tus productos.
            </p>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Importar Packaging Masivo</h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Importa múltiples productos desde un archivo CSV
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Formato del archivo CSV</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        El archivo debe tener 3 columnas: Nombre, SKU/Referencia, Descripción
                      </p>
                      <p className="text-xs text-blue-600 font-mono bg-white p-2 rounded">
                        Nombre,SKU/Referencia,Descripción<br />
                        "Bandeja Eco Kraft 300 ML","BAN-300","Bandeja ecológica"<br />
                        "Caja Pizza 32cm","CAJA-PIZ-32","Caja de cartón"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleExportTemplate}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Plantilla
                  </button>
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
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
                    placeholder="Nombre,SKU/Referencia,Descripción
&quot;Bandeja Eco Kraft 300 ML&quot;,&quot;BAN-300&quot;,&quot;Bandeja ecológica&quot;
&quot;Caja Pizza 32cm&quot;,&quot;CAJA-PIZ-32&quot;,&quot;Caja de cartón&quot;"
                    rows={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs sm:text-sm resize-none"
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

            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                    setImportErrors([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="w-full sm:flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
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

export default PackagingLibrary;
