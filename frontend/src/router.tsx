import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { PublicRoute } from "@/components/common/PublicRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { BudgetPage } from "@/pages/BudgetPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { ReceiptReviewPage } from "@/pages/ReceiptReviewPage";
import { DeletedTransactionsPage } from "@/pages/DeletedTransactionsPage";
import { OAuthCallbackPage } from "@/pages/OAuthCallbackPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";

/*
  Route structure:
  /login, /register     → PublicRoute  (đã login rồi → redirect về /)
  /, /onboarding, ...   → ProtectedRoute (chưa login → redirect về /login)
                          (chưa onboard → redirect về /onboarding)
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
            { path: "/onboarding",    element: <OnboardingPage /> },
            { path: "/",              element: <DashboardPage /> },
            { path: "/transactions",  element: <TransactionsPage /> },
            { path: "/plans",         element: <BudgetPage /> },
            { path: "/settings",          element: <SettingsPage /> },
            { path: "/add-transaction",   element: <AddTransactionPage /> },
            { path: "/receipt-review",         element: <ReceiptReviewPage /> },
            { path: "/deleted-transactions",   element: <DeletedTransactionsPage /> },
            // Các route sau sẽ thêm dần theo từng feature:
            // { path: '/transactions/:id', element: <TransactionDetailPage /> },
            // { path: '/accounts',         element: <AccountsPage /> },
            // { path: '/plans',            element: <PlansPage /> },
            // { path: '/settings',         element: <SettingsPage /> },
        ],
    },

    /* ── OAuth callback — outside auth guards, handles token from hash fragment ── */
    { path: "/oauth/callback", element: <OAuthCallbackPage /> },

    /* ── Email verification — public, accessed via link in email ── */
    { path: "/verify-email", element: <VerifyEmailPage /> },

    /* ── Fallback ── */
    { path: "*", element: <Navigate to="/" replace /> },
]);
