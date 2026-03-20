let _token: string | null = null;
export const setToken = (t: string) => {
    _token = t;
};
export const getToken = () => _token;
export const clearToken = () => {
    _token = null;
};
