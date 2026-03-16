import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'student' | 'supervisor' | 'pending_supervisor' | 'admin';
    avatar_url: string | null;
    title: string | null;
    school: string | null;
    nickname: string | null;
    student_identity: 'undergraduate' | 'master' | 'phd' | 'other' | null;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (_userId: string): Promise<Profile | null> => {
        // Use security definer RPC to avoid RLS self-reference recursion
        const { data, error } = await supabase.rpc('get_my_profile');
        if (error) {
            console.error('fetchProfile error:', error.message);
            return null;
        }
        return (data?.[0] ?? null) as Profile | null;
    };

    useEffect(() => {
        let mounted = true;

        // Single source of truth: onAuthStateChange handles all session events
        // including INITIAL_SESSION (fired on page load with existing session)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // While profile is being fetched, keep loading=true to prevent
                // premature routing (avoids flash of wrong view)
                if (session?.user) setLoading(true);

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    const p = await fetchProfile(session.user.id);
                    if (mounted) setProfile(p);
                } else {
                    setProfile(null);
                }

                if (mounted) setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (
        email: string,
        password: string,
        metadata: Record<string, string>
    ) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        return { error };
    };

    const refreshProfile = async () => {
        if (user) {
            const p = await fetchProfile(user.id);
            if (p) setProfile(p);
        }
    };

    const signOut = async () => {
        // Clear local state immediately for instant UI response, then sign out in background
        setUser(null);
        setProfile(null);
        setSession(null);
        supabase.auth.signOut(); // fire-and-forget
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error };
    };

    return (
        <AuthContext.Provider value={{
            user, profile, session, loading,
            signIn, signUp, signOut, resetPassword, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
