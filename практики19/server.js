require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

const getUnixTime = () => Math.floor(Date.now() / 1000);

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: getUnixTime, 
  },
  updated_at: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: getUnixTime,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

User.addHook('beforeUpdate', async (user) => {
  user.updated_at = getUnixTime();
});

sequelize.sync({ alter: true })
  .then(() => console.log('✅ Таблица users создана/обновлена'))
  .catch((err) => console.error('❌ Ошибка синхронизации БД:', err));

// POST /api/users - Создание
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;
    if (!first_name || !last_name || age === undefined) {
      return res.status(400).json({ error: 'Поля first_name, last_name и age обязательны' });
    }
    const user = await User.create({ 
      first_name, 
      last_name, 
      age,
      created_at: getUnixTime(), 
      updated_at: getUnixTime()
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users - Список всех
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Конкретный пользователь
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/:id - Обновление
app.patch('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    
    const updateData = { ...req.body, updated_at: getUnixTime() };
    await user.update(updateData);
    res.json(user);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Удаление
app.delete('/api/users/:id', async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});