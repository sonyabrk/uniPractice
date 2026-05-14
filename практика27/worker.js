import amqplib from 'amqplib';

const WORKER_ID = process.env.WORKER_ID || '1';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function runWorker() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  channel.prefetch(1); 

  await channel.assertExchange('dlx_exchange', 'direct', { durable: true });
  await channel.assertQueue('dead_letter_queue', { durable: true });
  await channel.bindQueue('dead_letter_queue', 'dlx_exchange', 'dead');
  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx_exchange',
      'x-dead-letter-routing-key': 'dead'
    }
  });

  console.log(`Worker ${WORKER_ID} запущен, ожидает задачи...`);

  channel.consume('task_queue', async (msg) => {
    if (!msg) return;

    const task = JSON.parse(msg.content.toString());
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

    console.log(`[Worker ${WORKER_ID}] Обработка задачи ${task.id} (попытка ${retryCount + 1}/${MAX_RETRIES})`);

    try {
      await processTask(task);
      channel.ack(msg);
      console.log(`[Worker ${WORKER_ID}] Задача ${task.id} выполнена успешно.`);
    } catch (err) {
      console.error(`[Worker ${WORKER_ID}] Ошибка: ${err.message}`);

      if (retryCount < MAX_RETRIES) {
        const exponentialDelay = Math.min(BASE_DELAY_MS * 2 ** retryCount, 30000);
        const jitter = Math.random() * 500;
        const waitTime = exponentialDelay + jitter;

        console.warn(`[Worker ${WORKER_ID}] Повтор через ${Math.round(waitTime)}мс...`);
        await sleep(waitTime);

        channel.nack(msg, false, false); 
        channel.sendToQueue('task_queue', msg.content, {
          persistent: true,
          headers: { 'x-retry-count': retryCount + 1 }
        });
      } else {
        console.error(`[Worker ${WORKER_ID}] Лимит попыток исчерпан. Задача ${task.id} уходит в DLQ.`);
        channel.nack(msg, false, false); // автоматически попадает в DLQ через аргументы очереди
      }
    }
  });
}

async function processTask(task) {
  // имитация нестабильного внешнего сервиса
  if (task.payload?.forceFail || Math.random() < 0.6) {
    throw new Error('Simulated service failure');
  }
  await sleep(1500); // имитация полезной работы
}

runWorker().catch(console.error);