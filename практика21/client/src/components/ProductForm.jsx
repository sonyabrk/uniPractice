import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';

const SERVER = 'http://localhost:3000';
const PLACEHOLDER = 'https://placehold.co/300x200?text=Нет+фото';

function ProductForm({ product, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: ''
    });
    const [imageFile, setImageFile] = useState(null);       
    const [previewUrl, setPreviewUrl] = useState('');       // превью
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (product) {
             // eslint-disable-next-line react-hooks/exhaustive-deps
            setFormData({
                title: product.title || '',
                category: product.category || '',
                description: product.description || '',
                price: product.price || ''
            });
            // Показываем текущее фото товара как превью
            setPreviewUrl(product.image ? `${SERVER}${product.image}` : '');
        } else {
            setFormData({ title: '', category: '', description: '', price: '' });
            setPreviewUrl('');
        }
        setImageFile(null);
    }, [product]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file)); // локальное превью сразу
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Используем FormData чтобы отправить файл вместе с полями
            const data = new FormData();
            data.append('title', formData.title);
            data.append('category', formData.category);
            data.append('description', formData.description);
            data.append('price', formData.price);
            if (imageFile) {
                data.append('image', imageFile);
            }

            if (product) {
                await apiClient.put(`/products/${product.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await apiClient.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            onSubmit();
        } catch (err) {
            console.error(err);
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

                    {/* Загрузка фото */}
                    <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Превью" className="file-upload-preview" />
                        ) : (
                            <div className="file-upload-placeholder">
                                <span className="file-upload-icon">📷</span>
                                <span>Нажмите чтобы загрузить фото</span>
                                <span className="file-upload-hint">JPG, PNG, WEBP до 5 МБ</span>
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    {previewUrl && (
                        <button type="button" className="btn-remove-image" onClick={handleRemoveImage}>
                            🗑 Удалить фото
                        </button>
                    )}

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