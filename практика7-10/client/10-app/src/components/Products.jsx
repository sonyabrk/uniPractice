import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import ProductForm from './ProductForm';

function Products() {
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [user, setUser] = useState(null);

    // Объявляем функции ДО useEffect
    const fetchProducts = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/products');
            setProducts(data);
        } catch (err) {
            console.error('Ошибка загрузки товаров', err);
        }
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/auth/me');
            setUser(data);
        } catch (err) {
            console.error('Ошибка загрузки пользователя', err);
        }
    }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchProducts();
        fetchUser();
    }, [fetchProducts, fetchUser]);

    const handleDelete = async (id) => {
        if (window.confirm('Удалить товар?')) {
            try {
                await apiClient.delete(`/products/${id}`);
                fetchProducts();
            } catch (err) {
                console.log(err);
                alert('Ошибка удаления');
            }
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowForm(true);
    };

    const handleFormSubmit = () => {
        setShowForm(false);
        setEditingProduct(null);
        fetchProducts();
    };

    return (
        <div className="products-container">
            <h2>Список товаров</h2>
            {user && <p>Пользователь: {user.first_name} {user.last_name} ({user.email})</p>}
            <button onClick={() => setShowForm(true)} className="add-btn">Добавить товар</button>
            {showForm && <ProductForm product={editingProduct} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit} />}
            <table>
                <thead>
                    <tr>
                        <th>Название</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.title}</td>
                            <td>{p.category}</td>
                            <td>{p.price} ₽</td>
                            <td>
                                <button onClick={() => handleEdit(p)}>Изменить</button>
                                <button onClick={() => handleDelete(p.id)} className="delete-btn">Удалить</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Products;