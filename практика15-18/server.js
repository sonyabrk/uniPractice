const express    = require('express');
const http       = require('http');
const https      = require('https');
const socketIo   = require('socket.io');
const webpush    = require('web-push');
const bodyParser = require('body-parser');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const vapidKeys = {
  publicKey:  'BKE59XxNySZcsX7yTYpZYNA0bhXR1QFQ1ktCnbNvlySIWVbjeYYxUSDGXmhmeGVYYduHSktyaAbP69ucTWsY2gw',
  privateKey: 'qXF73lYPBQtf54uEkMBcwDmu7KKobvA82kBU3bF_LpY'
};

webpush.setVapidDetails(
  'mailto:student@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

// Хранилища (в памяти)
let subscriptions = [];                    // push-подписки
const reminders   = new Map();             

let server;

const certCandidates = [
  { cert: 'localhost+2.pem',   key: 'localhost+2-key.pem'   },
  { cert: 'localhost.pem',     key: 'localhost-key.pem'     },
];

let sslFound = null;
for (const c of certCandidates) {
  const certPath = path.join(__dirname, c.cert);
  const keyPath  = path.join(__dirname, c.key);
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    sslFound = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    console.log(`🔒 Найдены сертификаты: ${c.cert}`);
    break;
  }
}

if (sslFound) {
  server = https.createServer(sslFound, app);
  console.log('🔒 Режим: HTTPS');
} else {
  server = http.createServer(app);
  console.log('⚠️  Режим: HTTP (сертификаты не найдены)');
  console.log('   Для HTTPS: mkcert -install && mkcert localhost 127.0.0.1 ::1');
}

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

function sendPushToAll(payload) {
  subscriptions.forEach((sub, idx) => {
    webpush.sendNotification(sub, JSON.stringify(payload))
      .then(() => console.log(`📬 Push → подписчик #${idx}`))
      .catch(err => {
        console.error(`❌ Push error #${idx}:`, err.statusCode);
        if (err.statusCode === 410) subscriptions.splice(idx, 1); // удаляем протухшую подписку
      });
  });
}

function scheduleReminder(id, text, reminderTime) {
  const delay = reminderTime - Date.now();
  if (delay <= 0) {
    console.log('⚠️  Время напоминания уже прошло, пропускаем:', id);
    return;
  }

  console.log(`⏰ Напоминание #${id} через ${Math.round(delay / 1000)} сек: "${text}"`);

  const timeoutId = setTimeout(() => {
    console.log(`🔔 Отправляем напоминание #${id}: "${text}"`);
    sendPushToAll({ title: '⏰ Напоминание', body: text, reminderId: id });
    reminders.delete(id);
  }, delay);

  reminders.set(id, { timeoutId, text, reminderTime });
}

io.on('connection', (socket) => {
  console.log('🟢 Клиент подключён:', socket.id);

  socket.on('newTask', (task) => {
    console.log('📌 Новая задача:', task.text);
    io.emit('taskAdded', task);
    sendPushToAll({ title: 'MEMO — Новая задача', body: task.text, reminderId: null });
  });

  socket.on('newReminder', (reminder) => {
    const { id, text, reminderTime } = reminder;
    console.log(`📅 Новое напоминание #${id}: "${text}" в ${new Date(reminderTime).toLocaleString()}`);
    scheduleReminder(id, text, reminderTime);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Клиент отключён:', socket.id);
  });
});

app.post('/subscribe', (req, res) => {
  const sub = req.body;
  const exists = subscriptions.some(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subscriptions.push(sub);
    console.log(`✅ Подписка добавлена. Всего: ${subscriptions.length}`);
  }
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  const before = subscriptions.length;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  console.log(`❎ Отписка. Было: ${before} → стало: ${subscriptions.length}`);
  res.status(200).json({ message: 'Подписка удалена' });
});

// Практика 17: Snooze — отложить напоминание на 5 минут
app.post('/snooze', (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  console.log(`💤 Snooze запрос для #${reminderId}`);

  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(404).json({ error: 'Напоминание не найдено' });
  }

  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);  // отменяем старый таймер

  const newDelay    = 5 * 60 * 1000; // 5 минут
  const newTime     = Date.now() + newDelay;

  const newTimeoutId = setTimeout(() => {
    console.log(`🔔 Отложенное напоминание #${reminderId}: "${reminder.text}"`);
    sendPushToAll({ title: '⏰ Напоминание (отложено)', body: reminder.text, reminderId });
    reminders.delete(reminderId);
  }, newDelay);

  reminders.set(reminderId, { timeoutId: newTimeoutId, text: reminder.text, reminderTime: newTime });
  console.log(`💤 Напоминание #${reminderId} отложено на 5 минут`);
  res.status(200).json({ message: 'Напоминание отложено на 5 минут' });
});

// Тест push (GET /test-push)
app.get('/test-push', (req, res) => {
  if (subscriptions.length === 0) {
    return res.status(400).json({ message: 'Нет активных подписок. Нажми «Включить уведомления».' });
  }
  sendPushToAll({ title: 'MEMO — Тест', body: 'Push-уведомления работают! 🎉', reminderId: null });
  res.json({ message: `Тест отправлен. Подписчиков: ${subscriptions.length}` });
});

app.get('/reminders', (req, res) => {
  const list = [];
  reminders.forEach((v, k) => {
    list.push({ id: k, text: v.text, fireAt: new Date(v.reminderTime).toLocaleString() });
  });
  res.json({ count: list.length, reminders: list });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const proto = sslFound ? 'https' : 'http';
  console.log(`\n🚀 Сервер: ${proto}://localhost:${PORT}`);
  console.log(`   Тест push: ${proto}://localhost:${PORT}/test-push`);
  console.log(`   Напоминания: ${proto}://localhost:${PORT}/reminders\n`);
});
