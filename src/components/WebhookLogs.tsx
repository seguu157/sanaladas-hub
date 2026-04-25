import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { usePageVisibility } from '../hooks/usePageVisibility';

interface WebhookLog {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  created_at: string;
}

export default function WebhookLogs() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const channelRef = useRef<any>(null);

  const fetchLogs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      console.log('Fetching webhook logs...');
      const { data, error: queryError } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) {
        console.error('Query error:', queryError);
        throw queryError;
      }

      console.log('Logs fetched:', data?.length || 0);
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Error al cargar logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Solo cargar una vez
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Timeout de seguridad
    const safetyTimeout = setTimeout(() => {
      console.warn('Loading webhook logs timeout - forcing loading state to false');
      setLoading(false);
    }, 10000);

    const loadLogs = async () => {
      await fetchLogs();
      clearTimeout(safetyTimeout);
    };

    loadLogs();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('webhook_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webhook_logs'
      }, async () => {
        // Silent refresh - actualizar sin loading
        try {
          const { data, error } = await supabase
            .from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (!error) setLogs(data || []);
        } catch (error) {
          console.error('Error in silent refresh:', error);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);

      // Use supabase.removeChannel() for consistency
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchLogs]);

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (timeHidden > 3000) {
        console.log('🔄 Reconnecting realtime for WebhookLogs...');

        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        await fetchLogs();
      }
    }, [fetchLogs])
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Logs de Webhook</h2>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error al cargar logs:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {logs.length === 0 && !error ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">No hay logs de webhook todavía</p>
          <p className="text-sm text-gray-500 mt-2">
            Los webhooks de N8N aparecerán aquí cuando se reciban
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {log.error ? (
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  ) : log.response_status === 200 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-gray-900">{log.method}</span>
                      <span className="text-sm text-gray-500">{log.endpoint}</span>
                      {log.response_status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          log.response_status === 200
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.response_status}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </div>

                    {log.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {log.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedLog?.id === log.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Request Body:</h4>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.body, null, 2)}
                    </pre>
                  </div>

                  {log.response_body && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                        {log.response_body}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
