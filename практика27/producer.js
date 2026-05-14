import express from 'express';
import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

let connection, channel;

async function initRabbit() {
  connection = await amqplib.connect('amqp://localhost');
  channel = await connection.createChannel();

  // настройка DLX и Dead Letter Queue
  await channel.assertExchange('dlx_exchange', 'direct', { durable: true });
  await channel.assertQueue('dead_letter_queue', { durable: true });
  await channel.bindQueue('dead_letter_queue', 'dlx_exchange', 'dead');

  // настройка основной очередь
  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx_exchange',
      'x-dead-letter-routing-key': 'dead'
    }
  });
  console.log('Producer: Очереди RabbitMQ инициализированы.');
}

app.post('/tasks', async (req, res) => {
  try {
    const task = {
      id: uuidv4(),
      type: req.body.type || 'default',
      payload: req.body.payload || {},
      createdAt: new Date().toISOString()
    };

    await channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(task)), {
      persistent: true,
      headers: { 'x-retry-count': 0 }
    });

    console.log(`Producer: Задача ${task.id} отправлена в очередь.`);
    res.status(202).json({ status: 'accepted', taskId: task.id });
  } catch (err) {
    console.error('Producer error:', err.message);
    res.status(500).json({ error: 'Не удалось добавить задачу в очередь' });
  }
});

initRabbit().then(() => {
  app.listen(3000, () => console.log('Producer API запущен: http://localhost:3000'));
}).catch(console.error);