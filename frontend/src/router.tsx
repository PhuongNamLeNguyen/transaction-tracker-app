import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
    { path: "/login", element: <div>Login</div> },
    { path: "/register", element: <div>Register</div> },
    { path: "/", element: <div>Dashboard</div> },
]);
