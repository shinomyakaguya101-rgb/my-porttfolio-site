(() => {
  'use strict';
  const dialog = document.querySelector('.booking-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const closeButton = dialog.querySelector('.booking-close');
  const status = dialog.querySelector('.booking-status');
  let opener;
  let requested = false;
  let ready = false;
  let deadline;
  let previousOverflow;
  let restored = true;
  function restorePage() {
    if (restored) return;
    restored = true;
    clearTimeout(deadline);
    document.body.style.overflow = previousOverflow;
    document.dispatchEvent(new Event('portfolio:overlay-change'));
    if (!document.querySelector('.contact-dialog')?.open) opener?.focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    restorePage();
  }
  document.addEventListener('portfolio:before-contact', close);

  function failed() {
    clearTimeout(deadline);
    status.hidden = false;
    status.textContent = 'The calendar is taking longer to load. You can open the booking page directly.';
  }
  function loadCalendar() {
    if (requested) return;
    requested = true;
    // Cal's official embed API performs the iframe readiness handshake.
    // Queue commands until its runtime loads; no calendar request before opening.
    if (!window.Cal) {
      const api = (...args) => api.q.push(args);
      api.q = []; api.ns = {};
      window.Cal = api;
    }
    window.Cal('init', { origin: 'https://cal.com' });
    window.Cal('on', { action: 'linkReady', callback: () => {
      ready = true;
      clearTimeout(deadline);
      status.hidden = true;
    }});
    window.Cal('on', { action: 'linkFailed', callback: failed });
    window.Cal('inline', {
      elementOrSelector: '#booking-widget',
      calLink: 'jonathan-infuseauto/audit-call',
      config: { layout: 'month_view', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' }
    });
    const script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.async = true;
    script.addEventListener('error', failed, { once: true });
    document.head.appendChild(script);
  }
  document.querySelectorAll('[data-booking]').forEach(control => control.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dialog.open) return;
    document.dispatchEvent(new Event('portfolio:before-booking'));
    // Contact has just closed; return to its visible page trigger after booking.
    opener = control.closest?.('.contact-dialog') ? document.activeElement : control;
    previousOverflow = document.body.style.overflow;
    restored = false;
    dialog.showModal();
    document.dispatchEvent(new Event('portfolio:overlay-change'));
    document.body.style.overflow = 'hidden';
    closeButton.focus({ preventScroll: true });
    if (!ready) {
      status.hidden = false;
      status.textContent = 'Opening the calendar…';
      deadline = setTimeout(failed, 15000);
    }
    loadCalendar();
  }));
  closeButton.addEventListener('click', close);
  let outside = false;
  dialog.addEventListener('pointerdown', event => { outside = event.target === dialog; });
  dialog.addEventListener('click', event => {
    if (outside && event.target === dialog) close();
    outside = false;
  });
  dialog.addEventListener('close', () => { if (!dialog.open) restorePage(); });
  // Native dialog handles Escape and keeps keyboard focus inside the overlay.
})();
