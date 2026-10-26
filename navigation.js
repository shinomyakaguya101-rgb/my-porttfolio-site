(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.nav-menu');
  const nav = header?.querySelector('.main-nav');
  if (!toggle || !nav) return;
  const mobile = matchMedia('(max-width: 760px)');
  let open = false;
  function setOpen(value, restore = false) {
    open = mobile.matches && value;
    header.classList.toggle('is-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.inert = mobile.matches && !open;
    if (restore) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', event => {
    setOpen(!open);
    if (open && event.detail === 0) nav.querySelector('a')?.focus({ preventScroll: true });
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  header.querySelector('.identity').addEventListener('click', () => setOpen(false));
  document.addEventListener('pointerdown', event => {
    if (open && !header.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
  });
  document.addEventListener('portfolio:before-contact', () => setOpen(false));
  document.addEventListener('portfolio:before-booking', () => setOpen(false));
  mobile.addEventListener('change', () => setOpen(false));
  window.addEventListener('pageshow', () => setOpen(false));
  toggle.hidden = false;
  document.documentElement.classList.add('nav-ready');
  setOpen(false);
})();
