import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';

function Users() {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ first_name: '', last_name: '', role: 'user' });

    const fetchUsers = useCallback(async () => {
        try {
            const res = await apiClient.get('/users');
            setUsers(res.data.data ?? res.data);
        } catch (err) {
            console.error('Ошибка загрузки пользователей', err);
            alert('Ошибка загрузки пользователей');
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({ first_name: user.first_name, last_name: user.last_name, role: user.role });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await apiClient.put(`/users/${editingUser.id}`, formData);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            console.log(err);
            alert('Ошибка обновления пользователя');
        }
    };

    const handleBlock = async (id) => {
        if (window.confirm('Заблокировать пользователя?')) {
            try {
                await apiClient.delete(`/users/${id}`);
                fetchUsers();
            } catch (err) {
                console.log(err);
                alert('Ошибка блокировки');
            }
        }
    };

    return (
        <div className="products-container">
            <h2>Управление пользователями</h2>

            {editingUser && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Редактировать пользователя</h3>
                        <form onSubmit={handleUpdate}>
                            <input
                                type="text"
                                placeholder="Имя"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Фамилия"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="user">user</option>
                                <option value="seller">seller</option>
                                <option value="admin">admin</option>
                            </select>
                            <div className="modal-actions">
                                <button type="submit">Сохранить</button>
                                <button type="button" onClick={() => setEditingUser(null)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>Имя</th>
                        <th>Фамилия</th>
                        <th>Email</th>
                        <th>Роль</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} className={u.isBlocked ? 'blocked-row' : ''}>
                            <td>{u.first_name}</td>
                            <td>{u.last_name}</td>
                            <td>{u.email}</td>
                            <td><span className={`role-tag role-tag--${u.role}`}>{u.role}</span></td>
                            <td>{u.isBlocked ? '🚫 Заблокирован' : '✅ Активен'}</td>
                            <td>
                                {!u.isBlocked && (
                                    <>
                                        <button onClick={() => handleEdit(u)}>Изменить</button>
                                        <button onClick={() => handleBlock(u.id)} className="delete-btn">Блок</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>Пользователи не найдены</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default Users;