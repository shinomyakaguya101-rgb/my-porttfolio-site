(() => {
  'use strict';
  const section = document.querySelector('#work');
  if (!section) return;
  const records = JSON.parse(document.querySelector('#work-data').textContent);
  const scroller = section.querySelector('.work-scroller');
  const stage = section.querySelector('.work-stage');
  const openingShell = section.querySelector('.work-opening-shell');
  const opening = section.querySelector('.work-opening');
  const openingLines = [...opening.querySelectorAll('.opening-line')];
  const openingSubheadline = opening.querySelector('.work-opening-subheadline');
  const browser = section.querySelector('.work-browser');
  const list = section.querySelector('.work-list');
  const listShell = section.querySelector('.work-list-shell');
  const instruction = section.querySelector('.work-instruction');
  const rows = [...section.querySelectorAll('.work-row')];
  const marker = section.querySelector('.work-pointer');
  const detail = section.querySelector('.work-detail');
  const detailTitle = section.querySelector('#work-detail-title');
  const track = section.querySelector('.flow-track');
  const gsap = window.gsap;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 700px) and (min-height: 600px)');
  const driver = { distance: 0 };
  const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
  const smooth = n => n * n * (3 - 2 * n);
  let enhanced = false;
  let openingEnhanced = false;
  let centers = [];
  let sectionTop = 0;
  let viewport = innerHeight;
  let travel = 0;
  let openingTop = 0;
  let openingTravel = 1;
  let lastOpeningProgress = null;
  let savedListOffset = 0;
  let selected = null;
  let busy = false;
  let frame = 0;
  let focusOverride = null;
  let listInert = false;
  let detailOnscreen = false;
  let motionFrame = 0;
  let previousFrameTime = 0;
  let scrollTarget = 0;
  let openingRequested = false;
  let listRequested = false;

  function flowWidth() {
    detail.style.setProperty('--flow-width', `${track.getBoundingClientRect().width}px`);
  }
  function updateFlow() {
    const visible = !detail.hidden && detailOnscreen && !document.hidden && !motion.matches;
    detail.classList.toggle('flow-running', visible);
  }
  function setInert(node, value) {
    node.inert = value;
  }
  function measure() {
    const shouldEnhance = !!gsap && desktop.matches && !motion.matches;
    enhanced = shouldEnhance;
    section.classList.toggle('work-enhanced', enhanced);
    viewport = innerHeight;
    openingEnhanced = !!gsap && !motion.matches && viewport >= 600;
    section.classList.toggle('opening-enhanced', openingEnhanced);
    openingTop = openingShell.getBoundingClientRect().top + scrollY;
    openingTravel = Math.max(1, openingShell.offsetHeight - viewport);
    lastOpeningProgress = null;
    if (!openingEnhanced) [openingSubheadline, ...openingLines].forEach(el => {
      el.style.removeProperty('transform'); el.style.removeProperty('opacity');
    });
    if (!detail.hidden) { flowWidth(); return; }
    if (!enhanced) {
      section.style.removeProperty('--work-height');
      rows.forEach(row => row.classList.remove('is-marker-current'));
      [list, listShell, instruction, browser, marker, ...rows].forEach(el => {
        el.style.removeProperty('transform');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
      });
      setInert(browser, false);
      setInert(listShell, false); listInert = false;
      sectionTop = section.getBoundingClientRect().top + scrollY;
      flowWidth();
      return;
    }
    const listTop = list.getBoundingClientRect().top;
    centers = rows.map(row => row.getBoundingClientRect().top - listTop + row.getBoundingClientRect().height / 2);
    const span = centers.at(-1) - centers[0];
    travel = Math.max(1100, span * 3.2);
    section.style.setProperty('--work-height', `${viewport + travel}px`);
    sectionTop = scroller.getBoundingClientRect().top + scrollY;
    flowWidth();
  }
  function renderOpening() {
    if (!openingEnhanced) return;
    const progress = clamp((scrollY - openingTop) / openingTravel);
    if (progress === lastOpeningProgress) return;
    lastOpeningProgress = progress;
    openingLines.forEach((line, i) => {
      const amount = smooth(clamp((progress - i * .1) / .25));
      gsap.set(line, { opacity: amount, y: 50 * (1 - amount), rotationX: 80 * (1 - amount) });
    });
    const subAmount = smooth(clamp((progress - .5) / .15));
    gsap.set(openingSubheadline, { opacity: subAmount, y: 20 * (1 - subAmount) });
  }
  function render() {
    if (!enhanced || !detail.hidden) return;
    const progress = clamp(driver.distance / travel);
    const listOpacity = 1;
    const span = centers.at(-1) - centers[0];
    const targetCenter = centers[0] + progress * span;
    let lower = 0;
    while (lower < centers.length - 2 && centers[lower + 1] < targetCenter) lower++;
    const index = lower + clamp((targetCenter - centers[lower]) / (centers[lower + 1] - centers[lower]));
    const focusY = viewport * .35;
    // Keep one reading position: every name rises through it, including the last.
    // At the end, native sticky release carries the list upward with Services.
    const groupY = focusY - targetCenter;
    gsap.set(browser, { opacity: 1 });
    gsap.set(list, { y: groupY });
    gsap.set([listShell, instruction], { opacity: listOpacity });
    const focus = focusOverride === null ? index : focusOverride;
    const pointerY = focusOverride === null ? focusY : groupY + centers[focusOverride];
    gsap.set(marker, { y: pointerY - 6, opacity: listOpacity });
    rows.forEach((row, i) => {
      row.classList.toggle('is-marker-current', i === Math.round(focus));
      const distance = Math.abs(i - focus);
      const clarity = clamp(1 - distance * .11, .65, 1);
      gsap.set(row, { opacity: clarity, filter: `blur(${Math.min(6, distance * 2.2)}px)` });
    });
    const nextListInert = listOpacity < .2;
    if (nextListInert !== listInert) {
      listInert = nextListInert; setInert(listShell, listInert);
    }
  }
  // Drive scroll progress directly from native frames, independently of reusable
  // GSAP tween state, and resynchronize after fonts, resizing and returning.
  function advanceScroll(time) {
    motionFrame = 0;
    if (!enhanced || !detail.hidden || document.hidden) { previousFrameTime = 0; return; }
    const elapsed = previousFrameTime ? Math.min(64, time - previousFrameTime) : 16;
    previousFrameTime = time;
    driver.distance += (scrollTarget - driver.distance) * (1 - Math.exp(-elapsed / 140));
    const settled = Math.abs(scrollTarget - driver.distance) < .05;
    if (settled) driver.distance = scrollTarget;
    render();
    if (settled) previousFrameTime = 0;
    else motionFrame = requestAnimationFrame(advanceScroll);
  }
  function sync(immediate = false) {
    frame = 0;
    renderOpening();
    if (!enhanced || !detail.hidden) return;
    const distance = clamp(scrollY - sectionTop, -viewport, travel);
    if (!immediate && distance === scrollTarget && !motionFrame) return;
    scrollTarget = distance;
    if (immediate) {
      cancelAnimationFrame(motionFrame);
      motionFrame = previousFrameTime = 0;
      driver.distance = distance;
      render();
    } else if (!motionFrame) motionFrame = requestAnimationFrame(advanceScroll);
  }
  function requestSync() {
    focusOverride = null;
    if (document.hidden) return;
    if (!frame) frame = requestAnimationFrame(() => sync());
  }
  function cancelFrames() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(motionFrame);
    frame = motionFrame = previousFrameTime = 0;
  }
  function resume() {
    cancelFrames();
    if (!document.hidden) { measure(); focusOverride = null; sync(true); }
    updateFlow();
  }
  function openingDestination() {
    return Math.max(0, openingEnhanced ? openingTop + openingTravel * .65 : openingTop - 96);
  }
  function navigateOpening() {
    if (busy) { openingRequested = true; return; }
    openingRequested = false;
    if (!detail.hidden) { backToList('opening'); return; }
    measure();
    window.scrollTo({ top: openingDestination(), behavior: 'instant' });
    focusOverride = null;
    sync(true);
  }
  function listDestination() {
    return Math.max(0, enhanced ? scroller.getBoundingClientRect().top + scrollY :
      list.getBoundingClientRect().top + scrollY - 112);
  }
  function navigateList() {
    if (busy) { listRequested = true; return; }
    listRequested = false;
    if (!detail.hidden) { backToList('first'); return; }
    measure();
    window.scrollTo({ top: listDestination(), behavior: 'instant' });
    focusOverride = null;
    sync(true);
    scroller.focus({ preventScroll: true });
  }
  function fadeView(node, from, to, duration, done) {
    if (motion.matches || !node.animate) { node.style.opacity = String(to); done(); return; }
    let finished = false;
    const animation = node.animate([{ opacity: from }, { opacity: to }], {
      duration, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards'
    });
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      node.style.opacity = String(to);
      animation.cancel();
      done();
    };
    // Navigation must complete even if a browser suspends an animation callback.
    const deadline = setTimeout(finish, duration + 100);
    animation.onfinish = finish;
  }
  const swapOut = (node, done) => fadeView(node, getComputedStyle(node).opacity, 0, 240, done);
  const swapIn = (node, done) => fadeView(node, 0, 1, 400, done);
  function showProject(row) {
    if (busy || !detail.hidden) return;
    busy = true;
    selected = row;
    savedListOffset = -scroller.getBoundingClientRect().top;
    focusOverride = null;
    cancelFrames();
    const data = records[Number(row.dataset.project)];
    detailTitle.textContent = data.title;
    detail.querySelector('.work-problem').textContent = data.problem;
    ['trigger', 'process', 'output'].forEach(key => {
      detail.querySelector(`[data-step="${key}"]`).textContent = data[key];
    });
    const image = detail.querySelector('.work-image');
    const visual = detail.querySelector('.work-visual');
    const placeholder = detail.querySelector('.work-image-placeholder');
    const caption = detail.querySelector('.work-media figcaption');
    image.onload = null;
    image.onerror = null;
    image.hidden = true;
    image.removeAttribute('src');
    image.removeAttribute('srcset');
    image.alt = '';
    visual.classList.remove('has-work-image');
    placeholder.hidden = false;
    caption.hidden = true;
    if (data.image) {
      image.onload = () => {
        image.hidden = false;
        visual.classList.add('has-work-image');
        placeholder.hidden = true;
        caption.hidden = false;
      };
      image.onerror = () => {
        image.hidden = true;
        visual.classList.remove('has-work-image');
        placeholder.hidden = false;
        caption.hidden = true;
      };
      image.alt = data.imageAlt;
      image.sizes = '(max-width: 650px) calc(100vw - 48px), (max-width: 979px) 45vw, 48vw';
      image.srcset = `${data.imageSmall} 800w, ${data.image} 1600w`;
      image.src = data.image;
    }
    detail.querySelector('[data-workflow-enquiry]').dataset.workflow = data.title;
    swapOut(stage, () => {
      scroller.hidden = true;
      detail.hidden = false;
      detail.style.opacity = '0';
      window.scrollTo({ top: Math.max(0, detail.getBoundingClientRect().top + scrollY - 96), behavior: 'instant' });
      flowWidth();
      swapIn(detail, () => {
        busy = false;
        detailTitle.focus({ preventScroll: true });
        updateFlow();
        if (listRequested) navigateList();
        else if (openingRequested) navigateOpening();
      });
    });
  }
  function backToList(destination = 'list') {
    if (busy || detail.hidden) return;
    busy = true;
    detail.classList.remove('flow-running');
    swapOut(detail, () => {
      detail.hidden = true;
      openingShell.hidden = false;
      scroller.hidden = false;
      stage.style.opacity = '0';
      measure();
      const target = destination === 'first' ? listDestination() : destination === 'opening' ? openingDestination() :
        scroller.getBoundingClientRect().top + scrollY + savedListOffset;
      window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
      focusOverride = null;
      sync(true);
      swapIn(stage, () => {
        busy = false;
        if (destination === 'first') scroller.focus({ preventScroll: true });
        else if (destination === 'list') selected?.focus({ preventScroll: true });
        else opening.querySelector('h2')?.focus({ preventScroll: true });
        focusOverride = null;
        sync(true);
        if (listRequested) navigateList();
        else if (openingRequested) navigateOpening();
      });
    });
  }
  rows.forEach((row, i) => {
    row.addEventListener('click', event => {
      event.preventDefault();
      showProject(row);
    });
    row.addEventListener('focus', () => {
      if (!enhanced || busy || !row.matches(':focus-visible')) return;
      // Focus keeps the chosen title clear without altering the native scroll position.
      focusOverride = i;
      render();
    });
    row.addEventListener('blur', () => { focusOverride = null; render(); });
  });
  detail.querySelector('.work-back').addEventListener('click', () => backToList());
  document.querySelectorAll('a[href="#work"]').forEach(anchor => anchor.addEventListener('click', event => {
    event.preventDefault();
    window.history?.replaceState(null, '', '#work');
    navigateOpening();
  }));
  document.querySelectorAll('a[href="#work-list"]').forEach(anchor => anchor.addEventListener('click', event => {
    event.preventDefault();
    window.history?.replaceState(null, '', '#work-list');
    navigateList();
  }));
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pagehide', cancelFrames);
  window.addEventListener('pageshow', resume);
  document.querySelector('.booking-dialog')?.addEventListener('close', resume);
  document.querySelector('.contact-dialog')?.addEventListener('close', resume);
  new IntersectionObserver(entries => {
    detailOnscreen = entries[0].isIntersecting;
    updateFlow();
  }).observe(detail);
  const resize = () => { measure(); sync(true); updateFlow(); };
  motion.addEventListener('change', resize);
  desktop.addEventListener('change', resize);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', requestSync, { passive: true });
  section.classList.add('work-ready');
  measure(); sync(true);
  document.fonts.ready.then(resize);
})();
