(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const glow = document.querySelector('.ambient-light');
  if (!header || !glow) return;
  const root = document.documentElement;
  const dialog = document.querySelector('.booking-dialog');
  const contact = document.querySelector('.contact-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController(), signal = controller.signal;
  let scrolled = null, active = false, disposed = false, suspended = false;
  let frame = 0, headerFrame = 0, previousTime = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  function updateHeader() {
    headerFrame = 0;
    const next = scrollY > 24;
    if (next === scrolled) return;
    scrolled = next;
    header.classList.toggle('is-scrolled', scrolled);
  }
  function canRun() {
    return active && !disposed && !suspended && !document.hidden && !motion.matches &&
      pointer.matches && !dialog?.open && !contact?.open && !root.classList.contains('intro-pending');
  }
  function tick(time) {
    frame = 0;
    if (!canRun()) { updateRunning(); return; }
    const delta = previousTime ? Math.min(64, time - previousTime) : 16;
    previousTime = time;
    const amount = 1 - Math.exp(-delta / 80);
    x += (targetX - x) * amount; y += (targetY - y) * amount;
    const settled = Math.abs(targetX - x) + Math.abs(targetY - y) < .25;
    if (settled) { x = targetX; y = targetY; previousTime = 0; }
    glow.style.transform = `translate(${x - 160}px, ${y - 160}px)`;
    glow.classList.toggle('ambient-moving', !settled);
    if (!settled) frame = requestAnimationFrame(tick);
  }
  function updateRunning() {
    const enabled = canRun();
    glow.style.opacity = enabled ? '.5' : '0';
    if (enabled) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame); frame = previousTime = 0;
      glow.classList.remove('ambient-moving');
    }
  }
  function resume() {
    if (disposed) return;
    cancelAnimationFrame(headerFrame); headerFrame = 0;
    updateHeader(); updateRunning();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; controller.abort();
    cancelAnimationFrame(frame); cancelAnimationFrame(headerFrame);
    observer.disconnect(); glow.style.opacity = '0';
    glow.classList.remove('ambient-moving');
  }
  const observer = new MutationObserver(records => {
    if (!header.isConnected || !glow.isConnected) { dispose(); return; }
    if (records.some(record => (record.target === dialog || record.target === contact))) updateRunning();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  document.addEventListener('pointermove', event => {
    if (!pointer.matches || motion.matches || event.pointerType === 'touch') return;
    targetX = event.clientX; targetY = event.clientY;
    if (!active) { x = targetX; y = targetY; }
    active = true; updateRunning();
  }, { passive: true, signal });
  document.addEventListener('pointerout', event => {
    if (event.relatedTarget !== null) return;
    active = false; updateRunning();
  }, { signal });
  window.addEventListener('scroll', () => {
    if (!document.hidden && !headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  }, { passive: true, signal });
  document.addEventListener('visibilitychange', resume, { signal });
  document.addEventListener('portfolio:intro-end', resume, { signal });
  document.addEventListener('portfolio:overlay-change', resume, { signal });
  pointer.addEventListener('change', () => { active = false; updateRunning(); }, { signal });
  motion.addEventListener('change', updateRunning, { signal });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { dispose(); return; }
    suspended = true; cancelAnimationFrame(headerFrame); headerFrame = 0; updateRunning();
  }, { signal });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { suspended = false; resume(); }
  }, { signal });
  root.classList.add('effects-ready'); resume();
})();
