/* This optional service never blocks entering the research network. */
export function portalCounter(portal) {
  const output = portal.querySelector('.portal-count');
  const endpoint = output?.dataset.endpoint;
  if (!endpoint) return () => {};
  let total = -1;
  let reading = false;
  let lastRead = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const format = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 6 });

  function show(value) {
    if (!Number.isSafeInteger(value) || value < 0 || value < total) return;
    const changed = total >= 0 && value > total;
    total = value;
    output.textContent = format.format(value);
    output.setAttribute('aria-label', `${value.toLocaleString('en-US')} total portal clicks`);
    output.hidden = false;
    if (changed && !reduced.matches) output.animate([
      { opacity: .35, transform: 'translate(-50%, 8px)', filter: 'blur(2px)' },
      { opacity: 1, transform: 'translate(-50%, 0)', filter: 'blur(0)' }
    ], { duration: 420, easing: 'ease-out' });
  }

  async function read() {
    if (portal.hidden || document.hidden || reading || Date.now() - lastRead < 10000) return;
    reading = true;
    lastRead = Date.now();
    try {
      const response = await fetch(endpoint, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (response.ok) show((await response.json()).total);
    } catch { /* Keep the artwork usable when the counter is unreachable. */ }
    finally { reading = false; }
  }

  async function record() {
    const body = JSON.stringify({ id: crypto.randomUUID() });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
          credentials: 'omit', cache: 'no-store', keepalive: true,
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) { show((await response.json()).total); return; }
        if (response.status < 500) return;
      } catch { /* A retry reuses its ID, so a lost response cannot double-count. */ }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  document.addEventListener('aisle:viewchange', read);
  document.addEventListener('visibilitychange', read);
  window.addEventListener('pageshow', read);
  if ('requestIdleCallback' in window) requestIdleCallback(read, { timeout: 2000 });
  else setTimeout(read, 600);
  return record;
}
