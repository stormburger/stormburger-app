import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

interface AuthState {
  user: any | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        api.setToken(session.access_token);
        set({ session, user: session.user, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          api.setToken(session.access_token);
          set({ session, user: session.user });
        } else {
          api.setToken(null);
          set({ session: null, user: null });
        }
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) throw error;

      // Create user profile
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email,
          display_name: name,
          role: 'customer',
        });
        api.setToken(data.session?.access_token || null);
        set({ user: data.user, session: data.session });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      api.setToken(data.session.access_token);
      set({ user: data.user, session: data.session });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithPhone: async (phone) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone, token) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;

      // Create profile if first time
      if (data.user) {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('users').insert({
            id: data.user.id,
            phone,
            display_name: phone,
            role: 'customer',
          });
        }
        api.setToken(data.session?.access_token || null);
        set({ user: data.user, session: data.session });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    api.setToken(null);
    set({ user: null, session: null });
  },
}));
