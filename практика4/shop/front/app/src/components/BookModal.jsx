import React, { useState, useEffect } from 'react';
import './BookModal.scss';

export default function BookModal({ open, mode, initialBook, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    rating: '',
    image: ''
  });

  useEffect(() => {
    if (initialBook) {
      setFormData({
        title: initialBook.title || '',
        category: initialBook.category || '',
        description: initialBook.description || '',
        price: initialBook.price || '',
        stock: initialBook.stock || '',
        rating: initialBook.rating || '',
        image: initialBook.image || ''
      });
    } else {
      setFormData({
        title: '', category: '', description: '', price: '', stock: '', rating: '', image: ''
      });
    }
  }, [initialBook, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Подготовка данных (числа)
    const payload = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
      rating: Number(formData.rating)
    };
    if (mode === 'edit') {
      payload.id = initialBook.id;
    }
    onSubmit(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{mode === 'create' ? 'Новая книга' : 'Редактирование книги'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input name="title" value={formData.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Категория</label>
            <input name="category" value={formData.category} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Цена (₽)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>На складе</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Рейтинг (0-5)</label>
              <input type="number" name="rating" value={formData.rating} onChange={handleChange} min="0" max="5" />
            </div>
            <div className="form-group">
              <label>URL Фото</label>
              <input type="url" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}