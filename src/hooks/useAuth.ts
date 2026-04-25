import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener el perfil del usuario
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured || !supabase) {
      // Crear perfil temporal en modo offline
      const tempProfile: UserProfile = {
        id: userId,
        full_name: user?.full_name || 'Usuario Temporal',
        role: 'admin', // Dar rol de admin en modo offline
        avatar_url: null,
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return tempProfile;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Si no existe el perfil, crearlo
      if (!data) {
        return await createUserProfile(userId);
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Función para crear perfil de usuario manualmente
  const createUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: user?.full_name || '',
          role: 'user',
          avatar_url: ''
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      return null;
    }
  };

  // Función para inicializar la sesión
  const initializeAuth = async () => {
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      // Modo offline - verificar si hay usuario guardado localmente
      const savedUser = localStorage.getItem('offline-user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // Crear perfil temporal
          const tempProfile: UserProfile = {
            id: userData.id,
            full_name: userData.full_name || 'Usuario Offline',
            role: 'admin',
            avatar_url: null,
            organization_id: '00000000-0000-0000-0000-000000000001',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(tempProfile);
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('offline-user');
        }
      }
      setLoading(false);
      return;
    }

    try {
      // Obtener sesión actual
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          role: session.user.user_metadata?.role
        };

        setUser(userData);

        // Obtener perfil
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      }

      // Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string, session: any) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name,
              role: session.user.user_metadata?.role
            };
            
            setUser(userData);
            
            // Obtener perfil
            const userProfile = await fetchUserProfile(session.user.id);
            setProfile(userProfile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
        }
      );

      setLoading(false);
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }
  };

  // Función para iniciar sesión
  const signIn = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo offline - permitir cualquier login
      const offlineUser: User = {
        id: `offline-${Date.now()}`,
        email: email,
        full_name: email.split('@')[0],
        role: 'admin'
      };
      
      setUser(offlineUser);
      localStorage.setItem('offline-user', JSON.stringify(offlineUser));
      
      // Crear perfil temporal
      const tempProfile: UserProfile = {
        id: offlineUser.id,
        full_name: offlineUser.full_name || 'Usuario Offline',
        role: 'admin',
        avatar_url: null,
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(tempProfile);
      
      return { user: offlineUser, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role
        };
        
        setUser(userData);
        
        // Obtener perfil
        const userProfile = await fetchUserProfile(data.user.id);
        setProfile(userProfile);
        
        return { user: userData, error: null };
      }

      return { user: null, error: 'Error desconocido al iniciar sesión' };
    } catch (error: any) {
      console.error('Error in signIn:', error);
      return { user: null, error: error.message || 'Error de conexión' };
    }
  };

  // Función para registrarse
  const signUp = async (email: string, password: string, fullName?: string): Promise<{ user: User | null; error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo offline - crear usuario temporal
      const offlineUser: User = {
        id: `offline-${Date.now()}`,
        email: email,
        full_name: fullName || email.split('@')[0],
        role: 'user'
      };
      
      setUser(offlineUser);
      localStorage.setItem('offline-user', JSON.stringify(offlineUser));
      
      // Crear perfil temporal
      const tempProfile: UserProfile = {
        id: offlineUser.id,
        full_name: offlineUser.full_name || 'Usuario Offline',
        role: 'user',
        avatar_url: null,
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(tempProfile);
      
      return { user: offlineUser, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || ''
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          role: 'user'
        };
        
        // Crear el perfil manualmente después del registro exitoso
        if (data.user.email_confirmed_at || data.user.confirmed_at) {
          // Usuario confirmado inmediatamente, crear perfil
          await createUserProfile(data.user.id);
        }
        
        return { user: userData, error: null };
      }

      return { user: null, error: 'Error desconocido al registrarse' };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      return { user: null, error: error.message || 'Error de conexión' };
    }
  };

  // Función para cerrar sesión
  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo offline
      setUser(null);
      setProfile(null);
      localStorage.removeItem('offline-user');
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  };

  // Función para actualizar perfil
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: 'No hay usuario autenticado' };
    }

    if (!isSupabaseConfigured || !supabase) {
      // Modo offline - actualizar localmente
      if (profile) {
        const updatedProfile = { ...profile, ...updates, updated_at: new Date().toISOString() };
        setProfile(updatedProfile);
      }
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      // Actualizar estado local
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { error: error.message || 'Error actualizando perfil' };
    }
  };

  // Inicializar autenticación al montar
  useEffect(() => {
    initializeAuth();
  }, []);

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  };
};

export { AuthContext };