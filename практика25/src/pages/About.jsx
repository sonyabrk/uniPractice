import React, { Suspense, lazy } from 'react';

const AboutContent = lazy(() => import('../components/AboutContent'));

function About() {
  return (
    <div>
      <h1>О нас</h1>
      <Suspense fallback={<div>Загрузка контента...</div>}>
        <AboutContent />
      </Suspense>
    </div>
  );
}

export default About;