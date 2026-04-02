const contentDiv = document.getElementById('app-content');
const homeBtn    = document.getElementById('home-btn');
const aboutBtn   = document.getElementById('about-btn');
const statusEl   = document.getElementById('status');
const swDot      = document.getElementById('sw-dot');

const socket = io('https://localhost:3001');

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
  contentDiv.innerHTML = `
    <div class="loader">
      <span></span><span></span><span></span>
    </div>`;

  try {
    const response = await fetch(`./content/${page}.html`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    contentDiv.innerHTML = html;

    if (page === 'home') {
      initTasks();
    }
  } catch (err) {
    contentDiv.innerHTML = `
      <div style="padding:64px 0; text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:5rem; color:#222">ERR</div>
        <p style="font-size:0.75rem; letter-spacing:0.15em; text-transform:uppercase; color:#555; margin-top:8px;">
          Ошибка загрузки: ${escapeHtml(err.message)}
        </p>
      </div>`;
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

loadContent('home');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getTasks() {
  return JSON.parse(localStorage.getItem('tasks') || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function initTasks() {
  const input   = document.getElementById('task-input');
  const addBtn  = document.getElementById('add-btn');
  const list    = document.getElementById('tasks-list');
  const countEl = document.getElementById('tasks-count');
  const doneEl  = document.getElementById('done-count');

  function render() {
    const tasks = getTasks();

    if (countEl) countEl.textContent = tasks.length;
    if (doneEl)  doneEl.textContent  = tasks.filter(t => t.done).length;

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
        <span>${escapeHtml(task.text)}</span>
        <button class="del" data-i="${i}" title="Удалить">✕</button>
      </li>
    `).join('');
  }

  function addTask(text) {
    const tasks = getTasks();
    tasks.push({ text, done: false });
    saveTasks(tasks);
    render();

    socket.emit('newTask', { text, timestamp: Date.now() });
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
      addTask(text);
      input.value = '';
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });

  list.addEventListener('click', (e) => {
    const i = parseInt(e.target.dataset.i);
    if (isNaN(i)) return;
    if (e.target.classList.contains('del')) deleteTask(i);
    if (e.target.type === 'checkbox') toggleTask(i);
  });

  render();
}

socket.on('taskAdded', (task) => {
  const notification = document.createElement('div');
  notification.textContent = `Новая задача: ${task.text}`;
  notification.style.cssText = `
    position: fixed; top: 16px; right: 16px;
    background: #d4f542; color: #0a0a0a;
    padding: 12px 20px;
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    z-index: 10000;
    border-left: 3px solid #0a0a0a;
    animation: fadeUp 0.3s ease both;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BBPvjIngJ9Cw71rr6xd4lzFaAPbFnaiOGbqb4fGwlX93YNjeZIenxIzT-q7LTJb_KYpIuSw-0DMVq63s0LzBUmA')
    });
    await fetch('https://localhost:3001/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    console.log('Подписка на push отправлена');
  } catch (err) {
    console.error('Ошибка подписки на push:', err);
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await fetch('https://localhost:3001/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
    console.log('Отписка выполнена');
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      statusEl.textContent = reg.scope;
      swDot.classList.add('active');

      const enableBtn  = document.getElementById('enable-push');
      const disableBtn = document.getElementById('disable-push');

      if (enableBtn && disableBtn) {
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          enableBtn.style.display  = 'none';
          disableBtn.style.display = 'inline-block';
        }

        enableBtn.addEventListener('click', async () => {
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разрешите их в настройках браузера.');
            return;
          }
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              alert('Необходимо разрешить уведомления.');
              return;
            }
          }
          await subscribeToPush();
          enableBtn.style.display  = 'none';
          disableBtn.style.display = 'inline-block';
        });

        disableBtn.addEventListener('click', async () => {
          await unsubscribeFromPush();
          disableBtn.style.display = 'none';
          enableBtn.style.display  = 'inline-block';
        });
      }
    } catch (err) {
      statusEl.textContent = 'ошибка SW';
      swDot.classList.add('error');
      console.error('SW registration failed:', err);
    }
  });
} else {
  statusEl.textContent = 'SW не поддерживается';
}