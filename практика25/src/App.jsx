import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Маршрут Home загружается обычно
import Home from './pages/Home';

// Маршрут About загружается лениво — отдельный чанк
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <nav style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '16px' }}>Главная</Link>
        <Link to="/about">О нас</Link>
      </nav>

      <Suspense fallback={<div>Загрузка страницы...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;