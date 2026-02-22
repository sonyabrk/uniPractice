const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const app = express();
const port = 3000;

// Начальные данные (10 книг)
let books = [
  { id: nanoid(6), title: 'Мастер и Маргарита', category: 'Классика', description: 'Роман Михаила Булгакова.', price: 500, stock: 10, rating: 5, image: '' },
  { id: nanoid(6), title: '1984', category: 'Антиутопия', description: 'Роман-антиутопия Джорджа Оруэлла.', price: 450, stock: 5, rating: 5, image: '' },
  { id: nanoid(6), title: 'Гарри Поттер', category: 'Фэнтези', description: 'Первая книга о волшебнике.', price: 800, stock: 20, rating: 5, image: '' },
  { id: nanoid(6), title: 'Преступление и наказание', category: 'Классика', description: 'Роман Фёдора Достоевского.', price: 400, stock: 8, rating: 4, image: '' },
  { id: nanoid(6), title: 'Властелин колец', category: 'Фэнтези', description: 'Эпическая трилогия Дж. Р. Р. Толкина.', price: 1200, stock: 3, rating: 5, image: '' },
  { id: nanoid(6), title: 'Гордость и предубеждение', category: 'Роман', description: 'Роман Джейн Остин.', price: 350, stock: 15, rating: 4, image: '' },
  { id: nanoid(6), title: 'Великий Гэтсби', category: 'Классика', description: 'Роман Фрэнсиса Скотта Фицджеральда.', price: 300, stock: 12, rating: 4, image: '' },
  { id: nanoid(6), title: 'Над пропастью во ржи', category: 'Классика', description: 'Роман Джерома Д. Сэлинджера.', price: 380, stock: 7, rating: 4, image: '' },
  { id: nanoid(6), title: 'Убить пересмешника', category: 'Классика', description: 'Роман Харпер Ли.', price: 420, stock: 9, rating: 5, image: '' },
  { id: nanoid(6), title: 'Маленький принц', category: 'Сказка', description: 'Повесть Антуана де Сент-Экзюпери.', price: 250, stock: 25, rating: 5, image: '' },
];

app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Настройка CORS
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Вспомогательная функция
function findBookOr404(id, res) {
  const book = books.find(b => b.id === id);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return null;
  }
  return book;
}

// POST /api/books
app.post("/api/books", (req, res) => {
  const { title, category, description, price, stock, rating, image } = req.body;
  const newBook = {
    id: nanoid(6),
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock),
    rating: Number(rating) || 0,
    image: image || 'https://via.placeholder.com/150'
  };
  books.push(newBook);
  res.status(201).json(newBook);
});

// GET /api/books
app.get("/api/books", (req, res) => {
  res.json(books);
});

// GET /api/books/:id
app.get("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const book = findBookOr404(id, res);
  if (!book) return;
  res.json(book);
});

// PATCH /api/books/:id
app.patch("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const book = findBookOr404(id, res);
  if (!book) return;

  const allowedFields = ['title', 'category', 'description', 'price', 'stock', 'rating', 'image'];
  const hasUpdates = allowedFields.some(field => req.body[field] !== undefined);

  if (!hasUpdates) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { title, category, description, price, stock, rating, image } = req.body;
  if (title !== undefined) book.title = title.trim();
  if (category !== undefined) book.category = category.trim();
  if (description !== undefined) book.description = description.trim();
  if (price !== undefined) book.price = Number(price);
  if (stock !== undefined) book.stock = Number(stock);
  if (rating !== undefined) book.rating = Number(rating);
  if (image !== undefined) book.image = image;

  res.json(book);
});

// DELETE /api/books/:id
app.delete("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const exists = books.some(b => b.id === id);
  if (!exists) return res.status(404).json({ error: "Book not found" });
  books = books.filter(b => b.id !== id);
  res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});