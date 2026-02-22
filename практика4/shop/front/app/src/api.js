const BASE_URL = 'http://localhost:3000/api';

export const api = {
  getBooks: async () => {
    const res = await fetch(`${BASE_URL}/books`);
    if (!res.ok) throw new Error('Failed to fetch books');
    return await res.json();
  },

  getBook: async (id) => {
    const res = await fetch(`${BASE_URL}/books/${id}`);
    if (!res.ok) throw new Error('Failed to fetch book');
    return await res.json();
  },

  createBook: async (payload) => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create book');
    return await res.json();
  },

  updateUser: async (id, payload) => {
    // Для книг используем updateBook, но чтобы не ломать логику UsersPage, 
    // лучше создать отдельный метод или переименовать в UsersPage. 
    // Ниже правильный метод для книг:
    const res = await fetch(`${BASE_URL}/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update book');
    return await res.json();
  },
  
  // Алиас для совместимости с кодом страницы, если не будете менять имена функций там
  updateBook: async (id, payload) => {
     const res = await fetch(`${BASE_URL}/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update book');
    return await res.json();
  },

  deleteUser: async (id) => {
    const res = await fetch(`${BASE_URL}/books/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete book');
  },
  
  // Алиас
  deleteBook: async (id) => {
    const res = await fetch(`${BASE_URL}/books/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete book');
  }
};