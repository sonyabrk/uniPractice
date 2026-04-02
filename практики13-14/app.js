const input   = document.getElementById('task-input');
const addBtn  = document.getElementById('add-btn');
const list    = document.getElementById('tasks-list');
const statusEl = document.getElementById('status');
const swDot   = document.getElementById('sw-dot');
const countEl = document.getElementById('tasks-count');
const doneEl  = document.getElementById('done-count');

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      statusEl.textContent = reg.scope;
      swDot.classList.add('active');
      console.log('ServiceWorker зарегистрирован:', reg.scope);
    } catch (err) {
      statusEl.textContent = 'ошибка SW';
      swDot.classList.add('error');
      console.error('Ошибка регистрации ServiceWorker:', err);
    }
  });
} else {
  statusEl.textContent = 'SW не поддерживается';
}