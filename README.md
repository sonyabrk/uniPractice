# Практические занятия — Фронтенд и бэкенд разработка

> **Дисциплина:** Фронтенд и бэкенд разработка  
> **Семестр:** 4 семестр, 2025/2026 уч. год  
> **Студент:** Брюханова Софья

---

## Структура проекта

```
PRACTICE/
├── практика1/          # CSS-препроцессоры (SASS/LESS)
├── практика2/          # Сервер на Node.js + Express
├── практика3/          # JSON и внешние API (Postman)
├── практика4/          # API + React (полная связка клиент-сервер)
├── практика5/          # Расширенный REST API + Swagger
├── практика7-12/       # Аутентификация, JWT, RBAC
│   ├── client/10-app/  # React-клиент (Vite)
│   └── server/         # Express-сервер
├── практика13-17/      # PWA: Service Worker, Manifest, App Shell, WebSocket, Push
├── практики19/         # PostgreSQL + Node.js REST API
├── практики19/         # MongoDB + Node.js REST API
├── практика20/         # MongoDB + Node.js REST API
├── практика21/         # Кэширование с Redis
├── практика22/         # Балансировка нагрузки (Nginx + HAProxy)
└── практика23/         # Контейнеризация с Docker + Docker Compose
```

---

## Практика 1 — CSS-препроцессоры

**Тема:** SASS / LESS — переменные, миксины, вложенность, импорт.

**Что сделано:** Карточка товара с применением препроцессора: переменные для цветов и размеров, миксины для переиспользуемых блоков, вложенная структура по BEM.

`SASS` · `LESS` · `HTML` · `CSS`

---

## Практика 2 — Сервер на Node.js + Express

**Тема:** REST API на Express.js, middleware, маршрутизация, CRUD.

**Что сделано:** API-сервер с полным набором CRUD-операций для списка товаров.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/products` | Все товары |
| `GET` | `/products/:id` | Товар по ID |
| `POST` | `/products` | Создать товар |
| `PATCH` | `/products/:id` | Изменить товар |
| `DELETE` | `/products/:id` | Удалить товар |

`Node.js` · `Express.js`

---

## Практика 3 — JSON и внешние API (Postman)

**Тема:** Формат JSON, тестирование API в Postman, внешние публичные API.

**Что сделано:** Коллекция запросов в Postman для собственного API (практика 2) + не менее 5 запросов к внешним API (OpenWeatherMap, ExchangeRate-API).

`Postman` · `JSON` · `REST API`

---

## Практика 4 — API + React

**Тема:** Связка фронтенда на React с бэкендом на Express, CORS, axios.

**Что сделано:** Интернет-магазин с 10+ товарами (название, категория, описание, цена, остаток). Клиент и сервер работают как единая система.

`React` · `Vite` · `SASS` · `axios` · `Express.js` · `cors`

---

## Практика 5 — Расширенный REST API + Swagger

**Тема:** Документирование API через Swagger (OpenAPI 3.0).

**Что сделано:** К проекту из практики 4 подключена автодокументация Swagger. Все CRUD-эндпоинты описаны через JSDoc-комментарии.

**Документация:** `http://localhost:3000/api-docs`

`Express.js` · `swagger-jsdoc` · `swagger-ui-express` · `OpenAPI 3.0`

---

## Практики 7–12 — Аутентификация, JWT, RBAC

**Тема:** bcrypt, JWT access/refresh токены, хранение на фронтенде, система ролей.

**Что сделано:**
- Практика 7 — регистрация/вход, хеширование паролей bcrypt
- Практика 8 — JWT access-токен, middleware-защита маршрутов
- Практика 9 — refresh-токены, ротация, `POST /api/auth/refresh`
- Практика 10 — React-клиент: хранение токенов в localStorage, axios interceptors
- Практика 11 — RBAC: роли гость / пользователь / продавец / администратор
- Практика 12 — React-клиент с ролевым интерфейсом

**Запуск:**
```bash
# Сервер
cd практика7-12/server
npm install
node app.js
# http://localhost:3000  |  Swagger: http://localhost:3000/api-docs

# Клиент
cd практика7-12/client/10-app
npm install
npm run dev
# http://localhost:5173
```

`Node.js` · `Express.js` · `bcrypt` · `jsonwebtoken` · `React.js` · `axios` · `Swagger`

---

## Практики 13–17 — PWA

**Тема:** Service Worker, Web App Manifest, App Shell, WebSocket (Socket.IO), Push-уведомления, напоминания с отложенной отправкой.

**Что сделано:** Веб-приложение для задач с офлайн-доступом, установкой на устройство, real-time обновлениями через Socket.IO, системными push-уведомлениями и кнопкой «Отложить на 5 минут» прямо в уведомлении.

**Запуск:**
```bash
cd практика13-17
npm install
node server.js
# https://localhost:3001
```

`Service Worker` · `Cache API` · `Web App Manifest` · `App Shell` · `Socket.IO` · `web-push` · `VAPID` · `mkcert`

---

## Практика 19 — PostgreSQL

**Тема:** Реляционная СУБД PostgreSQL, подключение к Node.js через `pg` и Sequelize ORM.

