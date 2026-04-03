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
  publicKey:  'BEd6toobBoOr2wSfRO2C5FAlwxgRkTLWRuqj4ELdIKGoQyQTcnodg6ru125XTZoBa9Xcrde5EAGvoc9Ts_mND4M',
  privateKey: 'GBCpqloFsB1k_mDz8JmxQXm6VEDZPH_509dUzU0zuWM'
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

let subscriptions = [];

let server;

const certPath = path.join(__dirname, 'localhost+2.pem');
const keyPath  = path.join(__dirname, 'localhost+2-key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath)
  };
  server = https.createServer(sslOptions, app);
  console.log('🔒 Режим: HTTPS (найдены сертификаты mkcert)');
} else {
  server = http.createServer(app);
  console.log('⚠️  Режим: HTTP (сертификаты не найдены)');
  console.log('   Для HTTPS выполни: mkcert -install && mkcert localhost 127.0.0.1 ::1');
}

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('🟢 Клиент подключён:', socket.id);

  socket.on('newTask', (task) => {
    console.log('📌 Новая задача:', task.text);

    io.emit('taskAdded', task);

    const payload = JSON.stringify({
      title: 'MEMO — Новая задача',
      body:  task.text
    });

    subscriptions.forEach((sub, idx) => {
      webpush.sendNotification(sub, payload)
        .then(() => console.log(`📬 Push отправлен подписчику #${idx}`))
        .catch(err => {
          console.error(`❌ Push error (подписчик #${idx}):`, err.statusCode, err.body);
          if (err.statusCode === 410) {
            subscriptions.splice(idx, 1);
          }
        });
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Клиент отключён:', socket.id);
  });
});

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log(`✅ Новая push-подписка. Всего: ${subscriptions.length}`);
  }
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  const before = subscriptions.length;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  console.log(`❎ Отписка. Было: ${before}, стало: ${subscriptions.length}`);
  res.status(200).json({ message: 'Подписка удалена' });
});

app.get('/test-push', (req, res) => {
  if (subscriptions.length === 0) {
    return res.status(400).json({ message: 'Нет активных подписок' });
  }
  const payload = JSON.stringify({
    title: 'MEMO — Тест',
    body:  'Push-уведомления работают! 🎉'
  });
  let sent = 0;
  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, payload)
      .then(() => { sent++; })
      .catch(err => console.error('Test push error:', err));
  });
  setTimeout(() => res.json({ message: `Тест отправлен: ${subscriptions.length} подписчиков` }), 500);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const proto = (fs.existsSync(certPath) && fs.existsSync(keyPath)) ? 'https' : 'http';
  console.log(`\nСервер запущен: ${proto}://localhost:${PORT}`);
  console.log(`   Откройте в браузере: ${proto}://localhost:${PORT}\n`);
});
