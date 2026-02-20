const express = require('express');
const app = express();
const port = 3000;

// Middleware 
// Парсинг JSON-данных из тела запроса
app.use(express.json());

// Парсинг данных форм 
app.use(express.urlencoded({ extended: false }));

// Статические файлы 
app.use(express.static('public'));

// Собственное middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} — ${req.method} ${req.url}`);
  next();
});

// Начальные данные (товары) 
let products = [
  { id: 1, name: 'Ноутбук Apple MacBook Air 13"', price: 99990 },
  { id: 2, name: 'Смартфон Samsung Galaxy S24', price: 79990 },
  { id: 3, name: 'Наушники Sony WH-1000XM5', price: 29990 },
  { id: 4, name: 'Книга "От А до Я. Философия Энди Уорхола"', price: 1999 }
];

// CRUD операции 

// 1. GET / — главная страница (приветствие)
app.get('/', (req, res) => {
  res.send('Добро пожаловать в API управления товарами!');
});

// 2. GET /products — получить список всех товаров
app.get('/products', (req, res) => {
  res.json(products);
});

// 3. GET /products/:id — получить товар по ID
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.json(product);
});

// 4. POST /products — добавить новый товар
app.post('/products', (req, res) => {
  const { name, price } = req.body;

  // Валидация входных данных
  if (!name || price === undefined) {
    return res.status(400).json({ 
      error: 'Необходимо указать название (name) и стоимость (price)' 
    });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ 
      error: 'Стоимость должна быть положительным числом' 
    });
  }

  const newProduct = {
    id: Date.now(), // уникальный ID на основе времени
    name,
    price
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// 5. PUT /products/:id — полностью обновить товар
app.put('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price } = req.body;
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  // Валидация
  if (!name || price === undefined) {
    return res.status(400).json({ 
      error: 'Необходимо указать название (name) и стоимость (price)' 
    });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ 
      error: 'Стоимость должна быть положительным числом' 
    });
  }

  // Полное обновление
  product.name = name;
  product.price = price;

  res.json(product);
});

// 6. PATCH /products/:id — частично обновить товар
app.patch('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price } = req.body;
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  // Частичное обновление (только переданные поля)
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Название должно быть непустой строкой' });
    }
    product.name = name;
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Стоимость должна быть положительным числом' });
    }
    product.price = price;
  }

  res.json(product);
});

// 7. DELETE /products/:id — удалить товар
app.delete('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  products.splice(productIndex, 1);
  res.status(200).json({ message: 'Товар успешно удалён' });
});

// Запуск сервера 
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Доступные эндпоинты:`);
  console.log(`   GET    /products         — все товары`);
  console.log(`   GET    /products/:id     — товар по ID`);
  console.log(`   POST   /products         — создать товар`);
  console.log(`   PUT    /products/:id     — полностью обновить`);
  console.log(`   PATCH  /products/:id     — частично обновить`);
  console.log(`   DELETE /products/:id     — удалить товар`);
});