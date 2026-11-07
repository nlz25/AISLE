/* Load each view's enhancements only when that view is needed. */
import './navigation.js?v=__ASSET_VERSION__';

const entrance = document.getElementById('entrance');
if (entrance) {
  await import('./portal.js?v=__ASSET_VERSION__');
  const { loadHandRig } = await import('./portal-hand.js?v=__ASSET_VERSION__');
  let research;
  const loadResearch = () => {
    if (!entrance.hidden || research) return;
    research = Promise.all([
      import('./research.js?v=__ASSET_VERSION__'),
      import('./network.js?v=__ASSET_VERSION__')
    ]).catch(error => {
      research = null;
      console.warn('Research enhancements unavailable', error);
    });
  };
  document.addEventListener('aisle:viewchange', loadResearch);
  loadResearch();

  // Defer WebGL work without waiting for either hand image to download.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const globeElement = entrance.querySelector('.portal-globe');
  let globe;
  const loadGlobe = () => {
    if (globe) return;
    if (reduced.matches || connection?.saveData) {
      globeElement.dataset.globeState = 'static';
      return;
    }
    if (entrance.hidden) return;
    globeElement.dataset.globeState = 'loading';
    globe = import('./globe.js?v=__ASSET_VERSION__').catch(error => {
      globe = null;
      globeElement.dataset.globeState = 'fallback';
      console.warn('Using static Earth artwork', error);
    });
  };
  const scheduleGlobe = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(loadGlobe, {
      timeout: 2000
    });
    else setTimeout(loadGlobe, 600);
  };
  // The static image paints without JS; articulation reuses that decoded image.
  void loadHandRig(entrance);
  scheduleGlobe();
  document.addEventListener('aisle:viewchange', scheduleGlobe);
  reduced.addEventListener('change', scheduleGlobe);
} else if (document.getElementById('results-data')) {
  await import('./research.js?v=__ASSET_VERSION__');
} else {
  const catalogueFrame = document.getElementById('task-catalogue-frame');
  if (catalogueFrame) {
    let observer;
    let pendingAnchor = location.hash;
    const catalogueAnchors = new Set(['#featured-case', '#task-library', '#task-colour', '#task-constraints', '#task-robustness', '#task-spectral', '#task-solid', '#task-quantum-dot', '#task-buchwald-hartwig']);
    const scrollToCatalogueAnchor = () => {
      if (!catalogueAnchors.has(pendingAnchor)) return;
      const target = catalogueFrame.contentDocument?.getElementById(pendingAnchor.slice(1));
      if (target && !target.getClientRects().length) {
        const catalogueWindow = catalogueFrame.contentWindow;
        catalogueFrame.contentDocument.dispatchEvent(new catalogueWindow.CustomEvent('catalog-reveal-task'));
      }
      if (target?.getClientRects().length && catalogueFrame.getClientRects().length) {
        target.scrollIntoView({ block: 'start' });
        pendingAnchor = '';
      }
    };
    const fitCatalogue = () => {
      observer?.disconnect();
      const catalogue = catalogueFrame.contentDocument?.getElementById('app');
      if (!catalogue?.firstElementChild) return;
      observer = new ResizeObserver(() => {
        const height = Math.ceil(catalogue.getBoundingClientRect().height);
        if (height > 0) catalogueFrame.style.height = `${height}px`;
        scrollToCatalogueAnchor();
      });
      observer.observe(catalogue);
    };
    window.addEventListener('hashchange', () => {
      pendingAnchor = location.hash;
      if (!catalogueFrame.getClientRects().length) {
        catalogueFrame.contentDocument?.querySelectorAll('video').forEach(video => video.pause());
      }
      scrollToCatalogueAnchor();
    });
    catalogueFrame.addEventListener('load', fitCatalogue);
    fitCatalogue();
  }
}
