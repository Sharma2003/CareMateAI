import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from './jwtDecode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded) {
                    setUser({ username: decoded.sub, id: decoded.id, role, token });
                } else {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_role');
                }
            } catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_role');
            }
        }
        setLoading(false);
    }, []);

    const login = (token, role) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user_role', role);
        const decoded = jwtDecode(token);
        setUser({ username: decoded.sub, id: decoded.id, role, token });
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
