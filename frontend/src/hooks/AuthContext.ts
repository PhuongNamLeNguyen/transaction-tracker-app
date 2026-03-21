import { createContext } from "react";

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    isVerified: boolean;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
    user: AuthUser | null;
    status: AuthStatus;
    /** null = unknown (still checking), true = done, false = needs onboarding */
    isOnboarded: boolean | null;
    login: (user: AuthUser) => void;
    logout: () => Promise<void>;
    completeOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