**Что сделано:** REST API для управления пользователями с хранением данных в PostgreSQL. Модель `User` с полями `id`, `first_name`, `last_name`, `age`, `created_at`, `updated_at`. Каждый маршрут связан с базой данных.

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/users` | Создать пользователя |
| `GET` | `/api/users` | Список пользователей |
| `GET` | `/api/users/:id` | Пользователь по ID |
| `PATCH` | `/api/users/:id` | Обновить пользователя |
| `DELETE` | `/api/users/:id` | Удалить пользователя |

**Запуск:**
```bash
cd практики19
npm install
# Убедитесь, что PostgreSQL запущен и настроены параметры подключения в коде
node server.js
# http://localhost:3000
```

`Node.js` · `Express.js` · `pg` · `Sequelize` · `PostgreSQL`

---

## Практика 20 — MongoDB

**Тема:** NoSQL СУБД MongoDB, подключение через Mongoose (ODM).

**Что сделано:** REST API для управления пользователями с хранением данных в MongoDB. Схема `User`: `first_name`, `last_name`, `age`, `created_at`, `updated_at`. Каждый маршрут связан с базой данных.

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/users` | Создать пользователя |
| `GET` | `/api/users` | Список пользователей |
| `GET` | `/api/users/:id` | Пользователь по ID |
| `PATCH` | `/api/users/:id` | Обновить пользователя |
| `DELETE` | `/api/users/:id` | Удалить пользователя |

**Запуск:**
```bash
cd практика20
npm install
# Убедитесь, что MongoDB запущен (sudo systemctl start mongod)
node server.js
# http://localhost:3000
```

`Node.js` · `Express.js` · `mongoose` · `MongoDB`

---

## Практика 21 — Кэширование с Redis

**Тема:** Redis как in-memory хранилище, кэширование GET-запросов, инвалидация кэша при изменении данных.

**Что сделано:** Доработано приложение из практики 11 (RBAC). Добавлены кэш-middleware для чтения из Redis и инвалидация кэша при обновлении/удалении.

| Маршрут | Метод | Время кэша |
|---------|-------|-----------|
| `/api/users` | `GET` | 1 минута |
| `/api/users/:id` | `GET` | 1 минута |
| `/api/products` | `GET` | 10 минут |
| `/api/products/:id` | `GET` | 10 минут |

**Запуск:**
```bash
# Запустить Redis (если нет локально — через Docker)
docker run -d --name redis-cache -p 6379:6379 redis

cd практика21
npm install
node server.js
# http://localhost:3000
```

`Node.js` · `Express.js` · `redis` · `Redis`

---

## Практика 22 — Балансировка нагрузки

**Тема:** Балансировка нагрузки с Nginx и HAProxy, алгоритмы Round Robin / Least Connections / IP Hash, отказоустойчивость.

**Что сделано:**
- Два основных backend-сервера на Node.js (порты 3000, 3001) и один резервный (3002)
- Nginx настроен как балансировщик: блок `upstream` с `proxy_pass`
- Настроены `max_fails=2` и `fail_timeout=30s` для автоматического исключения упавшего сервера
- Реализован альтернативный пример балансировки через HAProxy (roundrobin + health check)

**Запуск:**
```bash
cd практика22

# Запуск серверов
PORT=3000 node server.js &
PORT=3001 node server.js &
PORT=3002 node server.js &

# Запуск Nginx (конфиг подключён)
sudo nginx -c $(pwd)/nginx.conf

# Проверка балансировки
curl http://localhost/
```

`Node.js` · `Express.js` · `Nginx` · `HAProxy`

---

## Практика 23 — Контейнеризация с Docker

**Тема:** Docker, Dockerfile, Docker Compose, многоконтейнерные приложения, Nginx как балансировщик в Docker-сети, Circuit Breaker, API Aggregation.

**Что сделано:** Веб-приложение с несколькими backend-сервисами, развёрнутое через Docker Compose в среде WSL. Продолжение практики 22: вместо ручного запуска серверов — каждый компонент в отдельном контейнере.

**Состав стека:**
- `backend1`, `backend2` — идентичные Node.js-сервисы (Express), отвечают на `GET /` с указанием своего ID
- `backend3` — резервный сервер (backup в Nginx)
- `nginx` — балансировщик нагрузки с `max_fails` и `fail_timeout`

**Структура:**
```
практика23/
├── docker-compose.yml
├── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
```

**Запуск (в WSL):**
```bash
cd практика23
docker compose up --build

# Проверка балансировки
curl http://localhost/

# Остановить один backend и проверить отказоустойчивость
docker compose stop backend1
curl http://localhost/
```

`Docker` · `Docker Compose` · `Dockerfile` · `Nginx` · `Node.js` · `WSL`

---

## Стек технологий

| Категория | Технологии |
|-----------|------------|
| Фронтенд | React, Vite, SASS/LESS, axios |
| Бэкенд | Node.js, Express.js, nanoid, cors |
| Аутентификация | bcrypt, jsonwebtoken (JWT), RBAC |
| Документация | Swagger (OpenAPI 3.0), swagger-jsdoc, swagger-ui-express |
| Базы данных | PostgreSQL (pg, Sequelize), MongoDB (mongoose) |
| Кэширование | Redis |
| Балансировка | Nginx, HAProxy |
| Контейнеризация | Docker, Docker Compose |
| PWA | Service Worker, Cache API, Web App Manifest, App Shell |
| Реальное время | Socket.IO, web-push, Push API, VAPID |
| Тестирование | Postman |