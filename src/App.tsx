import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider } from './components/Auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { useOrders } from './hooks/useOrders';
import { useSafeTimeout } from './hooks/useSafeTimeout';
import { useWakeLock } from './hooks/useWakeLock';
import { useGlobalRealtimeReset } from './hooks/useGlobalRealtimeReset';
import { usePersistedState } from './hooks/usePersistedState';
import AuthScreen from './components/Auth/AuthScreen';
import Header from './components/Layout/Header';
import LoadingState from './components/LoadingState';
import { useWebhookReceiver } from './hooks/useWebhookReceiver';
import { ExtractedData, Order, Comment } from './types';
import { uploadPDF, supabase } from './lib/supabase';
import { withHangGuard } from './lib/supabaseHangGuard';
import { FileText, List, Calendar as CalendarIcon, Clock, ChefHat, Bot, Activity, Package, ShoppingBag, Users } from 'lucide-react';
import FileUploader from './components/FileUploader';
import PdfProcessingProgress, { ProcessingStage } from './components/PdfProcessingProgress';
import DataVisualizer from './components/DataVisualizer';
import OrdersList from './components/OrdersList';
import Calendar from './components/Calendar';
import TodaysOrders from './components/TodaysOrders';
import AIConversational from './components/AIConversational';
import WebhookLogs from './components/WebhookLogs';
import PackagingLibrary from './components/PackagingLibrary';
import ProductsInventory from './components/ProductsInventory';
import RecipeBook from './components/RecipeBook';
import { UserManagement } from './components/UserManagement';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { orders, loading: ordersLoading, deleteOrder, refreshOrders } = useOrders(user?.id);
  const { setSafeTimeout } = useSafeTimeout();

  // Mantén la pantalla viva mientras hay sesión (crítico para tablet de cocina).
  useWakeLock(!!user);

  // Reset del websocket de Supabase en wakes largos para evitar estado zombie.
  useGlobalRealtimeReset();

  const [activeTab, setActiveTab] = usePersistedState<'upload' | 'orders' | 'calendar' | 'todays-orders' | 'products' | 'ai-agent' | 'webhook-logs' | 'library' | 'inventory' | 'recipes' | 'users'>('app:activeTab', 'upload');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [currentOrderId, setCurrentOrderId] = usePersistedState<string | null>('app:currentOrderId', null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPdfFile, setCurrentPdfFile] = useState<File | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string | undefined>();
  const [processingError, setProcessingError] = useState<string | undefined>();
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [pendingNewOrderId, setPendingNewOrderId] = useState<string | null>(null);
  const [trackedPendingPdfId, setTrackedPendingPdfId] = useState<string | null>(null);

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data) {
          setUserRole(data.role);
        }
      }
    };
    loadUserRole();
  }, [user]);

  // Redirect workers away from restricted tabs
  useEffect(() => {
    if (userRole === 'worker') {
      const restrictedTabs = ['upload', 'ai-agent', 'webhook-logs', 'users'];
      if (restrictedTabs.includes(activeTab)) {
        setActiveTab('orders');
      }
    }
  }, [userRole, activeTab]);

  // Optimized webhook callbacks
  const handleWebhookOrder = useCallback((order: Order) => {
    refreshOrders();
    setCurrentOrderId(order.id);
    setExtractedData(order.data);
    setActiveTab('upload');
  }, [refreshOrders]);

  const handleWebhookClient = useCallback((clientName: string, clientId: string) => {
    console.log(`Nuevo cliente detectado: ${clientName} (ID: ${clientId})`);
  }, []);

  const { isListening, lastReceived } = useWebhookReceiver(handleWebhookOrder, handleWebhookClient);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setCurrentPdfFile(file); // Guardar el archivo PDF

    try {
      if (!user) {
        setError('Debes iniciar sesión para subir archivos.');
        return;
      }

      // Subir PDF a Supabase Storage
      const { path, error: uploadError } = await uploadPDF(file, user.id);
      if (uploadError) {
        setError('Error al subir el PDF: ' + uploadError);
        return;
      }

      if (!path) {
        setError('Error al subir el PDF.');
        return;
      }

      // Guardar referencia del PDF pendiente en la base de datos
      const { error: insertError } = await supabase
        .from('pending_pdfs')
        .insert({
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          user_id: user.id,
          processed: false
        });

      if (insertError) {
        console.error('Error saving pending PDF:', insertError);
        setError('Error al registrar el PDF. Por favor, inténtalo de nuevo.');
        return;
      }

      // Mostrar mensaje de éxito
      alert(`✅ PDF "${file.name}" subido correctamente.\n\nAhora espera a que llegue el JSON con los datos extraídos del pedido. El PDF se asociará automáticamente al pedido.`);

    } catch (err) {
      console.error('Error in handleFileUpload:', err);
      setError('Error al procesar el archivo. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleWebhookUpload = useCallback(async (file: File) => {
    setError(null);
    setProcessingError(undefined);
    setProcessingFileName(file.name);
    setProcessingStartedAt(Date.now());
    setProcessingStage('uploading');
    setCurrentPdfFile(file);
    setTrackedPendingPdfId(null);

    // Timers de seguridad: si n8n aún no tiene los nodos de checkpoint
    // configurados, avanzamos visualmente el stepper para que no se quede
    // congelado. Cualquier status real desde n8n vía Realtime sobrescribe
    // estos avances estimados (la lógica anti-retroceso de la suscripción
    // mantiene siempre la etapa más avanzada).
    let receivedTimer: ReturnType<typeof setTimeout> | null = null;
    let extractingTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleFallbackStages = () => {
      receivedTimer = setTimeout(() => {
        setProcessingStage((prev) => (prev === 'sending' ? 'received_by_llamaindex' : prev));
      }, 4000);
      extractingTimer = setTimeout(() => {
        setProcessingStage((prev) =>
          prev === 'sending' || prev === 'received_by_llamaindex' ? 'extracting' : prev,
        );
      }, 10000);
    };
    const clearFallbackTimers = () => {
      if (receivedTimer) {
        clearTimeout(receivedTimer);
        receivedTimer = null;
      }
      if (extractingTimer) {
        clearTimeout(extractingTimer);
        extractingTimer = null;
      }
    };

    // Lo guardamos también fuera del state porque el catch necesita el id
    // sin esperar a que el setter de React se aplique.
    let createdPendingPdfId: string | null = null;

    try {
      if (!user) {
        setProcessingError('Debes iniciar sesión para subir archivos.');
        setProcessingStage('error');
        return;
      }

      // Etapa 1: Subir PDF a Supabase Storage
      const { path, error: uploadError } = await uploadPDF(file, user.id);
      if (uploadError || !path) {
        setProcessingError('Error al subir el PDF: ' + (uploadError || 'Sin ruta'));
        setProcessingStage('error');
        return;
      }
      console.log('✅ PDF subido a storage:', path);

      // Registrar el PDF en pending_pdfs y capturar su id
      const { data: pendingPdf, error: insertError } = await supabase
        .from('pending_pdfs')
        .insert({
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          user_id: user.id,
          processed: false,
          status: 'uploaded',
        })
        .select('id')
        .single();

      if (insertError || !pendingPdf?.id) {
        console.error('Error saving pending PDF:', insertError);
        setProcessingError('Error al registrar el PDF. Por favor, inténtalo de nuevo.');
        setProcessingStage('error');
        return;
      }
      const pendingPdfId = pendingPdf.id as string;
      createdPendingPdfId = pendingPdfId;
      setTrackedPendingPdfId(pendingPdfId);
      console.log('✅ PDF registrado en pending_pdfs:', pendingPdfId);

      // Etapa 2: Enviar a n8n (incluyendo el pendingPdfId para que pueda
      // hacer callbacks a update-pdf-status durante el flujo).
      setProcessingStage('sending');
      await supabase
        .from('pending_pdfs')
        .update({ status: 'sent_to_n8n' })
        .eq('id', pendingPdfId);

      scheduleFallbackStages();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('pendingPdfId', pendingPdfId);
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'SANALADAS_HUB_PDF');

      console.log('📤 Enviando PDF a N8N:', { fileName: file.name, fileSize: file.size, pendingPdfId });

      const webhookUrl =
        import.meta.env.VITE_N8N_WEBHOOK_URL ||
        'https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload';
      const response = await fetch(webhookUrl, { method: 'POST', body: formData });
      clearFallbackTimers();

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`N8N no devolvió JSON válido. Respuesta: ${responseText.substring(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(result?.details || result?.error || `Error HTTP ${response.status}`);
      }
      if (result?.success === false) {
        throw new Error(result?.details || result?.error || result?.message || 'Error procesando el pedido');
      }

      console.log('✅ Pedido creado por n8n:', result);

      // Refrescamos para que la realtime + manual fetch traigan el pedido nuevo
      await refreshOrders(false);

      const newOrderId: string | undefined = result?.orderId || result?.order_id;
      if (newOrderId) {
        setPendingNewOrderId(newOrderId);
      }

      // No fijamos 'completed' aquí — la edge function receive-order ya marca
      // status='completed' y la suscripción Realtime moverá el stepper al
      // último paso. Si por algún motivo no llega, el efecto de fallback lo
      // cierra tras unos segundos.
    } catch (err: any) {
      console.error('Error processing PDF with webhook:', err);
      clearFallbackTimers();
      setProcessingError(err?.message || 'Error desconocido procesando el PDF.');
      setProcessingStage('error');

      // Best-effort: marcar el pending_pdf como 'failed' si tenemos su id
      if (createdPendingPdfId) {
        void supabase
          .from('pending_pdfs')
          .update({ status: 'failed', error_message: err?.message ?? 'unknown error' })
          .eq('id', createdPendingPdfId);
      }
    }
  }, [user, refreshOrders]);

  const handleCancelProcessing = useCallback(() => {
    setProcessingStage(null);
    setProcessingError(undefined);
    setProcessingFileName(undefined);
    setProcessingStartedAt(null);
    setPendingNewOrderId(null);
    setTrackedPendingPdfId(null);
  }, []);

  const handleRetryProcessing = useCallback(() => {
    if (currentPdfFile) {
      void handleWebhookUpload(currentPdfFile);
    } else {
      handleCancelProcessing();
    }
  }, [currentPdfFile, handleWebhookUpload, handleCancelProcessing]);

  const handleReset = useCallback(() => {
    setExtractedData(null);
    setCurrentOrderId(null);
    setCurrentPdfFile(null);
    setError(null);
  }, []);

  const handleSelectOrder = useCallback((order: Order) => {
    console.log('📋 Selecting order:', order.id);
    setExtractedData(order.data);
    setCurrentOrderId(order.id);
    setCurrentPdfFile(null);
    setActiveTab('upload');
  }, []);

  // Suscripción Realtime al pending_pdf que estamos procesando. Cada vez que
  // n8n llama a la edge function update-pdf-status, esta fila cambia y aquí
  // mapeamos el status a la etapa del stepper para tener checkpoints reales.
  useEffect(() => {
    if (!trackedPendingPdfId) return;

    const STATUS_TO_STAGE: Record<string, ProcessingStage> = {
      uploaded: 'uploading',
      sent_to_n8n: 'sending',
      received_by_llamaindex: 'received_by_llamaindex',
      extracting_ai: 'extracting',
      creating_order: 'creating',
      completed: 'completed',
      failed: 'error',
    };

    const applyStatus = (row: any) => {
      if (!row) return;
      const stage = STATUS_TO_STAGE[row.status as string];
      if (!stage) return;
      setProcessingStage((prev) => {
        // No retroceder de etapas ya superadas (p.ej. si llega un evento viejo)
        const order: ProcessingStage[] = [
          'uploading',
          'sending',
          'received_by_llamaindex',
          'extracting',
          'creating',
          'completed',
        ];
        if (stage === 'error') return 'error';
        if (!prev || prev === 'error') return stage;
        return order.indexOf(stage) >= order.indexOf(prev) ? stage : prev;
      });
      if (row.status === 'failed' && row.error_message) {
        setProcessingError(row.error_message);
      }
    };

    // Carga inicial por si el primer evento ya ocurrió antes de suscribirnos.
    void supabase
      .from('pending_pdfs')
      .select('status, error_message')
      .eq('id', trackedPendingPdfId)
      .maybeSingle()
      .then(({ data }) => applyStatus(data));

    const channel = supabase
      .channel(`pending_pdf_${trackedPendingPdfId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_pdfs',
          filter: `id=eq.${trackedPendingPdfId}`,
        },
        (payload) => {
          console.log('🔔 pending_pdf realtime update:', payload.new);
          applyStatus(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackedPendingPdfId]);

  // Cuando llega el pedido nuevo (vía realtime tras n8n), navegamos automáticamente
  // a su vista en cuanto aparece en la lista de orders.
  useEffect(() => {
    if (!pendingNewOrderId) return;
    const newOrder = orders.find((o) => o.id === pendingNewOrderId);
    if (!newOrder) return;

    const navigateTimer = setTimeout(() => {
      setExtractedData(newOrder.data);
      setCurrentOrderId(newOrder.id);
      setActiveTab('upload');
      setPendingNewOrderId(null);
      setProcessingStage(null);
      setProcessingError(undefined);
      setProcessingFileName(undefined);
      setProcessingStartedAt(null);
      setTrackedPendingPdfId(null);
    }, 1500);

    return () => clearTimeout(navigateTimer);
  }, [pendingNewOrderId, orders, setCurrentOrderId, setActiveTab]);

  // Fallback: si la respuesta de n8n no trajo orderId pero el procesamiento se
  // marcó como completado, cerramos el progreso tras unos segundos (la realtime
  // ya habrá refrescado la lista de pedidos).
  useEffect(() => {
    if (processingStage !== 'completed' || pendingNewOrderId) return;
    const t = setTimeout(() => {
      setProcessingStage(null);
      setProcessingError(undefined);
      setProcessingFileName(undefined);
      setProcessingStartedAt(null);
      setTrackedPendingPdfId(null);
    }, 2000);
    return () => clearTimeout(t);
  }, [processingStage, pendingNewOrderId]);

  // Sincronizar extractedData cuando el pedido actual cambia en Realtime
  useEffect(() => {
    if (!currentOrderId) return;

    const currentOrder = orders.find(o => o.id === currentOrderId);
    if (currentOrder && currentOrder.data) {
      // Solo actualizar si los datos realmente cambiaron
      const newDataString = JSON.stringify(currentOrder.data);
      const currentDataString = JSON.stringify(extractedData);

      if (newDataString !== currentDataString) {
        console.log('🔄 Syncing extracted data from realtime update');
        setExtractedData(currentOrder.data);
      }
    }
  }, [orders, currentOrderId, extractedData]);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    try {
      await deleteOrder(orderId);

      if (currentOrderId === orderId) {
        setExtractedData(null);
        setCurrentOrderId(null);
      }
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  }, [deleteOrder, currentOrderId]);

  const updateOrderCompletion = useCallback(async (orderId: string, tableware: number, products: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      console.log('📊 Updating completion status...');
      await withHangGuard(
        supabase
          .from('orders')
          .update({
            completion_status: {
              ...order.completionStatus,
              tableware,
              products
            }
          })
          .eq('id', orderId),
        'updateOrderCompletion'
      );

      console.log('✅ Completion updated - Realtime will sync');
      // No necesitamos refreshOrders() - Realtime lo manejará
    } catch (err) {
      console.error('❌ Error updating completion:', err);
    }
  }, [orders]);

  const handleAddComment = useCallback(async (orderId: string, text: string) => {
    try {
      console.log('💬 Adding comment to order...');
      const { data, error } = await withHangGuard(
        supabase
          .from('order_comments')
          .insert({
            order_id: orderId,
            text,
            user_id: user?.id
          })
          .select(),
        'addComment'
      );

      if (error) {
        console.error('❌ Error adding comment:', error);
        alert('Error al agregar comentario: ' + error.message);
        return;
      }

      console.log('✅ Comment added successfully:', data);

      // Dar tiempo al realtime para actualizar, luego hacer refresh manual por seguridad
      setSafeTimeout(() => {
        refreshOrders(false);
      }, 500);
    } catch (err) {
      console.error('❌ Error adding comment:', err);
      alert('Error al agregar comentario. Por favor, inténtalo de nuevo.');
    }
  }, [user?.id, refreshOrders, setSafeTimeout]);

  const handleDeleteComment = useCallback(async (orderId: string, commentId: string) => {
    try {
      console.log('🗑️ Deleting comment...');
      const { error } = await withHangGuard(
        supabase
          .from('order_comments')
          .delete()
          .eq('id', commentId),
        'deleteComment'
      );

      if (error) {
        console.error('❌ Error deleting comment:', error);
        alert('Error al eliminar comentario: ' + error.message);
        return;
      }

      console.log('✅ Comment deleted successfully');

      // Dar tiempo al realtime para actualizar, luego hacer refresh manual por seguridad
      setSafeTimeout(() => {
        refreshOrders(false);
      }, 500);
    } catch (err) {
      console.error('❌ Error deleting comment:', err);
      alert('Error al eliminar comentario. Por favor, inténtalo de nuevo.');
    }
  }, [refreshOrders, setSafeTimeout]);


  // Mostrar loading mientras se inicializa la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
            <img
              src="/sanaladas-logo-new.png"
              alt="SANALADAS HUB Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Cargando SANALADAS HUB
          </h2>
          <p className="text-slate-500">
            Inicializando aplicación...
          </p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de autenticación si no hay usuario
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Procesar PDF</span>
                </div>
              </button>
            )}
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>Pedidos</span>
                {orders.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5">
                    {orders.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Calendario</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('todays-orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'todays-orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Pedidos de Hoy</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'library' || activeTab === 'inventory' || activeTab === 'recipes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Biblioteca</span>
              </div>
            </button>
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('ai-agent')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'ai-agent'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>Agente de IA</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('webhook-logs')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'webhook-logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Logs Webhook</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </div>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className={`w-full px-2 sm:px-4 lg:px-6 ${activeTab === 'calendar' ? 'py-2 sm:py-3' : 'py-4 sm:py-6'}`}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3 text-red-700">
            {error}
          </div>
        )}

        {/* Orders Tab */}
        <div className={activeTab === 'orders' ? 'block' : 'hidden'}>
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-slate-900">Lista de Pedidos</h2>
            <p className="text-slate-600">
              {orders?.length ?? 0} pedido{(orders?.length ?? 0) !== 1 ? 's' : ''} procesado{(orders?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <OrdersList
            orders={orders}
            onSelectOrder={handleSelectOrder}
            onDeleteOrder={handleDeleteOrder}
            onRefreshOrders={refreshOrders}
          />
        </div>

        {/* Calendar Tab */}
        <div className={activeTab === 'calendar' ? 'block relative z-50' : 'hidden'}>
          <Calendar
            orders={orders}
            onSelectOrder={handleSelectOrder}
          />
        </div>

        {/* Todays Orders Tab */}
        <div className={activeTab === 'todays-orders' ? 'block' : 'hidden'}>
          <TodaysOrders
            orders={orders}
            onSelectOrder={handleSelectOrder}
          />
        </div>

        {/* Library Tab */}
        <div className={activeTab === 'library' || activeTab === 'inventory' || activeTab === 'recipes' ? 'block' : 'hidden'}>
          <div className="space-y-3">
            {/* Sub-tabs for Library */}
            <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('library')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>Packaging</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Productos</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'recipes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span>Recetario</span>
                </div>
              </button>
            </div>

            {/* Content */}
            <div style={{ display: activeTab === 'library' ? 'block' : 'none' }}>
              <PackagingLibrary />
            </div>
            <div style={{ display: activeTab === 'inventory' ? 'block' : 'none' }}>
              <ProductsInventory />
            </div>
            <div style={{ display: activeTab === 'recipes' ? 'block' : 'none' }}>
              <RecipeBook />
            </div>
          </div>
        </div>

        {/* AI Agent Tab */}
        <div className={activeTab === 'ai-agent' ? 'block' : 'hidden'}>
          <AIConversational />
        </div>

        {/* Webhook Logs Tab */}
        <div className={activeTab === 'webhook-logs' ? 'block' : 'hidden'}>
          <WebhookLogs />
        </div>

        {/* Users Tab */}
        <div className={activeTab === 'users' ? 'block' : 'hidden'}>
          <UserManagement />
        </div>

        {/* Upload Tab */}
        <div className={activeTab === 'upload' ? 'block' : 'hidden'}>
          {processingStage ? (
            <PdfProcessingProgress
              currentStage={processingStage}
              fileName={processingFileName}
              errorMessage={processingError}
              startedAt={processingStartedAt}
              onRetry={handleRetryProcessing}
              onCancel={handleCancelProcessing}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : currentOrderId && !extractedData && ordersLoading ? (
            // Tras un reload tenemos currentOrderId restaurado de sessionStorage
            // pero los pedidos aún no han cargado. Mostramos loading en vez del
            // FileUploader para evitar el flash de "Procesar PDF".
            <LoadingState
              isWebhookProcessing={false}
              progress="Restaurando pedido..."
            />
          ) : !extractedData ? (
            <div>
              <div className="mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Procesar PDF</h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Sube un PDF de pedido de catering para extraer información estructurada con IA
                </p>
              </div>

              <FileUploader
                onWebhookUpload={handleWebhookUpload}
              />
            </div>
          ) : (
            <DataVisualizer
              data={extractedData}
              onReset={handleReset}
              orderId={currentOrderId}
              order={currentOrderId ? orders.find(o => o.id === currentOrderId) : undefined}
              onUpdateCompletion={updateOrderCompletion}
              comments={currentOrderId ? orders.find(o => o.id === currentOrderId)?.comments || [] : []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              pdfFile={currentPdfFile}
              userId={user?.id}
            />
          )}
        </div>
      </div>

    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;