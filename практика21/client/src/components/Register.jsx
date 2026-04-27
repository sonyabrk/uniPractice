import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';

function Register() {
    const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'user' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/auth/register', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка регистрации');
        }
    };

    return (
        <div style={{ flex: 1, position: 'relative', minHeight: 'calc(100vh - 60px)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="auth-container">
                <h2>Регистрация</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Имя" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} required />
                    <input type="text" placeholder="Фамилия" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} required />
                    <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    <input type="password" placeholder="Пароль" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                        <option value="user">Пользователь (user)</option>
                        <option value="seller">Продавец (seller)</option>
                        <option value="admin">Администратор (admin)</option>
                    </select>
                    <button type="submit">Зарегистрироваться</button>
                </form>
                <p>Есть аккаунт? <Link to="/login">Войти</Link></p>
            </div>
        </div>
    );
}

export default Register;