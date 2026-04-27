import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Products from './components/Products';
import Users from './components/Users';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const role = localStorage.getItem('userRole');
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setIsAuthenticated(!!token);
        setUserRole(role);
        setIsLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setUserRole(null);
    };

    const handleLogin = (role) => {
        setIsAuthenticated(true);
        setUserRole(role);
    };

    if (isLoading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <BrowserRouter>
            <div className="App">
                <nav className="navbar">
                    <h1>Product Manager</h1>
                    {isAuthenticated && (
                        <div className="nav-right">
                            <span className="role-badge role-badge--{userRole}">{userRole}</span>
                            {userRole === 'admin' && (
                                <a href="/users" className="nav-link">Пользователи</a>
                            )}
                            <a href="/products" className="nav-link">Товары</a>
                            <button onClick={handleLogout} className="logout-btn">Выйти</button>
                        </div>
                    )}
                </nav>
                <Routes>
                    <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/products" />} />
                    <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/products" />} />
                    <Route path="/products" element={isAuthenticated ? <Products userRole={userRole} /> : <Navigate to="/login" />} />
                    <Route path="/users" element={isAuthenticated && userRole === 'admin' ? <Users /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/products" : "/login"} />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;