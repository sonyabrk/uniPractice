const input   = document.getElementById('task-input');
const addBtn  = document.getElementById('add-btn');
const list    = document.getElementById('tasks-list');
const status  = document.getElementById('status');

function getTasks() {
  return JSON.parse(localStorage.getItem('tasks') || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function render() {
  const tasks = getTasks();
  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty">Задач пока нет</li>';
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

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function addTask(text) {
  const tasks = getTasks();
  tasks.push({ text, done: false });
  saveTasks(tasks);
  render();
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

// --- Events ---
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      status.textContent = 'SW: активен (' + reg.scope + ')';
    } catch (err) {
      status.textContent = 'SW: ошибка регистрации — ' + err.message;
    }
  });
} else {
  status.textContent = 'Service Worker не поддерживается браузером';
}