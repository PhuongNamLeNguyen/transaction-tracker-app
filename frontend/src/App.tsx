import { Component, ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/hooks/AuthProvider";
import { router } from "./router";
import "./styles/global.css";

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <h2>Đã xảy ra lỗi</h2>
                    <p>Vui lòng tải lại trang hoặc liên hệ hỗ trợ.</p>
                    <button onClick={() => window.location.reload()}>Tải lại</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ErrorBoundary>
    );
}
