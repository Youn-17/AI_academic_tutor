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
    profileError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState(false);

    // Fetch profile via SECURITY DEFINER RPC, bounded by a hard timeout so a slow
    // or hung request can never freeze the auth gate (R1 fix).
    const fetchProfile = async (): Promise<Profile | null> => {
        try {
            const result: any = await Promise.race([
                supabase.rpc('get_my_profile'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('profile-timeout')), 12_000)),
            ]);
            if (result?.error) {
                console.error('fetchProfile error:', result.error.message);
                return null;
            }
            return (result?.data?.[0] ?? null) as Profile | null;
        } catch (e) {
            console.error('fetchProfile failed/timeout:', e);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;
        // Safety net: the gate must NEVER stick on the spinner > 10s, even if no
        // auth event arrives (corrupt local token / SDK hiccup) — C2 fix.
        const safety = setTimeout(() => { if (mounted) setLoading(false); }, 10_000);

        const handleSession = async (session: Session | null) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                setProfileError(false);
                try {
                    const p = await fetchProfile();
                    if (!mounted) return;
                    setProfile(p);
                    // resolved but no row → surface an error/retry screen, NOT an endless spinner
                    if (p === null) setProfileError(true);
                } catch {
                    if (mounted) setProfileError(true);
                } finally {
                    if (mounted) setLoading(false);   // always clears the gate
                }
            } else {
                setProfile(null);
                setProfileError(false);
                setLoading(false);
            }
        };

        // Primary: onAuthStateChange fires INITIAL_SESSION on load + all later events.
        // We do NOT re-raise loading on later events (token refresh) — that previously
        // re-locked the whole app on every refresh.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => { handleSession(session); }
        );
        // Bootstrap fallback in case INITIAL_SESSION never fires.
        supabase.auth.getSession()
            .then(({ data }) => { if (mounted && !data.session) setLoading(false); })
            .catch(() => { if (mounted) setLoading(false); });

        return () => {
            mounted = false;
            clearTimeout(safety);
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
            const p = await fetchProfile();
            setProfile(p);
            setProfileError(p === null);
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
            user, profile, session, loading, profileError,
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
