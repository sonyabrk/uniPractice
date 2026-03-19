import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';

function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await apiClient.post('/auth/login', { email, password });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userRole', data.user.role);
            onLogin(data.user.role);
            navigate('/products');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        }
    };

    return (
        <div style={{ flex: 1, position: 'relative', minHeight: 'calc(100vh - 60px)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="auth-container">
                <h2>Вход в систему</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="submit">Войти</button>
                </form>
                <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
            </div>
        </div>
    );
}

export default Login;