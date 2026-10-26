(() => {
  'use strict';
  const accordion = document.querySelector('.services-accordion');
  if (!accordion) return;
  const panels = [...accordion.querySelectorAll('.service-panel')];
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let active = null;
  let hovered = -1;
  let tapped = -1;
  function select(index) {
    if (index === active) return;
    active = index;
    accordion.classList.toggle('has-active', index >= 0);
    panels.forEach((panel, i) => {
      const open = i === index;
      panel.classList.toggle('is-open', open);
      panel.querySelector('.service-trigger').setAttribute('aria-expanded', String(open));
      const content = panel.querySelector('.service-content');
      content.setAttribute('aria-hidden', String(!open));
      content.inert = !open;
    });
  }
  function focusedIndex() {
    return panels.findIndex(panel => panel.contains(document.activeElement) &&
      panel.querySelector('.service-trigger').matches(':focus-visible'));
  }
  function sync() {
    const focused = focusedIndex();
    select(hovered >= 0 ? hovered : focused >= 0 ? focused : tapped);
  }
  accordion.classList.add('services-ready');
  select(-1);
  panels.forEach((panel, index) => {
    const trigger = panel.querySelector('.service-trigger');
    trigger.addEventListener('click', event => {
      if (finePointer.matches) { if (event.detail !== 0) hovered = index; sync(); return; }
      tapped = tapped === index ? -1 : index;
      sync();
    });
    trigger.addEventListener('focus', sync);
    panel.addEventListener('pointerenter', event => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      hovered = index; tapped = -1; sync();
    });
  });
  accordion.addEventListener('pointerleave', () => { hovered = -1; sync(); });
  accordion.addEventListener('focusout', () => queueMicrotask(sync));
  document.addEventListener('pointerdown', event => {
    if (!accordion.contains(event.target)) { tapped = hovered = -1; select(-1); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    tapped = hovered = -1; select(-1);
  });
  finePointer.addEventListener('change', () => { tapped = hovered = -1; select(-1); });
})();
