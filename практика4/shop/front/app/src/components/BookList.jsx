import React from 'react';
import './BookList.scss';

export default function BookList({ books, onEdit, onDelete }) {
  if (books.length === 0) {
    return <div className="empty">Книг пока нет</div>;
  }

  return (
    <div className="book-list">
      {books.map((book) => (
        <div key={book.id} className="book-card">
          <div className="book-card__image">
            <img src={book.image} alt={book.title} />
          </div>
          <div className="book-card__content">
            <h3 className="book-card__title">{book.title}</h3>
            <span className="book-card__category">{book.category}</span>
            <p className="book-card__description">{book.description}</p>
            <div className="book-card__info">
              <span className="price">{book.price} ₽</span>
              <span className="stock">На складе: {book.stock}</span>
              <span className="rating">★ {book.rating}</span>
            </div>
            <div className="book-card__actions">
              <button className="btn btn--small" onClick={() => onEdit(book)}>
                Редактировать
              </button>
              <button className="btn btn--danger btn--small" onClick={() => onDelete(book.id)}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}