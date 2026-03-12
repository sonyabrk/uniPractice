import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Products from './components/Products';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            setIsAuthenticated(!!token);
            setIsLoading(false);
        };
        
        checkAuth();
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsAuthenticated(false);
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
                        <button onClick={handleLogout} className="logout-btn">Выйти</button>
                    )}
                </nav>
                <Routes>
                    <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/products" />} />
                    <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/products" />} />
                    <Route path="/products" element={isAuthenticated ? <Products /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/products" : "/login"} />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;