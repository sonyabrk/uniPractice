import React from 'react';

function AboutContent() {
  const techStack = [
    { name: 'Vite',            role: 'Инструмент сборки' },
    { name: 'React 18',        role: 'UI-библиотека' },
    { name: 'React Router 6',  role: 'Маршрутизация' },
    { name: 'rollup-plugin-visualizer', role: 'Анализ бандла' },
  ];

  return (
    <div>
      <p>Проект создан в учебных целях для демонстрации оптимизации бандла.</p>

      <h2>Технологии</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Технология</th>
            <th>Роль</th>
          </tr>
        </thead>
        <tbody>
          {techStack.map((t) => (
            <tr key={t.name}>
              <td>{t.name}</td>
              <td>{t.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Применённые оптимизации</h2>
      <ul>
        <li><b>Code splitting</b> - маршруты и vendor вынесены в отдельные чанки</li>
        <li><b>Lazy loading</b> — страница About и компонент AboutContent загружаются по требованию</li>
        <li><b>Tree-shaking</b> — включён автоматически (ES-модули + Rollup)</li>
        <li><b>Минификация</b> — esbuild в production-режиме</li>
        <li><b>Хэширование</b> — Vite добавляет contenthash к именам чанков</li>
        <li><b>Анализ бандла</b> — rollup-plugin-visualizer генерирует bundle-report.html</li>
      </ul>
    </div>
  );
}

export default AboutContent;