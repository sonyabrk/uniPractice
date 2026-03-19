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

const app = express();
const port = 3000;

// Создаём папку uploads если не существует
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer — сохранение файлов в папку uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${nanoid()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase())
                && allowed.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Только изображения (jpg, png, gif, webp)'));
    }
});

// Конфигурация JWT
const ACCESS_SECRET = 'super_secret_key_for_access_jwt';
const REFRESH_SECRET = 'super_secret_key_for_refresh_jwt';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Хранилище refresh-токенов
const refreshTokens = new Set();

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API AUTH & PRODUCTS (RBAC)',
            version: '2.0.0',
            description: 'Практическое занятие №11. Управление доступом на основе ролей (RBAC)',
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
// Отдаём загруженные файлы по пути /uploads/filename
app.use('/uploads', express.static(uploadsDir));
app.use(cors());

// Логгер запросов
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}][${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

// Auth middleware — проверка JWT
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// Role middleware — проверка роли
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: insufficient role" });
        }
        next();
    };
}

let users = [];
let products = [];

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// ===================== AUTH ROUTES =====================

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
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *               first_name:
 *                 type: string
 *                 example: Ivan
 *               last_name:
 *                 type: string
 *                 example: Ivanov
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *                 example: user
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Некорректные данные
 */
app.post("/api/auth/register", async (req, res) => {
    const { email, password, first_name, last_name, role } = req.body;
    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: "email, password, first_name and last_name are required" });
    }
    if (findUserByEmail(email)) {
        return res.status(400).json({ error: "User with this email already exists" });
    }

    const allowedRoles = ['user', 'seller', 'admin'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const newUser = {
        id: nanoid(),
        email,
        first_name,
        last_name,
        role: userRole,
        isBlocked: false,
        password: await hashPassword(password)
    };

    users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
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
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *       401:
 *         description: Неверные учетные данные
 */
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
    }
    const user = findUserByEmail(email);
    if (!user) {
        return res.status(404).json({ error: "user not found" });
    }
    if (user.isBlocked) {
        return res.status(403).json({ error: "User is blocked" });
    }

    const isAuthenticated = await verifyPassword(password, user.password);
    if (isAuthenticated) {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        refreshTokens.add(refreshToken);
        res.status(200).json({
            accessToken,
            refreshToken,
            message: "Welcome",
            user: { email: user.email, first_name: user.first_name, role: user.role }
        });
    } else {
        res.status(401).json({ error: "not authenticated" });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Токены обновлены
 *       401:
 *         description: Неверный refresh токен
 */
app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
    }
    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = findUserById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        if (user.isBlocked) {
            return res.status(403).json({ error: "User is blocked" });
        }
        refreshTokens.delete(refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);
        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        refreshTokens.delete(refreshToken);
        return res.status(401).json({ error: "Invalid or expired refresh token" });
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
 *       200:
 *         description: Данные пользователя
 *       401:
 *         description: Неавторизован
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = findUserById(req.user.sub);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// ===================== USERS ROUTES (только admin) =====================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       403:
 *         description: Доступ запрещён
 */
app.get("/api/users", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);
    res.json(usersWithoutPasswords);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по id (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь найден
 *       404:
 *         description: Пользователь не найден
 */
app.get("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *     responses:
 *       200:
 *         description: Пользователь обновлён
 */
app.put("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
    }
    const { first_name, last_name, role } = req.body;
    const allowedRoles = ['user', 'seller', 'admin'];
    if (first_name) users[userIndex].first_name = first_name;
    if (last_name) users[userIndex].last_name = last_name;
    if (role && allowedRoles.includes(role)) users[userIndex].role = role;

    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
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
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 */
app.delete("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
    }
    // Блокируем пользователя вместо удаления
    users[userIndex].isBlocked = true;
    const { password, ...userWithoutPassword } = users[userIndex];
    res.json({ message: "User blocked", user: userWithoutPassword });
});

// ===================== PRODUCTS ROUTES =====================

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
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post("/api/products", authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
    const { title, category, description, price } = req.body;
    if (!title || price === undefined) {
        return res.status(400).json({ error: "title and price are required" });
    }
    const newProduct = {
        id: nanoid(),
        title,
        category: category || "",
        description: description || "",
        price: Number(price),
        image: req.file ? `/uploads/${req.file.filename}` : ""
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров (user, seller, admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get("/api/products", authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по id (user, seller, admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: "product not found" });
    }
    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить параметры товара (seller, admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Товар обновлен
 */
app.put("/api/products/:id", authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
        return res.status(404).json({ error: "product not found" });
    }
    const { title, category, description, price } = req.body;
    if (title) products[productIndex].title = title;
    if (category !== undefined) products[productIndex].category = category;
    if (description !== undefined) products[productIndex].description = description;
    if (price !== undefined) products[productIndex].price = Number(price);

    // Если загружено новое фото — удаляем старое и сохраняем новое
    if (req.file) {
        const oldImage = products[productIndex].image;
        if (oldImage && oldImage.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, oldImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        products[productIndex].image = `/uploads/${req.file.filename}`;
    }

    res.status(200).json(products[productIndex]);
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
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар удален
 */
app.delete("/api/products/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
        return res.status(404).json({ error: "product not found" });
    }
    // Удаляем файл с диска если он есть
    const image = products[productIndex].image;
    if (image && image.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    products.splice(productIndex, 1);
    res.status(200).json({ message: "product deleted" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);
});