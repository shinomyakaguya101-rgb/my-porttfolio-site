(() => {
  'use strict';
  const dialog = document.querySelector('.contact-dialog');
  if (!dialog || typeof dialog.showModal !== 'function' || !window.fetch) return;
  const form = dialog.querySelector('form');
  const closeButton = dialog.querySelector('.contact-close');
  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('.contact-status');
  const workflowField = form.elements.namedItem('workflow');
  const workflowContext = form.querySelector('.contact-workflow-context');
  const fields = [...form.querySelectorAll('input, select, textarea')];
  const errors = [...form.querySelectorAll('.field-error')];
  let opener, previousOverflow = '', restored = true, outside = false;
  let pending = false, request, deadline;
  const failure = 'Your message couldn’t be submitted. Your details are still here—please try again or email me directly.';
  const uncertain = 'The submission hasn’t been confirmed. Your details are still here. Please check before sending again, or email me directly.';

  // Before enhancement, the open dialog is an ordinary inline HTML POST form.
  dialog.close();
  dialog.classList.add('contact-ready');
  closeButton.hidden = false;
  function restorePage() {
    if (restored) return;
    restored = true;
    document.body.style.overflow = previousOverflow;
    document.dispatchEvent(new Event('portfolio:overlay-change'));
    if (!document.querySelector('.booking-dialog')?.open) opener?.focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    // Restore synchronously so a booking handoff captures the unlocked page state.
    restorePage();
  }
  function open(control) {
    if (dialog.open) return;
    document.dispatchEvent(new Event('portfolio:before-contact'));
    opener = control;
    if (!pending) {
      workflowField.value = control?.dataset.workflow || '';
      workflowContext.textContent = workflowField.value ? `Workflow: ${workflowField.value}` : '';
      workflowContext.hidden = !workflowField.value;
    }
    previousOverflow = document.body.style.overflow;
    restored = false;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    document.dispatchEvent(new Event('portfolio:overlay-change'));
    (pending ? closeButton : form.elements.namedItem('name')).focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-contact]').forEach(control => control.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(control);
  }));
  closeButton.addEventListener('click', close);
  dialog.addEventListener('pointerdown', event => { outside = event.target === dialog; });
  dialog.addEventListener('click', event => {
    if (outside && event.target === dialog) close();
    outside = false;
  });
  dialog.addEventListener('close', () => { if (!dialog.open) restorePage(); });
  document.addEventListener('portfolio:before-booking', close);

  function clearErrors() {
    errors.forEach(error => { error.hidden = true; error.textContent = ''; });
    fields.forEach(field => field.removeAttribute('aria-invalid'));
  }
  function fieldError(name, message) {
    const field = form.elements.namedItem(name);
    const error = errors.find(item => item.id === `error-${name}`);
    if (!field || !error) return;
    field.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  }
  function announce(message) {
    status.textContent = message;
    status.hidden = false;
  }
  fields.forEach(field => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    const error = errors.find(item => item.id === `error-${field.name}`);
    if (error) error.hidden = true;
  }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    clearErrors();
    const data = new FormData(form);
    for (const name of ['name', 'email', 'company', 'subject', 'message']) data.set(name, String(data.get(name) || '').trim());
    let invalid = false;
    for (const name of ['name', 'email', 'company', 'subject', 'message']) {
      if (!data.get(name)) { fieldError(name, 'Please complete this field.'); invalid = true; }
    }
    if (invalid) {
      fields.find(field => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }
    if (data.get('_gotcha')) { announce(failure); return; }
    pending = true;
    const disabled = fields.map(field => field.disabled);
    fields.forEach(field => { field.disabled = true; });
    submit.disabled = true;
    submit.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    announce('Sending your message…');
    request = new AbortController();
    deadline = setTimeout(() => request.abort(), 20000);
    try {
      const response = await fetch(form.action, { method: 'POST', body: data,
        headers: { Accept: 'application/json' }, signal: request.signal });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok === true && !result.errors?.length) {
        form.reset();
        workflowContext.textContent = '';
        workflowContext.hidden = true;
        announce('Your message has been submitted. Thank you for getting in touch.');
      } else if (!response.ok) {
        if (Array.isArray(result?.errors)) result.errors.forEach(error => {
          if (typeof error.field === 'string' && typeof error.message === 'string') fieldError(error.field, error.message);
        });
        announce(failure);
      } else {
        // A malformed or ambiguous response is not proof of provider acceptance.
        announce(uncertain);
      }
    } catch {
      // No automatic retry: a lost response could follow a successful submission.
      announce(uncertain);
    } finally {
      clearTimeout(deadline);
      request = null;
      pending = false;
      fields.forEach((field, index) => { field.disabled = disabled[index]; });
      submit.disabled = false;
      submit.textContent = 'Send message';
      form.removeAttribute('aria-busy');
      if (dialog.open) status.focus({ preventScroll: true });
    }
  });
  window.addEventListener('pagehide', () => request?.abort());
  if (location.hash === '#contact') open();
})();
