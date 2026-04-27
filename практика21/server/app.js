const cors = require('cors');
const express = require('express');
const { nanoid } = require("nanoid");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('redis');

const app = express();
const port = 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${nanoid()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase())
                && allowed.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Только изображения (jpg, png, gif, webp)'));
    }
});

const ACCESS_SECRET = 'super_secret_key_for_access_jwt';
const REFRESH_SECRET = 'super_secret_key_for_refresh_jwt';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const refreshTokens = new Set();

const USERS_CACHE_TTL = 60;      // 1 минута
const PRODUCTS_CACHE_TTL = 600;  // 10 минут

const redisClient = createClient({
    url: 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

async function initRedis() {
    await redisClient.connect();
    console.log('Redis подключён');
}


// Middleware: читает данные из кэша. Если есть — сразу отдаёт.
// Если нет — пишет cacheKey и cacheTTL в req и идёт дальше.
function cacheMiddleware(keyBuilder, ttl) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            const cached = await redisClient.get(key);
            if (cached) {
                return res.json({ source: 'cache', data: JSON.parse(cached) });
            }
            req.cacheKey = key;
            req.cacheTTL = ttl;
            next();
        } catch (err) {
            console.error('Cache read error:', err);
            next(); // при ошибке Redis — продолжаем без кэша
        }
    };
}

// Сохраняет данные в Redis с заданным TTL
async function saveToCache(key, data, ttl) {
    try {
        await redisClient.set(key, JSON.stringify(data), { EX: ttl });
    } catch (err) {
        console.error('Cache save error:', err);
    }
}

// Инвалидация кэша пользователей
async function invalidateUsersCache(userId = null) {
    try {
        await redisClient.del('users:all');
        if (userId) await redisClient.del(`users:${userId}`);
    } catch (err) {
        console.error('Users cache invalidate error:', err);
    }
}

