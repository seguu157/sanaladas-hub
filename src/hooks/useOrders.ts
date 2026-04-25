import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Order, ExtractedData } from '../types';
import { usePageVisibility } from './usePageVisibility';

export const useOrders = (userId: string | undefined) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);

  const loadOrders = useCallback(async (showLoading = true) => {
    if (!userId || !mountedRef.current) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('📦 Loading orders...');

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          file_name,
          upload_date,
          created_at,
          extracted_data,
          completion_status,
          pdf_file_path,
          pdf_file_size,
          pdf_original_name,
          order_name,
          order_color,
          order_colors,
          order_comments(id, text, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
        .abortSignal(AbortSignal.timeout(15000));

      if (!mountedRef.current) {
        console.log('⚠️ Component unmounted, aborting order load');
        return;
      }

      if (ordersError) {
        throw ordersError;
      }

      console.log(`✅ Loaded ${ordersData?.length || 0} orders`);
      (window as any).__lastDataActivityAt = Date.now();

      const formattedOrders: Order[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        fileName: order.file_name,
        uploadDate: new Date(order.upload_date || order.created_at),
        pdfFilePath: order.pdf_file_path,
        pdfFileSize: order.pdf_file_size,
        pdfOriginalName: order.pdf_original_name,
        orderName: order.order_name,
        orderColor: order.order_color,
        orderColors: order.order_colors || (order.order_color ? [order.order_color] : undefined),
        data: order.extracted_data as ExtractedData,
        completionStatus: order.completion_status || {
          tableware: 0,
          products: 0,
          totalTableware: 0,
          totalProducts: 0
        },
        comments: (order.order_comments || []).map((comment: any) => ({
          id: comment.id,
          text: comment.text,
          timestamp: new Date(comment.created_at)
        }))
      }));

      setOrders(formattedOrders);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error loading orders:', err);
      if (mountedRef.current) {
        setError(err.message || 'Error al cargar los pedidos');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  const setupRealtimeChannel = useCallback(() => {
    if (!userId || !mountedRef.current) return;

    console.log('📡 Setting up realtime channel for orders');

    const refreshOrdersData = async () => {
      if (!mountedRef.current) return;
      console.log('🔄 Realtime triggered refresh');
      await loadOrders(false);
    };

    const channel = supabase
      .channel('orders_and_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          if (!mountedRef.current) return;
          console.log('🔔 Orders realtime update:', payload.eventType, payload.new?.id || payload.old?.id);
          await refreshOrdersData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_comments'
        },
        async (payload) => {
          if (!mountedRef.current) return;
          console.log('💬 Comments realtime update:', payload.eventType, payload.new?.id || payload.old?.id);
          await refreshOrdersData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Orders & Comments channel status:', status);
        if (status === 'SUBSCRIBED') {
          (window as any).__lastDataActivityAt = Date.now();
        }
      });

    channelRef.current = channel;
  }, [userId, loadOrders]);

  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      setLoading(false);
      return;
    }

    loadOrders();
    setupRealtimeChannel();

    return () => {
      console.log('🧹 Cleaning up orders hook');
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, loadOrders, setupRealtimeChannel]);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteError) {
        throw deleteError;
      }

      if (mountedRef.current) {
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!userId || !mountedRef.current) return;

      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting orders realtime after being hidden...');

        // Refrescar sesión: en background el auto-refresh del JWT puede
        // haber sido throttled por el navegador, así que el token podría
        // estar caducado. refreshSession() es no-op si todavía es válido.
        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          console.warn('⚠️ Session refresh failed on wake:', e);
        }

        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        await loadOrders(false);

        // Reconnect realtime channel
        setupRealtimeChannel();

        console.log('✅ Orders realtime reconnected');
      }
    }, [userId, loadOrders, setupRealtimeChannel])
  });

  return {
    orders,
    loading,
    error,
    deleteOrder,
    refreshOrders: loadOrders
  };
};
