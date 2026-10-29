/* The hash is the view state, so direct links, reload and Back/Forward stay useful. */
(() => {
  const portal = document.getElementById('entrance');
  const content = document.getElementById('research-content');
  if (!portal || !content) return;
  const enter = portal.querySelector('.portal-enter');
  const heading = document.getElementById('network-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let transitionTimer;

  const isEntrance = () => !location.hash || ['#entrance', '#main'].includes(location.hash);
  function renderView({focus = false, animate = false} = {}) {
    clearTimeout(transitionTimer);
    portal.classList.remove('is-leaving');
    const opening = isEntrance();
    portal.hidden = !opening;
    portal.inert = !opening;
    content.hidden = opening;
    content.inert = opening;
    document.body.classList.toggle('portal-open', opening);
    content.classList.toggle('is-arriving', animate && !opening && !reduced.matches);
    document.dispatchEvent(new Event('aisle:viewchange'));
    if (opening) {
      window.scrollTo({top: 0, behavior: 'instant'});
      if (focus) enter.focus({preventScroll: true});
    } else {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = 'network'; }
      const target = document.getElementById(id) || heading;
      if (focus || id !== 'network') target.scrollIntoView({block: 'start', behavior: 'instant'});
      if (focus && id === 'network') heading.focus({preventScroll: true});
    }
  }

  enter.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (portal.classList.contains('is-leaving')) return;
    const reveal = () => {
      history.pushState(null, '', '#network');
      renderView({focus: true, animate: true});
    };
    if (reduced.matches) reveal();
    else {
      portal.classList.add('is-leaving');
      transitionTimer = setTimeout(reveal, 480);
    }
  });
  window.addEventListener('hashchange', () => renderView({focus: true}));
  window.addEventListener('pageshow', event => { if (event.persisted) renderView(); });
  document.body.classList.add('portal-ready');
  renderView();
})();
