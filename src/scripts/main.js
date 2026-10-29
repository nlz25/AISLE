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
  let globe;
  const loadGlobe = () => {
    if (entrance.hidden || globe || reduced.matches || connection?.saveData) return;
    globe = import('./globe.js?v=__ASSET_VERSION__').catch(error => {
      globe = null;
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
  const afterArtwork = () => requestAnimationFrame(() => requestAnimationFrame(scheduleGlobe));
  if (artwork.complete) afterArtwork();
  else artwork.addEventListener('load', afterArtwork, {
    once: true
  });
  document.addEventListener('aisle:viewchange', scheduleGlobe);
  reduced.addEventListener('change', scheduleGlobe);
} else if (document.getElementById('results-data')) {
  await import('./research.js?v=__ASSET_VERSION__');
}
