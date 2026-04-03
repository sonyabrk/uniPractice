// =============================================
// App Shell: навигация и загрузка контента
// =============================================
const contentDiv = document.getElementById('app-content');
const homeBtn    = document.getElementById('home-btn');
const aboutBtn   = document.getElementById('about-btn');
const statusEl   = document.getElementById('status');
const swDot      = document.getElementById('sw-dot');

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

// Загрузка динамического контента (Network First для /content/*)
async function loadContent(page) {
  // Показываем скелетон пока грузится контент
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
    contentDiv.innerHTML = `<p style="color:var(--danger);font-size:0.8rem;padding:40px 0;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Ошибка загрузки страницы. Попробуйте снова.</p>`;
    console.error(err);
  }
}

homeBtn.addEventListener('click', () => {
  setActiveButton('home-btn');
  loadContent('home');
});

aboutBtn.addEventListener('click', () => {
  setActiveButton('about-btn');
  loadContent('about');
});

// Загружаем главную при старте
loadContent('home');

// =============================================
// Функционал задач (localStorage)
// =============================================
function initTasks() {
  const input    = document.getElementById('task-input');
  const dtInput  = document.getElementById('task-datetime');
  const addBtn   = document.getElementById('add-btn');
  const list     = document.getElementById('tasks-list');
  const countEl  = document.getElementById('tasks-count');
  const doneEl   = document.getElementById('done-count');

  function getTasks() {
    return JSON.parse(localStorage.getItem('tasks') || '[]');
  }

  function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDt(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function render() {
    const tasks = getTasks();
    countEl.textContent = tasks.length;
    doneEl.textContent  = tasks.filter(t => t.done).length;

    if (tasks.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="big-num">0</div>
          <p>Задач пока нет — добавьте первую</p>
        </div>`;
      return;
    }

    list.innerHTML = tasks.map((task, i) => `
      <li class="${task.done ? 'done' : ''}">
        <input type="checkbox" data-i="${i}" ${task.done ? 'checked' : ''}>
        <div class="task-info">
          <span class="task-text">${escapeHtml(task.text)}</span>
          ${task.datetime ? `<span class="task-dt">⏰ ${formatDt(task.datetime)}</span>` : ''}
        </div>
        <button class="del" data-i="${i}" title="Удалить">✕</button>
      </li>
    `).join('');
  }

  function addTask(text, datetime) {
    const tasks = getTasks();
    tasks.push({ id: Date.now(), text, datetime: datetime || '', done: false });
    saveTasks(tasks);
    render();
    // Отправляем событие через WebSocket на сервер (Практика 16)
    if (window._socket && window._socket.connected) {
      window._socket.emit('newTask', { text, datetime, timestamp: Date.now() });
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

  addBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (text) {
      addTask(text, dtInput.value);
      input.value  = '';
      dtInput.value = '';
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });

  list.addEventListener('click', (e) => {
    const i = parseInt(e.target.dataset.i);
    if (isNaN(i)) return;
    if (e.target.classList.contains('del'))        deleteTask(i);
    if (e.target.type === 'checkbox')              toggleTask(i);
  });

  render();
}

// =============================================
// WebSocket (Socket.IO) — Практика 16
// =============================================
// Показываем всплывающее WS-уведомление
function showWsToast(text) {
  const toast = document.createElement('div');
  toast.className = 'ws-toast';
  toast.innerHTML = `<strong>📡 Новая задача от другого клиента</strong>${escapeHtmlGlobal(text)}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function escapeHtmlGlobal(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Подключение к Socket.IO серверу
// ВАЖНО: порт 3001 — где запущен server.js
const socket = typeof io !== 'undefined'
  ? io(window.location.origin.replace(/:\d+$/, ':3001'), { transports: ['websocket','polling'] })
  : null;

if (socket) {
  window._socket = socket;

  socket.on('connect', () => {
    console.log('WebSocket подключён:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket отключён');
  });

  // Получаем событие от другого клиента
  socket.on('taskAdded', (task) => {
    console.log('Задача от другого клиента:', task);
    showWsToast(task.text);
  });
} else {
  console.warn('Socket.IO недоступен — WebSocket не подключён');
}

// =============================================
// Push-уведомления — Практика 16
// =============================================

// Конвертация публичного VAPID-ключа base64 → Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

// VAPID публичный ключ — берётся из server.js (будет подставлен при настройке)
// Placeholder — заменить на реальный ключ из `npx web-push generate-vapid-keys`
const VAPID_PUBLIC_KEY = 'BEd6toobBoOr2wSfRO2C5FAlwxgRkTLWRuqj4ELdIKGoQyQTcnodg6ru125XTZoBa9Xcrde5EAGvoc9Ts_mND4M';

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
    const serverOrigin = window.location.origin.replace(/:\d+$/, ':3001');
    await fetch(`${serverOrigin}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    console.log('Push-подписка отправлена на сервер');
    return true;
  } catch (err) {
    console.error('Ошибка подписки на push:', err);
    return false;
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration   = await navigator.serviceWorker.ready;
    const subscription   = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const serverOrigin = window.location.origin.replace(/:\d+$/, ':3001');
    await fetch(`${serverOrigin}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
    console.log('Отписка от push выполнена');
  } catch (err) {
    console.error('Ошибка отписки от push:', err);
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
        // Проверяем текущий статус подписки
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          enableBtn.style.display  = 'none';
          disableBtn.style.display = 'inline-block';
        }

        enableBtn.addEventListener('click', async () => {
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разрешите их в настройках браузера.');
            return;
          }
          if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
              alert('Необходимо разрешить уведомления.');
              return;
            }
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
      console.error('Ошибка регистрации ServiceWorker:', err);
    }
  });
} else {
  statusEl.textContent = 'SW не поддерживается';
}
