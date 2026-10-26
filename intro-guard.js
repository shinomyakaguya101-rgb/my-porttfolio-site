// An independent guard restores reading even if the animation script never loads.
(() => {
  'use strict';
  const root = document.documentElement;
  const storageKey = 'jv:intro-hero-02';
  let seen = false;
  try { seen = sessionStorage.getItem(storageKey) === 'seen'; } catch (_) { /* Storage is optional. */ }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const localReplay = ['127.0.0.1', 'localhost'].includes(location.hostname) &&
    new URLSearchParams(location.search).has('intro');
  const wanted = !reduced && !location.hash && (!seen || localReplay);
  root.dataset.introState = reduced ? 'reduced-motion' : location.hash ? 'deep-link' : seen ? 'repeat-visit' : 'preparing';
  let deadline;
  let ended = !wanted;

  function finish(reason) {
    if (ended) return;
    ended = true;
    clearTimeout(deadline);
    // Stop animation writers before restoring the static HTML/CSS state.
    document.dispatchEvent(new CustomEvent('portfolio:intro-end'));
    root.classList.remove('intro-pending');
    root.dataset.introState = reason;
    const screen = document.querySelector('.intro-screen');
    if (screen) {
      screen.setAttribute('aria-hidden', 'true');
      screen.removeAttribute('style');
    }
    document.querySelector('.intro-skip')?.setAttribute('tabindex', '-1');
    document.querySelectorAll('.reveal-word, .hero-description, .hero-actions, .site-header')
      .forEach(node => node.removeAttribute('style'));
  }

  window.portfolioIntro = { wanted, finish, active: () => !ended };
  if (!wanted) return;
  root.classList.add('intro-pending');
  deadline = setTimeout(() => finish('failsafe'), 4000);
  document.addEventListener('keydown', event => {
    if (!ended && (event.key === 'Escape' || event.key === 'Tab')) {
      finish(event.key === 'Tab' ? 'keyboard-skip' : 'skipped');
      if (event.key === 'Escape') document.querySelector('main')?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('focusin', event => {
    if (!ended && !event.target.closest('.intro-screen')) finish('focus-skip');
  });
})();
