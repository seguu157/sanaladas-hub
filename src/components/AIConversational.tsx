import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Plus, MessageSquare, Trash2, User, Loader2, AlertCircle, CheckCircle, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { usePageVisibility } from '../hooks/usePageVisibility';
import { useSafeTimeout } from '../hooks/useSafeTimeout';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: 'pending' | 'sent' | 'error';
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastActivity: Date;
  createdAt: Date;
}

const safeStringify = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return '[Error al convertir objeto a texto]';
    }
  }

  return String(value);
};

const extractTextFromResponse = (data: any): string => {
  if (!data) {
    return 'Lo siento, no recibí una respuesta del agente.';
  }

  const responseData = Array.isArray(data) ? data[0] : data;

  if (!responseData) {
    return 'Lo siento, la respuesta del agente está vacía.';
  }

  const possibleFields = [
    'output',
    'response',
    'message',
    'text',
    'reply',
    'answer',
    'result',
    'content',
    'data'
  ];

  for (const field of possibleFields) {
    if (responseData[field]) {
      const value = safeStringify(responseData[field]);
      if (value && value.trim()) {
        return value.trim();
      }
    }
  }

  const stringified = safeStringify(responseData);
  if (stringified && stringified !== '{}' && stringified !== '[]') {
    return stringified;
  }

  return 'Lo siento, no pude procesar la respuesta del agente.';
};

