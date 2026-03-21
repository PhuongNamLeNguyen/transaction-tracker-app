import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.ts";

/*
  PublicRoute — bảo vệ các trang công khai (login, register).
  - loading         → không render gì (ProtectedRoute đã xử lý loading screen)
  - authenticated   → redirect về trang gốc muốn vào, hoặc về /
  - unauthenticated → render trang (login / register)
*/
export const PublicRoute = () => {
    const { status } = useAuth();
    const location = useLocation();

    // Lấy trang mà user muốn vào trước khi bị redirect về /login
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

    if (status === "loading") return null; // LoadingScreen do ProtectedRoute xử lý

    if (status === "authenticated") {
        return <Navigate to={from} replace />;
    }

    return <Outlet />;
};
