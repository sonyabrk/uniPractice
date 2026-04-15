require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Подключено к MongoDB'))
  .catch(err => console.error('Ошибка подключения:', err));

const getUnixTime = () => Math.floor(Date.now() / 1000);

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0 },
  created_at: { 
    type: Number, 
    required: true, 
    default: () => Math.floor(Date.now() / 1000)
  },
  updated_at: { 
    type: Number, 
    required: true, 
    default: () => Math.floor(Date.now() / 1000)
  },
}, {
  collection: 'users',
  timestamps: false 
});


const User = mongoose.model('User', userSchema);

// POST /api/users — Создание
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;
    if (!first_name || !last_name || age === undefined) {
      return res.status(400).json({ error: 'Поля first_name, last_name и age обязательны' });
    }
    const now = getUnixTime();
    const user = new User({ 
      first_name, 
      last_name, 
      age,
      created_at: now,
      updated_at: now
    });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Create error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users — Список всех
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id — Конкретный пользователь
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/:id — Обновление
app.patch('/api/users/:id', async (req, res) => {
  try {
    const now = getUnixTime();
    const { created_at, updated_at, ...updateData } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updated_at: now },
      { new: true, runValidators: true }
    ).lean();
    
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/users/:id — Удаление
app.delete('/api/users/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});