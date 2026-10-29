/* AISLE: small, dependency-free enhancements; the default results remain in HTML. */
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  nav?.classList.toggle('open', expanded);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu?.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));


// CSS motion also sleeps when this tab is in the background.
const syncVisibility = () => document.body.classList.toggle('page-idle', document.hidden);
document.addEventListener('visibilitychange', syncVisibility);
syncVisibility();
