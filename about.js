(() => {
  'use strict';
  const section = document.querySelector('.engineering-process');
  if (!section) return;
  const chart = section.querySelector('.process-chart');
  const light = section.querySelector('.process-light');
  const route = section.querySelector('.process-route');
  const routePath = route.querySelector('path');
  const groups = [...section.querySelectorAll('.process-step')];
  const halos = groups.map(group => group.querySelector('.process-halo'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const booking = document.querySelector('.booking-dialog');
  const contact = document.querySelector('.contact-dialog');
  let visible = false;
  let animations = [];
  let layoutFrame = 0;

  function updateMotion() {
    const running = animations.length > 0 && visible && !document.hidden && !motion.matches && !booking?.open && !contact?.open;
    chart.classList.toggle('process-running', running);
    animations.forEach(animation => running ? animation.play() : animation.pause());
  }
  function measureMotion() {
    layoutFrame = 0;
    animations.forEach(animation => animation.cancel());
    animations = [];
    const area = chart.getBoundingClientRect();
    const points = groups.map((group, stage) => {
      const node = group.querySelector('.process-node').getBoundingClientRect();
      return { x: node.left + node.width / 2 - area.left, y: node.top + node.height / 2 - area.top, stage };
    });
    const path = [points[0]];
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      // Route row changes around the outside of the glass reading panels.
      if (Math.abs(point.y - previous.y) > 8 && area.width >= 650) {
        const edge = previous.x > area.width / 2 ? area.width + 8 : -8;
        path.push({ x: edge, y: previous.y }, { x: edge, y: point.y });
      }
      path.push(point);
    });
    route.setAttribute('viewBox', `0 0 ${area.width} ${area.height}`);
    routePath.setAttribute('d', path.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' '));
    const distances = [0];
    path.slice(1).forEach((point, i) => distances.push(distances[i] +
      Math.hypot(point.x - path[i].x, point.y - path[i].y)));
    const total = distances.at(-1);
    if (total > 0 && !motion.matches && light.animate) {
      const transform = point => `translate(${point.x}px, ${point.y}px)`;
      const frames = [{ transform: transform(path[0]), opacity: 0, offset: 0 }];
      const visits = [];
      let time = .025;
      path.forEach((point, i) => {
        if (i) time += (distances[i] - distances[i - 1]) / total * .5;
        frames.push({ transform: transform(point), opacity: 1, offset: time });
        if (point.stage !== undefined) {
          const arrive = time;
          time += .07; // 560ms at each milestone in an eight-second cycle.
          visits[point.stage] = { arrive, leave: time };
          frames.push({ transform: transform(point), opacity: 1, offset: time });
        }
      });
      frames.push({ transform: transform(path.at(-1)), opacity: 0, offset: 1 });
      animations.push(light.animate(frames, { duration: 8000, iterations: Infinity, easing: 'linear' }));
      visits.forEach((visit, i) => {
        if (!halos[i].animate) return;
        animations.push(halos[i].animate([
          { opacity: 0, transform: 'scale(1)', offset: 0 },
          { opacity: 0, transform: 'scale(1)', offset: Math.max(0, visit.arrive - .01) },
          { opacity: 1, transform: 'scale(1.12)', offset: visit.arrive + .02 },
          { opacity: 1, transform: 'scale(1.12)', offset: visit.leave - .015 },
          { opacity: 0, transform: 'scale(1.3)', offset: visit.leave + .01 },
          { opacity: 0, transform: 'scale(1)', offset: 1 }
        ], { duration: 8000, iterations: Infinity, easing: 'linear' }));
      });
      animations.forEach(animation => animation.pause());
    }
    updateMotion();
  }
  function requestLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(measureMotion);
  }
  section.classList.add('process-ready');
  document.addEventListener('visibilitychange', updateMotion);
  document.addEventListener('portfolio:overlay-change', updateMotion);
  window.addEventListener('pageshow', requestLayout);
  motion.addEventListener('change', requestLayout);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateMotion();
  }, { threshold: 0 }).observe(chart);
  if (window.ResizeObserver) new ResizeObserver(requestLayout).observe(chart);
  else window.addEventListener('resize', requestLayout, { passive: true });
  document.fonts?.ready.then(requestLayout);
  requestLayout();
})();