const AIConversational: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedConversationRef = useRef<string | null>(null);
  const conversationsChannelRef = useRef<any>(null);
  const messagesChannelRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);
  const conversationChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setSafeTimeout } = useSafeTimeout();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user || !mountedRef.current) {
      setLoadingConversations(false);
      return;
    }

    console.log('📋 Loading conversations for user:', user.id);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('❌ No active session found');
        setLoadError('Sesión expirada. Por favor, recarga la página.');
        setLoadingConversations(false);
        return;
      }
      console.log('✅ Session verified, fetching conversations...');

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, client_name, client_id, last_activity, created_at')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })
        .limit(50)
        .abortSignal(AbortSignal.timeout(15000));

      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      if (!mountedRef.current) return;

      console.log(`✅ Loaded ${data?.length || 0} conversations`);

      const convs = (data || []).map((conv) => ({
        id: conv.id,
        title: conv.client_name || 'Nueva conversación',
        lastActivity: new Date(conv.last_activity),
        createdAt: new Date(conv.created_at),
        messages: []
      }));

      setConversations(convs);

      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      if (mountedRef.current) {
        const errorMsg = error.name === 'AbortError' || error.name === 'TimeoutError'
          ? 'Tiempo de espera agotado. Verifica tu conexión.'
          : error.message || 'Error al cargar conversaciones';
        setLoadError(errorMsg);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingConversations(false);
      }
    }
  }, [user, activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!mountedRef.current) return;

    if (loadedConversationRef.current === conversationId) {
      console.log(`⏭️  Messages already loaded for: ${conversationId}`);
      return;
    }

    console.log(`📥 Loading messages for conversation: ${conversationId}`);
    setLoadingMessages(true);
    setLoadError(null);
    loadedConversationRef.current = conversationId;

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, text, sender, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500)
        .abortSignal(AbortSignal.timeout(15000));

      if (!mountedRef.current) {
        console.log('⚠️ Component unmounted, aborting message load');
        return;
      }

      if (error) {
        console.error('❌ Database error loading messages:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} messages`);

      const messages = (data || []).map((msg) => ({
        id: msg.id,
        text: safeStringify(msg.text),
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
        status: 'sent' as const
      }));

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, messages } : conv
        )
      );

      setSafeTimeout(() => {
        if (mountedRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }
      }, 50);
    } catch (error: any) {
      console.error('❌ Error loading messages:', error);
      if (mountedRef.current) {
        const errorMsg = error.name === 'AbortError' || error.name === 'TimeoutError'
          ? 'Tiempo de espera agotado. Verifica tu conexión.'
          : error.message || 'Error al cargar los mensajes';
        setLoadError(errorMsg);
        loadedConversationRef.current = null;
      }
    } finally {
      if (mountedRef.current) {
        setLoadingMessages(false);
      }
    }
  }, []);

  const reloadMessages = useCallback(async (conversationId: string) => {
    console.log(`🔄 Force reloading messages for: ${conversationId}`);
    loadedConversationRef.current = null;
    await loadMessages(conversationId);
  }, [loadMessages]);

  const setupConversationsChannel = useCallback(() => {
    if (!user || !mountedRef.current) return;

    if (conversationsChannelRef.current) {
      console.log('🧹 Cleaning up existing conversations channel');
      supabase.removeChannel(conversationsChannelRef.current);
      conversationsChannelRef.current = null;
    }

    console.log('📡 Setting up conversations realtime channel');
    const channel = supabase
      .channel('ai_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!mountedRef.current) return;

          console.log('🔔 Conversation change detected:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newConv = payload.new;
            const conv: Conversation = {
              id: newConv.id,
              title: newConv.client_name || 'Nueva conversación',
              lastActivity: new Date(newConv.last_activity),
              createdAt: new Date(newConv.created_at),
              messages: []
            };

            setConversations((prev) => {
              const exists = prev.some(c => c.id === conv.id);
              if (exists) return prev;
              return [conv, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === updated.id
                  ? {
                      ...conv,
                      title: updated.client_name || conv.title,
                      lastActivity: new Date(updated.last_activity)
                    }
                  : conv
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations((prev) => prev.filter((conv) => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    conversationsChannelRef.current = channel;
  }, [user]);

  const setupMessagesChannel = useCallback((conversationId: string) => {
    if (!mountedRef.current) return;

    if (messagesChannelRef.current) {
      console.log('🧹 Cleaning up existing messages channel');
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }

    console.log(`👂 Setting up realtime listener for: ${conversationId}`);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (!mountedRef.current) return;

          console.log('📨 New message received via realtime');
          const newMsg = payload.new;
          const message: Message = {
            id: newMsg.id,
            text: safeStringify(newMsg.text),
            sender: newMsg.sender as 'user' | 'ai',
            timestamp: new Date(newMsg.created_at),
            status: 'sent'
          };

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId) return conv;

              const messageExists = conv.messages.some(m => m.id === message.id);
              if (messageExists) {
                return conv;
              }

              return {
                ...conv,
                messages: [...conv.messages, message]
              };
            })
          );

          setSafeTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    messagesChannelRef.current = channel;
  }, [scrollToBottom]);

  useEffect(() => {
    mountedRef.current = true;

    if (!user) return;

    console.log('🚀 Component mounted');
    loadedConversationRef.current = null;
    setLoadingMessages(false);

    console.log('📋 Initial load of conversations');
    loadConversations();
    setupConversationsChannel();

    return () => {
      console.log('🧹 Component unmounting - cleaning up');
      mountedRef.current = false;

      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
      if (conversationChangeTimeoutRef.current) {
        clearTimeout(conversationChangeTimeoutRef.current);
        conversationChangeTimeoutRef.current = null;
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }

      loadedConversationRef.current = null;
    };
  }, [user, loadConversations, setupConversationsChannel]);

  // Keep activeConversationIdRef in sync with activeConversationId
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !mountedRef.current) return;

    if (conversationChangeTimeoutRef.current) {
      clearTimeout(conversationChangeTimeoutRef.current);
    }

    conversationChangeTimeoutRef.current = setTimeout(() => {
      console.log(`🔄 Active conversation changed to: ${activeConversationId}`);
      setLoadError(null);
      loadMessages(activeConversationId);
    }, 100);

    return () => {
      if (conversationChangeTimeoutRef.current) {
        clearTimeout(conversationChangeTimeoutRef.current);
      }
    };
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!activeConversationId || isSending || !mountedRef.current) return;

    setupMessagesChannel(activeConversationId);

    return () => {
      if (messagesChannelRef.current) {
        console.log(`🔇 Removing realtime listener for: ${activeConversationId}`);
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [activeConversationId, isSending, setupMessagesChannel]);

  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!user || !mountedRef.current) return null;

    try {
      const clientId = `client_${Date.now()}`;
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          client_name: 'Nueva conversación',
          client_id: clientId,
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!mountedRef.current) return null;

      const newConv: Conversation = {
        id: data.id,
        title: data.client_name || 'Nueva conversación',
        messages: [],
        lastActivity: new Date(data.last_activity),
        createdAt: new Date(data.created_at)
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(data.id);
      loadedConversationRef.current = null;

      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user]);

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));

      if (activeConversationId === conversationId) {
        const remaining = conversations.filter((conv) => conv.id !== conversationId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
        loadedConversationRef.current = null;
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const startEditingTitle = (conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId);
    setEditingTitle(currentTitle);
  };

  const cancelEditingTitle = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const saveConversationTitle = async (conversationId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ client_name: editingTitle.trim() })
        .eq('id', conversationId);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, title: editingTitle.trim() } : conv
        )
      );

      setEditingConversationId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const handleNewConversation = useCallback(async () => {
    if (!user) return;
    await createNewConversation();
    setNewMessage('');
    setSafeTimeout(() => textareaRef.current?.focus(), 100);
  }, [user, createNewConversation, setSafeTimeout]);

  const callAIWebhook = useCallback(async (userMessage: string, conversationId: string): Promise<string> => {
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('https://sanaladas-n8n.lytrap.easypanel.host/webhook/49b250b0-c767-4ecb-a176-5731ebd675ac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          userId: user?.id,
          timestamp: new Date().toISOString()
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Webhook respondió con error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return extractTextFromResponse(data);
    } catch (error: any) {
      console.error('Error calling AI webhook:', error);
      if (error.name === 'AbortError') {
        return 'Solicitud cancelada.';
      }
      return `Lo siento, hubo un error al conectar con el agente de IA: ${error.message}`;
    } finally {
      abortControllerRef.current = null;
    }
  }, [user?.id]);

  const handleSendMessage = useCallback(async () => {
    const messageText = newMessage.trim();

    if (!messageText || isSending || !user || !mountedRef.current) return;

    setNewMessage('');
    setIsSending(true);

    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation();
      if (!convId || !mountedRef.current) {
        setIsSending(false);
        return;
      }
    }

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAiId = `temp-ai-${Date.now()}`;

    try {
      const userMsgLocal: Message = {
        id: tempUserId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        status: 'pending',
      };

      const aiMsgLocal: Message = {
        id: tempAiId,
        text: '...',
        sender: 'ai',
        timestamp: new Date(),
        status: 'pending',
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, userMsgLocal, aiMsgLocal] }
            : c
        )
      );

      setSafeTimeout(scrollToBottom, 100);

      const { data: userMsgData, error: userMsgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: convId,
          text: messageText,
          sender: 'user'
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;
      if (!mountedRef.current) return;

      const aiResponse = await callAIWebhook(messageText, convId);
      if (!mountedRef.current) return;

      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: convId,
          text: aiResponse,
          sender: 'ai'
        })
        .select()
        .single();

      if (aiMsgError) throw aiMsgError;
      if (!mountedRef.current) return;

      await supabase
        .from('ai_conversations')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', convId);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === tempUserId) {
                    return {
                      id: userMsgData.id,
                      text: messageText,
                      sender: 'user' as const,
                      timestamp: new Date(userMsgData.created_at),
                      status: 'sent' as const
                    };
                  }
                  if (m.id === tempAiId) {
                    return {
                      id: aiMsgData.id,
                      text: aiResponse,
                      sender: 'ai' as const,
                      timestamp: new Date(aiMsgData.created_at),
                      status: 'sent' as const
                    };
                  }
                  return m;
                }),
                lastActivity: new Date()
              }
            : c
        )
      );

      setSafeTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);

      if (mountedRef.current) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempAiId
                      ? {
                          ...m,
                          text: `Error: ${err.message || 'No se pudo enviar el mensaje'}`,
                          status: 'error' as const
                        }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsSending(false);
        setSafeTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [newMessage, isSending, user, activeConversationId, createNewConversation, scrollToBottom, callAIWebhook, setSafeTimeout]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  usePageVisibility({
    onVisible: useCallback(async (timeHidden: number) => {
      if (!user || !mountedRef.current) return;

      console.log(`⏰ Page visible after ${Math.round(timeHidden / 1000)}s`);

      // Clear any pending visibility timeouts
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }

      setIsSending(false);
      setLoadError(null);

      // Cancel pending requests
      if (abortControllerRef.current) {
        console.log('⚠️ Aborting pending requests');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (timeHidden > 3000) {
        console.log('🔄 Re-establishing connections after long absence...');

        // Clean up existing channels
        if (conversationsChannelRef.current) {
          supabase.removeChannel(conversationsChannelRef.current);
          conversationsChannelRef.current = null;
        }

        if (messagesChannelRef.current) {
          supabase.removeChannel(messagesChannelRef.current);
          messagesChannelRef.current = null;
        }

        // Reload conversations
        await loadConversations();

        // Small delay before reconnecting
        await new Promise(resolve => setTimeout(resolve, 100));

        setupConversationsChannel();

        // Use ref instead of state to avoid stale closure
        const currentActiveId = activeConversationIdRef.current;
        if (currentActiveId) {
          // Track the timeout
          visibilityTimeoutRef.current = setSafeTimeout(async () => {
            if (mountedRef.current) {
              loadedConversationRef.current = null;
              await loadMessages(currentActiveId);
              setupMessagesChannel(currentActiveId);
            }
            visibilityTimeoutRef.current = null;
          }, 300);
        }
      } else {
        console.log('🔄 Quick refresh after short absence');

        // For short absences, just refresh
        const currentActiveId = activeConversationIdRef.current;
        if (currentActiveId) {
          visibilityTimeoutRef.current = setSafeTimeout(async () => {
            if (mountedRef.current) {
              loadedConversationRef.current = null;
              await loadMessages(currentActiveId);
            }
            visibilityTimeoutRef.current = null;
          }, 300);
        }
      }
    }, [user, loadConversations, loadMessages, setupConversationsChannel, setupMessagesChannel, setSafeTimeout])
  });

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);

  if (!user) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center bg-white rounded-xl shadow-sm">
        <div className="text-center text-slate-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Debes iniciar sesión para usar el agente de IA</p>
        </div>
      </div>
    );
  }

  if (loadingConversations) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm">
        <Loader2 className="h-12 w-12 mb-3 animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando conversaciones...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] flex bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                <Bot className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Agente de IA</h2>
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Conectado</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conversation.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setActiveConversationId(conversation.id);
                    loadedConversationRef.current = null;
                  }}
                >
                  <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingConversationId === conversation.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveConversationTitle(conversation.id);
                            } else if (e.key === 'Escape') {
                              cancelEditingTitle();
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveConversationTitle(conversation.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={cancelEditingTitle}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-slate-800 truncate">
                          {conversation.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {conversation.messages.length} mensaje
                          {conversation.messages.length !== 1 ? 's' : ''} • {' '}
                          {conversation.lastActivity.toLocaleDateString('es-ES')}
                        </p>
                      </>
                    )}
                  </div>
                  {editingConversationId !== conversation.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingTitle(conversation.id, conversation.title);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-500 rounded transition-all"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeConversation ? (
          <>
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{activeConversation.title}</h3>
                  <p className="text-sm text-slate-500">
                    {activeConversation.messages.length} mensaje
                    {activeConversation.messages.length !== 1 ? 's' : ''}
                    {activeConversation.messages.length > 0 && (
                      <span>
                        {' '}
                        • Última actividad: {activeConversation.lastActivity.toLocaleString('es-ES')}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => reloadMessages(activeConversationId!)}
                  disabled={loadingMessages}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Recargar mensajes"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 min-h-0">
              {loadError ? (
                <div className="text-center mt-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-red-800 font-medium mb-2">Error al cargar los mensajes</p>
                  <p className="text-sm text-red-600 mb-4">{loadError}</p>
                  <button
                    onClick={() => reloadMessages(activeConversationId!)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </button>
                </div>
              ) : loadingMessages ? (
                <div className="text-center text-slate-500 mt-8">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-blue-600" />
                  <p>Cargando mensajes...</p>
                </div>
              ) : activeConversation.messages.length === 0 ? (
                <div className="text-center text-slate-500 mt-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Inicia una conversación con el agente de IA</p>
                  <p className="text-sm mt-1">Escribe tu mensaje abajo para comenzar</p>
                </div>
              ) : (
                activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender === 'ai' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                    )}

                    <div
                      className={`max-w-xs lg:max-w-xl px-4 py-3 rounded-2xl ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white shadow-md'
                          : message.status === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-800 shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      {message.text === '...' && message.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-slate-600">Escribiendo...</span>
                        </div>
                      ) : (
                        <>
                          {message.status === 'error' && (
                            <div className="flex items-center gap-1.5 mb-2 text-red-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs font-semibold">Error</span>
                            </div>
                          )}
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                          </div>
                        </>
                      )}
                      <p
                        className={`text-[11px] mt-2 ${
                          message.sender === 'user'
                            ? 'text-blue-100'
                            : message.status === 'error'
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {message.sender === 'user' && (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje aquí..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-[15px] bg-white"
                  rows={1}
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
              <p className="text-sm">O crea una nueva para comenzar a chatear con el agente de IA</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConversational;
