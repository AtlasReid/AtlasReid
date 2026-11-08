(() => {
  if (!window.requestAnimationFrame || !window.matchMedia) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  let frame = 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function focusDestination(target) {
    const temporary = !target.hasAttribute('tabindex');
    if (temporary) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
  }

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element && event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (link.classList.contains('skip-link')) {
      stop();
      return;
    }

    const hash = link.getAttribute('href');
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return;
    }
    if (!target) return;

    event.preventDefault();
    stop();
    const keyboard = event.detail === 0;
    const start = window.scrollY;
    const left = window.scrollX;
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const end = Math.max(0, Math.min(max, target.getBoundingClientRect().top + start - offset));
    const distance = Math.abs(end - start);
    const direction = Math.sign(end - start);
    const room = direction > 0 ? max - end : end;
    const overshoot = direction * Math.min(8, distance * 0.05, room);
    const split = overshoot ? 0.82 : 1;
    const duration = Math.min(580, 380 + Math.sqrt(distance) * 5);

    if (location.hash !== hash) {
      try {
        history.pushState(null, '', hash);
      } catch {
        location.hash = hash;
        return;
      }
    }

    function finish() {
      frame = 0;
      window.scrollTo(left, end);
      if (keyboard) focusDestination(target);
    }

    if (reducedMotion.matches || distance < 2) {
      finish();
      return;
    }

    const began = performance.now();
    function step(now) {
      if (reducedMotion.matches) {
        finish();
        return;
      }
      const t = Math.min(1, Math.max(0, (now - began) / duration));
      const position = t <= split
        ? start + (end + overshoot - start) * smootherstep(t / split)
        : end + overshoot * (1 - smootherstep((t - split) / (1 - split)));
      window.scrollTo(left, position);
      if (t < 1) frame = requestAnimationFrame(step);
      else finish();
    }
    frame = requestAnimationFrame(step);
  });

  for (const type of ['wheel', 'touchstart', 'pointerdown']) {
    window.addEventListener(type, stop, { passive: true });
  }
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(event.key)) stop();
  });
  window.addEventListener('resize', stop);
  window.addEventListener('popstate', stop);
  window.addEventListener('hashchange', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
})();
