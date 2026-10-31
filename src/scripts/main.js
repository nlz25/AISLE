/* Load each view's enhancements only when that view is needed. */
import './navigation.js?v=__ASSET_VERSION__';

const entrance = document.getElementById('entrance');
if (entrance) {
  await import('./portal.js?v=__ASSET_VERSION__');
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

  // Let the artwork and heading paint before compiling the optional WebGL scene.
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
  const artwork = entrance.querySelector('.portal-arm img');
  const afterArtwork = async () => {
    // Start the hand's entrance only once its pixels can actually be painted.
    try { await artwork.decode(); } catch { /* A failed image must not block the globe. */ }
    entrance.classList.add('has-artwork');
    requestAnimationFrame(() => requestAnimationFrame(scheduleGlobe));
  };
  if (artwork.complete) afterArtwork();
  else {
    artwork.addEventListener('load', afterArtwork, { once: true });
    artwork.addEventListener('error', afterArtwork, { once: true });
  }
  document.addEventListener('aisle:viewchange', scheduleGlobe);
  reduced.addEventListener('change', scheduleGlobe);
} else if (document.getElementById('results-data')) {
  await import('./research.js?v=__ASSET_VERSION__');
}
