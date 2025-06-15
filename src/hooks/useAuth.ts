import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthState } from '../types';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('❌ Session error:', error);
          setAuthState({ user: null, loading: false, error: error.message });
          return;
        }

        if (session?.user) {
          console.log('✅ Session found, user:', session.user.id);
          
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
          };

          setAuthState({ user, loading: false, error: null });
        } else {
          console.log('ℹ️ No session found');
          setAuthState({ user: null, loading: false, error: null });
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (mounted) {
          setAuthState({ 
            user: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Authentication failed'
          });
        }
      }
    };

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && authState.loading) {
        console.warn('⚠️ Auth timeout - forcing loading to false');
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Authentication timeout. Please refresh the page.' 
        }));
      }
    }, 10000); // 10 second timeout

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;

        // Clear timeout when auth state changes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
          };
          setAuthState({ user, loading: false, error: null });
        } else if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, loading: false, error: null });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed successfully');
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
          };
          setAuthState({ user, loading: false, error: null });
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email);
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      console.log('✅ Sign in successful:', data.user?.id);
      // The auth state change listener will handle setting the user
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign in failed',
        loading: false,
      }));
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('❌ Sign out exception:', error);
    }
  };

  return {
    ...authState,
    signIn,
    signOut,
  };
}