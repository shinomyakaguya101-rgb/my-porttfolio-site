(() => {
  'use strict';
  function attachNetwork(hero) {
  const closing = hero.classList.contains('closing-section');
  const footer = closing ? document.querySelector('.site-footer') : null;
  const canvas = hero?.querySelector('.hero-network');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const root = document.documentElement;
  const booking = document.querySelector('.booking-dialog');
  const contact = document.querySelector('.contact-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const signal = controller.signal;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const spriteContext = sprite.getContext('2d');
  let spriteColor = '';
  const FRAME_MS = 1000 / 30;
  const DISTANCE_SQUARED = 110 * 110;
  const REPULSION_SQUARED = 140 * 140;
  const cursor = { active: false, x: 0, y: 0 };
  let particles = [];
  let width = 1;
  let height = 1;
  let left = 0;
  let top = 0;
  let textColor = '242,242,242';
  let accentColor = '156,175,136';
  let visible = false;
  let suspended = false;
  let disposed = false;
  let opacity = 1;
  let frame = 0;
  let measureFrame = 0;
  let scrollFrame = 0;
  let lastTick = 0;
  let lastDraw = 0;

  function rgb(hex, fallback) {
    const value = hex.trim().replace('#', '');
    if (!/^[\da-f]{6}$/i.test(value)) return fallback;
    return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16)).join(',');
  }
  function paint(delta) {
    const mouse = { x: cursor.x - left, y: cursor.y + scrollY - top, degree: 0 };
    const interactive = cursor.active && pointer.matches && !motion.matches &&
      mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
    context.clearRect(0, 0, width, height);
    particles.forEach(particle => {
      particle.degree = 0;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (interactive && delta) {
        const dx = particle.x - mouse.x, dy = particle.y - mouse.y;
        const squared = dx * dx + dy * dy;
        if (squared > 1 && squared < REPULSION_SQUARED) {
          const force = (1 - squared / REPULSION_SQUARED) * 10 * delta;
          particle.x += dx / 140 * force;
          particle.y += dy / 140 * force;
        }
      }
      if (particle.x < -4) particle.x = width + 4;
      if (particle.x > width + 4) particle.x = -4;
      if (particle.y < -4) particle.y = height + 4;
      if (particle.y > height + 4) particle.y = -4;
    });
    function line(a, b, alpha) {
      const dx = a.x - b.x, dy = a.y - b.y;
      const squared = dx * dx + dy * dy;
      if (squared >= DISTANCE_SQUARED) return;
      a.degree++; b.degree++;
      context.strokeStyle = `rgba(${accentColor},${alpha * (1 - squared / DISTANCE_SQUARED)})`;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    context.lineWidth = .7;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) line(particles[i], particles[j], closing ? .22 : .13);
      if (interactive) line(particles[i], mouse, .23);
    }
    function glow(node) {
      if (!node.degree || !spriteContext) return;
      const radius = Math.min(17, 8 + node.degree * 1.5);
      context.globalAlpha = Math.min(.12, .04 + node.degree * .014);
      context.drawImage(sprite, node.x - radius, node.y - radius, radius * 2, radius * 2);
    }
    particles.forEach(glow);
    if (interactive) glow(mouse);
    context.globalAlpha = 1;
    context.fillStyle = `rgba(${textColor},${closing ? .42 : .3})`;
    context.beginPath();
    particles.forEach(particle => {
      context.moveTo(particle.x + particle.radius, particle.y);
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    });
    if (interactive) {
      context.moveTo(mouse.x + 1.5, mouse.y);
      context.arc(mouse.x, mouse.y, 1.5, 0, Math.PI * 2);
    }
    context.fill();
  }
  function canRun() {
    return !disposed && !suspended && visible && opacity > .01 && !document.hidden &&
      !motion.matches && !root.classList.contains('intro-pending') && !booking?.open && !contact?.open;
  }
  function tick(time) {
    frame = 0;
    if (!canRun()) return;
    const elapsed = time - lastTick;
    if (elapsed >= FRAME_MS) {
      lastTick = time - elapsed % FRAME_MS;
      paint(lastDraw ? Math.min(.05, (time - lastDraw) / 1000) : 0);
      lastDraw = time;
    }
    frame = requestAnimationFrame(tick);
  }
  function updateRunning() {
    if (canRun()) {
      if (!frame) { lastTick = lastDraw = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = lastTick = lastDraw = 0;
    }
  }
  function updateFade() {
    scrollFrame = 0;
    if (disposed) return;
    const progress = Math.max(0, Math.min(1, closing
      ? (scrollY + innerHeight - top) / Math.min(innerHeight * .7, height * .5)
      : (scrollY - top) / (height * .75)));
    const eased = progress * progress * (3 - 2 * progress);
    opacity = closing ? (motion.matches ? 1 : eased) : 1 - eased;
    canvas.style.opacity = String(opacity);
    updateRunning();
  }
  function measure() {
    measureFrame = 0;
    if (disposed) return;
    const bounds = hero.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width);
    const nextHeight = Math.max(1, bounds.height + (footer?.getBoundingClientRect().height || 0));
    particles.forEach(particle => {
      particle.x *= nextWidth / width;
      particle.y *= nextHeight / height;
    });
    width = nextWidth; height = nextHeight;
    left = bounds.left; top = bounds.top + scrollY;
    const count = closing ? (width < 650 ? 30 : width < 1000 ? 52 : 88) : (width < 650 ? 26 : width < 1000 ? 38 : 64);
    particles = particles.slice(0, count);
    while (particles.length < count) particles.push({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - .5) * 16, vy: (Math.random() - .5) * 16,
      radius: 1 + Math.random()
    });
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (closing) canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(root);
    textColor = rgb(style.getPropertyValue('--text'), textColor);
    accentColor = rgb(style.getPropertyValue('--accent'), accentColor);
    if (spriteContext && spriteColor !== accentColor) {
      const gradient = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, `rgba(${accentColor},.75)`);
      gradient.addColorStop(.35, `rgba(${accentColor},.3)`);
      gradient.addColorStop(1, `rgba(${accentColor},0)`);
      spriteContext.clearRect(0, 0, 64, 64);
      spriteContext.fillStyle = gradient;
      spriteContext.fillRect(0, 0, 64, 64);
      spriteColor = accentColor;
    }
    paint(0); // Also provides a static scene for reduced motion.
    updateFade();
  }
  function requestMeasure() {
    if (!disposed && !measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(measureFrame);
    cancelAnimationFrame(scrollFrame);
    intersection.disconnect();
    resize?.disconnect();
    mutations.disconnect();
    particles = [];
    canvas.width = canvas.height = 0;
    sprite.width = sprite.height = 0;
  }
  const visibility = new Map();
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => visibility.set(entry.target || hero, entry.isIntersecting));
    visible = [...visibility.values()].some(Boolean);
    updateRunning();
  });
  const resize = window.ResizeObserver ? new ResizeObserver(requestMeasure) : null;
  const mutations = new MutationObserver(records => {
    if (!hero.isConnected) { dispose(); return; }
    if (records.some(record => record.type === 'attributes' && record.target === root)) requestMeasure();
    if (records.some(record => (record.target === booking || record.target === contact))) updateRunning();
  });
  function trackPointer(event) {
    if (!pointer.matches || motion.matches || event.pointerType === 'touch') return;
    cursor.active = true; cursor.x = event.clientX; cursor.y = event.clientY;
  }
  [hero, footer].filter(Boolean).forEach(surface => {
    surface.addEventListener('pointermove', trackPointer, { passive: true, signal });
    surface.addEventListener('pointerleave', () => { cursor.active = false; }, { signal });
  });
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFade);
  }, { passive: true, signal });
  window.addEventListener('resize', requestMeasure, { passive: true, signal });
  document.addEventListener('visibilitychange', updateRunning, { signal });
  document.addEventListener('portfolio:intro-end', updateRunning, { signal });
  document.addEventListener('portfolio:overlay-change', updateRunning, { signal });
  motion.addEventListener('change', () => { cursor.active = false; paint(0); updateFade(); }, { signal });
  pointer.addEventListener('change', () => { cursor.active = false; }, { signal });
  window.addEventListener('pagehide', event => {
    if (event.persisted) { suspended = true; updateRunning(); }
    else dispose();
  }, { signal });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { suspended = false; requestMeasure(); }
  }, { signal });
  intersection.observe(hero);
  resize?.observe(hero);
  if (footer) {
    intersection.observe(footer);
    resize?.observe(footer);
    const main = document.querySelector('main');
    if (main) resize?.observe(main);
  }
  mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-theme', 'open'] });
  hero.classList.add('network-ready');
  measure();
  }
  document.querySelectorAll('.hero, .closing-section').forEach(attachNetwork);
})();
