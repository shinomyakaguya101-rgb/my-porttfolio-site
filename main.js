(() => {
  'use strict';
  const intro = window.portfolioIntro;
  if (!intro?.wanted || !intro.active()) return;
  const root = document.documentElement;
  const screen = document.querySelector('.intro-screen');
  const skip = document.querySelector('.intro-skip');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timeline;
  const cancel = () => {
    timeline?.kill();
    motion.removeEventListener('change', onMotionChange);
  };
  function onMotionChange(event) {
    if (event.matches) intro.finish('reduced-motion');
  }
  document.addEventListener('portfolio:intro-end', cancel, { once: true });
  motion.addEventListener('change', onMotionChange);
  skip?.addEventListener('click', () => {
    intro.finish('skipped');
    document.querySelector('main')?.focus({ preventScroll: true });
  });
  if (!window.gsap || !screen || !skip || motion.matches) {
    intro.finish(motion.matches ? 'reduced-motion' : 'animation-unavailable');
    return;
  }

  try {
    try { sessionStorage.setItem('jv:intro-hero-02', 'seen'); } catch (_) { /* Reading does not depend on storage. */ }
    screen.setAttribute('aria-hidden', 'false');
    skip.removeAttribute('tabindex');
    root.dataset.introState = 'playing';
    const gsap = window.gsap;
    gsap.set('.intro-word', { opacity: 0, y: 16, filter: 'blur(8px)' });
    gsap.set('.reveal-word', { yPercent: 110 });
    gsap.set('.hero-description, .hero-actions', { opacity: 0, y: 8 });
    timeline = gsap.timeline({ onComplete: () => queueMicrotask(() => intro.finish('complete')) });
    timeline
      .to('.intro-word-first', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, 0.08)
      .to('.intro-word-first', { opacity: 0, y: -12, filter: 'blur(8px)', duration: 0.3, ease: 'power2.in' }, 0.6)
      .to('.intro-word-second', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, 0.8)
      .to('.intro-word-second', { opacity: 0, y: -12, filter: 'blur(8px)', duration: 0.3, ease: 'power2.in' }, 1.35)
      .to(screen, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, 1.65)
      .to('.reveal-word', { yPercent: 0, duration: 0.55, stagger: 0.035, ease: 'power3.out' }, 1.85)
      .to('.hero-description', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.15)
      .to('.hero-actions', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.3);
  } catch (_) {
    intro.finish('animation-error');
  }
})();
