import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function ProductForm({ product, onClose, onSubmit }) {
    const [formData, setFormData] = useState({ 
        title: '', 
        category: '', 
        description: '', 
        price: '' 
    });

    useEffect(() => {
        if (product) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setFormData({ 
                title: product.title || '', 
                category: product.category || '', 
                description: product.description || '', 
                price: product.price || '' 
            });
        } else {
            // Сбрасываем форму если product null
            setFormData({ 
                title: '', 
                category: '', 
                description: '', 
                price: '' 
            });
        }
    }, [product]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (product) {
                await apiClient.put(`/products/${product.id}`, formData);
            } else {
                await apiClient.post('/products', formData);
            }
            onSubmit();
        } catch (err) {
            console.log(err);
            alert('Ошибка сохранения');
        }
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <h3>{product ? 'Редактировать' : 'Новый'} товар</h3>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        placeholder="Название" 
                        value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="Категория" 
                        value={formData.category} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    />
                    <textarea 
                        placeholder="Описание" 
                        value={formData.description} 
                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    />
                    <input 
                        type="number" 
                        placeholder="Цена" 
                        value={formData.price} 
                        onChange={e => setFormData({ ...formData, price: e.target.value })} 
                        required 
                    />
                    <div className="modal-actions">
                        <button type="submit">Сохранить</button>
                        <button type="button" onClick={onClose}>Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductForm;