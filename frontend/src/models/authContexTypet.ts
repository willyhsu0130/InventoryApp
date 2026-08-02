export type AuthContextType = {
    username: string;
    token: string | null;
    loginToken: (token: string, username: string) => void;
    logoutToken: () => void;
    isAuthenticated: boolean;
    checkAuth: () => boolean;
};