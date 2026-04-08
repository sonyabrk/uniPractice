const contentDiv = document.getElementById('app-content');
const homeBtn    = document.getElementById('home-btn');
const aboutBtn   = document.getElementById('about-btn');
const statusEl   = document.getElementById('status');
const swDot      = document.getElementById('sw-dot');

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
  contentDiv.innerHTML = `
    <div class="skeleton">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line full"></div>
      <div class="skeleton-line full"></div>
    </div>`;
  try {
    const response = await fetch(`/content/${page}.html`);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const html = await response.text();
    contentDiv.innerHTML = html;
    if (page === 'home') initTasks();
  } catch (err) {
    contentDiv.innerHTML = `<p style="color:var(--danger);font-size:0.8rem;padding:40px 0;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Ошибка загрузки. Попробуйте снова.</p>`;
    console.error(err);
  }
}

homeBtn.addEventListener('click', () => { setActiveButton('home-btn'); loadContent('home'); });
aboutBtn.addEventListener('click', () => { setActiveButton('about-btn'); loadContent('about'); });
loadContent('home');

function initTasks() {
  const taskInput   = document.getElementById('task-input');
  const addBtn      = document.getElementById('add-btn');
  const remText     = document.getElementById('reminder-text');
  const remTime     = document.getElementById('reminder-time');
  const remBtn      = document.getElementById('reminder-btn');
  const list        = document.getElementById('tasks-list');
  const countEl     = document.getElementById('tasks-count');
  const doneEl      = document.getElementById('done-count');
  const reminderEl  = document.getElementById('reminder-count');

  function getTasks() {
    return JSON.parse(localStorage.getItem('tasks') || '[]');
  }
  function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function formatDt(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('ru-RU', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  function render() {
    const tasks = getTasks();
    countEl.textContent    = tasks.length;
    doneEl.textContent     = tasks.filter(t => t.done).length;
    reminderEl.textContent = tasks.filter(t => t.reminder).length;

    if (tasks.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="big-num">0</div>
          <p>Задач пока нет — добавьте первую</p>
        </div>`;
      return;
    }

    list.innerHTML = tasks.map((task, i) => `
      <li class="${task.done ? 'done' : ''} ${task.reminder ? 'has-reminder' : ''}">
        <input type="checkbox" data-i="${i}" ${task.done ? 'checked' : ''}>
        <div class="task-info">
          <span class="task-text">${escapeHtml(task.text)}</span>
          ${task.reminder
            ? `<span class="task-reminder">⏰ Напоминание: ${formatDt(task.reminder)}</span>`
            : ''}
        </div>
        <button class="del" data-i="${i}" title="Удалить">✕</button>
      </li>
    `).join('');
  }

  // Добавить обычную задачу
  function addTask(text) {
    const tasks = getTasks();
    const newTask = { id: Date.now(), text, done: false, reminder: null };
    tasks.push(newTask);
    saveTasks(tasks);
    render();
    // WebSocket: уведомить другие вкладки
    if (window._socket && window._socket.connected) {
      window._socket.emit('newTask', { text, timestamp: Date.now() });
    }
  }

  // Добавить задачу с напоминанием (Практика 17)
  function addReminder(text, reminderTimestamp) {
    const tasks = getTasks();
    const newTask = { id: Date.now(), text, done: false, reminder: reminderTimestamp };
    tasks.push(newTask);
    saveTasks(tasks);
    render();
    // Отправляем событие newReminder на сервер — он поставит таймер
    if (window._socket && window._socket.connected) {
      window._socket.emit('newReminder', {
        id:           newTask.id,
        text:         text,
        reminderTime: reminderTimestamp
      });
      console.log('newReminder отправлен:', newTask.id, new Date(reminderTimestamp).toLocaleString());
    } else {
      alert('WebSocket не подключён — напоминание не будет доставлено. Убедись что сервер запущен.');
    }
  }

  function toggleTask(i) {
    const tasks = getTasks();
    tasks[i].done = !tasks[i].done;
    saveTasks(tasks);
    render();
  }

  function deleteTask(i) {
    const tasks = getTasks();
    tasks.splice(i, 1);
    saveTasks(tasks);
    render();
  }

  // Обычная задача
  addBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text) { addTask(text); taskInput.value = ''; taskInput.focus(); }
  });
  taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });

  // Задача с напоминанием
  remBtn.addEventListener('click', () => {
    const text     = remText.value.trim();
    const datetime = remTime.value;
    if (!text) { remText.focus(); return; }
    if (!datetime) { alert('Укажи дату и время напоминания'); remTime.focus(); return; }
    const ts = new Date(datetime).getTime();
    if (ts <= Date.now()) { alert('Дата напоминания должна быть в будущем'); return; }
    addReminder(text, ts);
    remText.value = '';
    remTime.value = '';
    remText.focus();
  });
  remText.addEventListener('keydown', (e) => { if (e.key === 'Enter') remBtn.click(); });

  list.addEventListener('click', (e) => {
    const i = parseInt(e.target.dataset.i);
    if (isNaN(i)) return;
    if (e.target.classList.contains('del')) deleteTask(i);
    if (e.target.type === 'checkbox')       toggleTask(i);
  });

  render();
}

// =============================================
// WebSocket (Socket.IO)
// =============================================
function showWsToast(text) {
  const esc = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const toast = document.createElement('div');
  toast.className = 'ws-toast';
  toast.innerHTML = `<strong>📡 Новая задача от другого клиента</strong>${esc}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

const _serverOrigin = window.location.origin.replace(/:\d+$/, ':3001');
const socket = typeof io !== 'undefined'
  ? io(_serverOrigin, { transports: ['websocket', 'polling'] })
  : null;

if (socket) {
  window._socket = socket;
  socket.on('connect',    () => console.log('WebSocket подключён:', socket.id));
  socket.on('disconnect', () => console.log('WebSocket отключён'));
  socket.on('taskAdded',  (task) => { console.log('Задача от другого клиента:', task); showWsToast(task.text); });
} else {
  console.warn('Socket.IO недоступен');
}

// =============================================
// Push-уведомления (Практика 16-17)
// =============================================
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

// VAPID публичный ключ — подставляется через setup.sh
const VAPID_PUBLIC_KEY = 'BKE59XxNySZcsX7yTYpZYNA0bhXR1QFQ1ktCnbNvlySIWVbjeYYxUSDGXmhmeGVYYduHSktyaAbP69ucTWsY2gw';

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push-уведомления не поддерживаются в этом браузере.');
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await fetch(`${_serverOrigin}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    console.log('Push-подписка отправлена');
    return true;
  } catch (err) {
    console.error('Ошибка подписки на push:', err);
    return false;
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch(`${_serverOrigin}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
    console.log('Отписка выполнена');
  } catch (err) {
    console.error('Ошибка отписки:', err);
  }
}

// =============================================
// Service Worker + кнопки Push
// =============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      statusEl.textContent = 'SW: ' + reg.scope;
      swDot.classList.add('active');
      console.log('ServiceWorker зарегистрирован:', reg.scope);

      const enableBtn  = document.getElementById('enable-push');
      const disableBtn = document.getElementById('disable-push');

      if (enableBtn && disableBtn) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          enableBtn.style.display  = 'none';
          disableBtn.style.display = 'inline-block';
        }

        enableBtn.addEventListener('click', async () => {
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разреши в настройках браузера.');
            return;
          }
          if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { alert('Необходимо разрешить уведомления.'); return; }
          }
          const ok = await subscribeToPush();
          if (ok) {
            enableBtn.style.display  = 'none';
            disableBtn.style.display = 'inline-block';
          }
        });

        disableBtn.addEventListener('click', async () => {
          await unsubscribeFromPush();
          disableBtn.style.display = 'none';
          enableBtn.style.display  = 'inline-block';
        });
      }
    } catch (err) {
      statusEl.textContent = 'SW: ошибка';
      swDot.classList.add('error');
      console.error('Ошибка регистрации SW:', err);
    }
  });
} else {
  statusEl.textContent = 'SW не поддерживается';
}
