import { createContext } from "react";

export interface AuthUser {
    id: string;
    email: string;
    isVerified: boolean;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
    user: AuthUser | null;
    status: AuthStatus;
    login: (user: AuthUser) => void;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