// Инвалидация кэша товаров
async function invalidateProductsCache(productId = null) {
    try {
        await redisClient.del('products:all');
        if (productId) await redisClient.del(`products:${productId}`);
    } catch (err) {
        console.error('Products cache invalidate error:', err);
    }
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API AUTH & PRODUCTS (RBAC + Redis Cache)',
            version: '3.0.0',
            description: 'Практическое занятие №21. Кэширование с использованием Redis',
        },
        servers: [{ url: `http://localhost:${port}`, description: 'Локальный сервер' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static(uploadsDir));
app.use(cors());

// Логгер
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}][${req.method}] ${res.statusCode} ${req.path}`);
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            console.log('Body:', req.body);
        }
    });
    next();
});

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
        next();
    };
}

let users = [];
let products = [];


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: qwerty123 }
 *               first_name: { type: string, example: Ivan }
 *               last_name: { type: string, example: Ivanov }
 *               role: { type: string, enum: [user, seller, admin], example: user }
 *     responses:
 *       201: { description: Пользователь создан }
 *       400: { description: Некорректные данные }
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, password, first_name, last_name, role } = req.body;
    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'email, password, first_name and last_name are required' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }
    const allowedRoles = ['user', 'seller', 'admin'];
    const newUser = {
        id: nanoid(),
        email, first_name, last_name,
        role: allowedRoles.includes(role) ? role : 'user',
        isBlocked: false,
        password: await bcrypt.hash(password, 10)
    };
    users.push(newUser);
    // Инвалидируем кэш пользователей при добавлении нового
    await invalidateUsersCache();
    const { password: _, ...out } = newUser;
    res.status(201).json(out);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Авторизация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: qwerty123 }
 *     responses:
 *       200: { description: Успешная авторизация }
 *       401: { description: Неверные учётные данные }
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }
    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.isBlocked) return res.status(403).json({ error: 'User is blocked' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'not authenticated' });

    const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN }
    );
    refreshTokens.add(refreshToken);
    res.json({ accessToken, refreshToken, message: 'Welcome',
        user: { email: user.email, first_name: user.first_name, role: user.role } });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновить токены
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Токены обновлены }
 */
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
    if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: 'Invalid refresh token' });
    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find(u => u.id === payload.sub);
        if (!user || user.isBlocked) return res.status(401).json({ error: 'User not found or blocked' });
        refreshTokens.delete(refreshToken);
        const newAccess = jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN }
        );
        const newRefresh = jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN }
        );
        refreshTokens.add(newRefresh);
        res.json({ accessToken: newAccess, refreshToken: newRefresh });
    } catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Данные текущего пользователя }
 */
app.get('/api/auth/me', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...out } = user;
    res.json(out);
});


/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей (только admin) [кэш 1 мин]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Список пользователей }
 */
app.get(
    '/api/users',
    authMiddleware,
    roleMiddleware(['admin']),
    cacheMiddleware(() => 'users:all', USERS_CACHE_TTL),
    async (req, res) => {
        const data = users.map(({ password, ...u }) => u);
        await saveToCache(req.cacheKey, data, req.cacheTTL);
        res.json({ source: 'server', data });
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по id (только admin) [кэш 1 мин]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Пользователь найден }
 *       404: { description: Не найден }
 */
app.get(
    '/api/users/:id',
    authMiddleware,
    roleMiddleware(['admin']),
    cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
    async (req, res) => {
        const user = users.find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password, ...data } = user;
        await saveToCache(req.cacheKey, data, req.cacheTTL);
        res.json({ source: 'server', data });
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               role: { type: string, enum: [user, seller, admin] }
 *     responses:
 *       200: { description: Пользователь обновлён }
 */
app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const { first_name, last_name, role } = req.body;
    const allowedRoles = ['user', 'seller', 'admin'];
    if (first_name) users[idx].first_name = first_name;
    if (last_name) users[idx].last_name = last_name;
    if (role && allowedRoles.includes(role)) users[idx].role = role;
    // Инвалидируем кэш
    await invalidateUsersCache(users[idx].id);
    const { password, ...out } = users[idx];
    res.json(out);
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Пользователь заблокирован }
 */
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users[idx].isBlocked = true;
    // Инвалидируем кэш
    await invalidateUsersCache(users[idx].id);
    const { password, ...out } = users[idx];
    res.json({ message: 'User blocked', user: out });
});


/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров [кэш 10 мин]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Список товаров }
 */
app.get(
    '/api/products',
    authMiddleware,
    roleMiddleware(['user', 'seller', 'admin']),
    cacheMiddleware(() => 'products:all', PRODUCTS_CACHE_TTL),
    async (req, res) => {
        await saveToCache(req.cacheKey, products, req.cacheTTL);
        res.json({ source: 'server', data: products });
    }
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по id [кэш 10 мин]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Товар найден }
 *       404: { description: Не найден }
 */
app.get(
    '/api/products/:id',
    authMiddleware,
    roleMiddleware(['user', 'seller', 'admin']),
    cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
    async (req, res) => {
        const product = products.find(p => p.id === req.params.id);
        if (!product) return res.status(404).json({ error: 'product not found' });
        await saveToCache(req.cacheKey, product, req.cacheTTL);
        res.json({ source: 'server', data: product });
    }
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар (seller, admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price]
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *     responses:
 *       201: { description: Товар создан }
 */
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), async (req, res) => {
    const { title, category, description, price } = req.body;
    if (!title || price === undefined) {
        return res.status(400).json({ error: 'title and price are required' });
    }
    const newProduct = {
        id: nanoid(),
        title,
        category: category || '',
        description: description || '',
        price: Number(price),
        image: req.file ? `/uploads/${req.file.filename}` : ''
    };
    products.push(newProduct);
    // Инвалидируем кэш списка товаров
    await invalidateProductsCache();
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар (seller, admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Товар обновлён }
 */
app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), async (req, res) => {
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'product not found' });
    const { title, category, description, price } = req.body;
    if (title) products[idx].title = title;
    if (category !== undefined) products[idx].category = category;
    if (description !== undefined) products[idx].description = description;
    if (price !== undefined) products[idx].price = Number(price);
    if (req.file) {
        const old = products[idx].image;
        if (old && old.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, old);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        products[idx].image = `/uploads/${req.file.filename}`;
    }
    // Инвалидируем кэш конкретного товара и списка
    await invalidateProductsCache(products[idx].id);
    res.json(products[idx]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар (только admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Товар удалён }
 */
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'product not found' });
    const image = products[idx].image;
    if (image && image.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const deletedId = products[idx].id;
    products.splice(idx, 1);
    // Инвалидируем кэш
    await invalidateProductsCache(deletedId);
    res.json({ message: 'product deleted' });
});

initRedis().then(() => {
    app.listen(port, () => {
        console.log(`Сервер запущен на http://localhost:${port}`);
        console.log(`Swagger UI: http://localhost:${port}/api-docs`);
    });
});