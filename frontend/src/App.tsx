import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/hooks/AuthProvider";
import { router } from "./router";
import "./styles/global.css";

export default function App() {
    return (
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    );
}
