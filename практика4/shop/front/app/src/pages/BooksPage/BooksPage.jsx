import React, { useState, useEffect } from 'react';
import './BooksPage.scss'; 
import BookList from '../../components/BookList';
import BookModal from '../../components/BookModal';
import { api } from '../../api';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingBook, setEditingBook] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await api.getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки книг');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingBook(null);
    setModalOpen(true);
  };

  const openEdit = (book) => {
    setModalMode('edit');
    setEditingBook(book);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBook(null);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Удалить эту книгу?');
    if (!ok) return;
    try {
      await api.deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
      alert('Ошибка удаления книги');
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === 'create') {
        const newBook = await api.createBook(payload);
        setBooks((prev) => [...prev, newBook]);
      } else {
        const updatedBook = await api.updateBook(payload.id, payload);
        setBooks((prev) =>
          prev.map((b) => (b.id === payload.id ? updatedBook : b))
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Ошибка сохранения книги');
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="container">
          <h1>Книжный Магазин</h1>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h2 className="title">Каталог книг</h2>
            <button className="btn btn--primary" onClick={openCreate}>
              + Добавить книгу
            </button>
          </div>

          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <BookList
              books={books}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          {new Date().getFullYear()} BookStore App
        </div>
      </footer>

      <BookModal
        open={modalOpen}
        mode={modalMode}
        initialBook={editingBook}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}