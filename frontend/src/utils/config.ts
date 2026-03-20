export const config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,
    env: import.meta.env.VITE_ENV as "development" | "production" | "test",
    isDev: import.meta.env.VITE_ENV === "development",
};
