'use strict';

// All interactions are local to the browser; this site has no client-data backend.
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
if (menuButton && mobileMenu) {
  const closeMenu = (restoreFocus = false) => {
    mobileMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    if (restoreFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => {
    const opening = mobileMenu.hidden;
    mobileMenu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!mobileMenu.hidden && !mobileMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1160 && !mobileMenu.hidden) closeMenu();
  });
}

const rail = document.querySelector('[data-contact-rail]');
const railToggle = document.querySelector('[data-contact-toggle]');
if (rail && railToggle) {
  railToggle.setAttribute('aria-controls', 'contact-rail-actions');
  const actions = rail.querySelector('.contact-rail-actions');
  if (actions) actions.id = 'contact-rail-actions';
  railToggle.addEventListener('click', () => {
    const collapsed = rail.classList.toggle('is-collapsed');
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('aria-label', collapsed ? 'Open contact options' : 'Close contact options');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !rail.classList.contains('is-collapsed')) {
      rail.classList.add('is-collapsed');
      railToggle.setAttribute('aria-expanded', 'false');
      railToggle.setAttribute('aria-label', 'Open contact options');
      railToggle.focus();
    }
  });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const observer = !prefersReducedMotion && 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.08 })
  : null;
document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('is-visible'));

// Stock-photo CDNs are third parties; local photos keep content visible if their URLs fail.
document.querySelectorAll('img[data-fallback-src]').forEach(img => {
  img.addEventListener('error', () => {
    const backup = img.dataset.fallbackSrc;
    if (!backup || img.getAttribute('src') === backup) return;
    img.removeAttribute('srcset');
    img.src = backup;
  }, { once: true });
});

const form = document.querySelector('[data-whatsapp-form]');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const clean = (key, limit) => String(data.get(key) || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
    const name = clean('name', 120);
    if (!name) return;
    const lines = [
      'Hello Achola Odhiambo & Company Advocates. I would like to make a legal enquiry.',
      `Name: ${name}`,
      `Phone: ${clean('phone', 32) || 'Not provided'}`,
      `Matter: ${clean('matter', 70) || 'General legal enquiry'}`,
      `Brief summary: ${clean('message', 1000) || 'Please contact me to discuss the matter.'}`
    ];
    const link = document.createElement('a');
    link.href = 'https://wa.me/254112572628?text=' + encodeURIComponent(lines.join('\n'));
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  });
}
