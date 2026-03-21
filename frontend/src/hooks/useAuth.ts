import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/hooks/AuthContext";

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
