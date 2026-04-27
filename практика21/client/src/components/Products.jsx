
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import ProductForm from './ProductForm';

const PLACEHOLDER = 'https://placehold.co/300x200?text=Нет+фото';
const SERVER = 'http://localhost:3000';

function ProductCard({ product, canEdit, canDelete, onEdit, onDelete, onClick }) {
    const [imgSrc, setImgSrc] = useState(product.image ? SERVER + product.image : PLACEHOLDER);

    return (
        <div className="product-card" onClick={onClick}>
            <div className="product-card__image-wrap">
                <img
                    src={imgSrc}
                    alt={product.title}
                    className="product-card__image"
                    onError={() => setImgSrc(PLACEHOLDER)}
                />
            </div>
            <div className="product-card__body">
                {product.category && (
                    <span className="product-card__category">{product.category}</span>
                )}
                <h3 className="product-card__title">{product.title}</h3>
                {product.description && (
                    <p className="product-card__desc">{product.description}</p>
                )}
                <p className="product-card__price">{Number(product.price).toLocaleString('ru-RU')} ₽</p>
            </div>
            {(canEdit || canDelete) && (
                <div className="product-card__actions" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                        <button className="btn-edit" onClick={() => onEdit(product)}>Изменить</button>
                    )}
                    {canDelete && (
                        <button className="btn-delete" onClick={() => onDelete(product.id)}>Удалить</button>
                    )}
                </div>
            )}
        </div>
    );
}

function Products() {
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [user, setUser] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [selectedImgSrc, setSelectedImgSrc] = useState('');

    const canCreate = userRole === 'seller' || userRole === 'admin';
    const canEdit   = userRole === 'seller' || userRole === 'admin';
    const canDelete = userRole === 'admin';

    const fetchProducts = useCallback(async () => {
        try {
            const res = await apiClient.get('/products');
            setProducts(res.data.data ?? res.data);
        } catch (err) {
            console.error('Ошибка загрузки товаров', err);
        }
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/auth/me');
            setUser(data);
            setUserRole(data.role);
            localStorage.setItem('userRole', data.role);
        } catch (err) {
            console.error('Ошибка загрузки пользователя', err);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchProducts();
        fetchUser();
    }, [fetchProducts, fetchUser]);

    const handleDelete = async (id) => {
        if (window.confirm('Удалить товар?')) {
            try {
                await apiClient.delete(`/products/${id}`);
                if (selectedProduct?.id === id) setSelectedProduct(null);
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

    const handleCardClick = async (product) => {
        try {
            const { data } = await apiClient.get(`/products/${product.id}`);
            setSelectedProduct(data);
            setSelectedImgSrc(data.image ? SERVER + data.image : PLACEHOLDER);
        } catch (err) {
            console.error('Ошибка загрузки товара', err);
        }
    };

    if (userRole === null) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <div className="products-container">
            <div className="products-header">
                <h2>Список товаров</h2>
                {user && (
                    <p className="user-info">
                        <strong>{user.first_name} {user.last_name}</strong> ({user.email}) —{' '}
                        <span className={`role-tag role-tag--${user.role}`}>{user.role}</span>
                    </p>
                )}
            </div>

            {canCreate && (
                <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="add-btn">
                    + Добавить товар
                </button>
            )}

            {showForm && (
                <ProductForm
                    product={editingProduct}
                    onClose={() => { setShowForm(false); setEditingProduct(null); }}
                    onSubmit={handleFormSubmit}
                />
            )}

            {/* Модальное окно деталей товара */}
            {selectedProduct && (
                <div className="modal" onClick={() => setSelectedProduct(null)}>
                    <div className="modal-content product-detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
                        <img
                            src={selectedImgSrc}
                            alt={selectedProduct.title}
                            className="product-detail__image"
                            onError={() => setSelectedImgSrc(PLACEHOLDER)}
                        />
                        <div className="product-detail__info">
                            {selectedProduct.category && (
                                <span className="product-card__category">{selectedProduct.category}</span>
                            )}
                            <h3>{selectedProduct.title}</h3>
                            {selectedProduct.description && <p>{selectedProduct.description}</p>}
                            <p className="product-card__price">
                                {Number(selectedProduct.price).toLocaleString('ru-RU')} ₽
                            </p>
                            <p className="product-detail__id">ID: {selectedProduct.id}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Сетка карточек */}
            {products.length === 0 ? (
                <p className="empty-msg">Товары не найдены</p>
            ) : (
                <div className="products-grid">
                    {products.map(p => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onClick={() => handleCardClick(p)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Products;