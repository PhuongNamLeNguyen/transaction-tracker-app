import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { PublicRoute } from "@/components/common/PublicRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";

/*
  Route structure:
  /login, /register     → PublicRoute  (đã login rồi → redirect về /)
  /, /transactions, ... → ProtectedRoute (chưa login → redirect về /login)
*/
export const router = createBrowserRouter([
    /* ── Public routes (chỉ truy cập khi chưa đăng nhập) ── */
    {
        element: <PublicRoute />,
        children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/register", element: <RegisterPage /> },
        ],
    },

    /* ── Protected routes (phải đăng nhập) ── */
    {
        element: <ProtectedRoute />,
        children: [
            { path: "/", element: <DashboardPage /> },
            // Các route sau sẽ thêm dần theo từng feature:
            // { path: '/transactions',     element: <TransactionsPage /> },
            // { path: '/transactions/:id', element: <TransactionDetailPage /> },
            // { path: '/accounts',         element: <AccountsPage /> },
            // { path: '/budgets',          element: <BudgetsPage /> },
            // { path: '/settings',         element: <SettingsPage /> },
        ],
    },

    /* ── Fallback ── */
    { path: "*", element: <Navigate to="/" replace /> },
]);
