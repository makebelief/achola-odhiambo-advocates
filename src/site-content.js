const pageKey = ({ '/': 'home', '/about': 'about', '/practice-areas': 'practice', '/managing-partner': 'partner', '/insights': 'insights', '/contact': 'contact' })[location.pathname.replace(/\/$/, '') || '/'];

function setHero(content) {
  if (!pageKey) return;
  const hero = document.querySelector(pageKey === 'home' ? '.home-hero-copy' : '.page-hero > div');
  const heading = hero?.querySelector('h1');
  const description = hero?.querySelector(pageKey === 'home' ? '.hero-lede' : 'h1 + p');
  if (heading) {
    heading.replaceChildren(document.createTextNode(`${content[`${pageKey}_heading`]} `));
    const highlight = document.createElement('span');
    highlight.textContent = content[`${pageKey}_highlight`];
    heading.append(highlight);
  }
  if (description) description.textContent = content[`${pageKey}_description`];
}

function setContactDetails(content) {
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.href = `tel:${content.phone_e164}`;
    if (link.textContent.trim()) link.textContent = content.phone_display;
  });
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
    const url = new URL(link.href);
    if (url.pathname === '/' || !/\/\d+/.test(url.pathname)) return;
    url.pathname = `/${content.whatsapp_number}`;
    link.href = url.toString();
  });
  document.querySelectorAll('.site-footer .footer-kicker').forEach(kicker => {
    if (kicker.textContent.trim() !== 'Office') return;
    const address = kicker.parentElement?.querySelector('p');
    if (address) address.replaceChildren(document.createTextNode(content.office_line_1), document.createElement('br'), document.createTextNode(content.office_line_2));
  });
  const facts = document.querySelectorAll('.home-hero .hero-facts strong');
  if (facts[0]) facts[0].textContent = `${content.office_line_1}, ${content.office_line_2.replace(/,\s*Kenya$/i, '')}`;
  if (facts[1]) facts[1].textContent = content.phone_display;
  const contactFacts = document.querySelectorAll('.contact-facts > div');
  if (contactFacts[1]) {
    const location = contactFacts[1].querySelector('strong');
    if (location) location.replaceChildren(document.createTextNode(content.office_line_1), document.createElement('br'), document.createTextNode(content.office_line_2));
  }
  const form = document.querySelector('[data-whatsapp-form]');
  if (form) form.dataset.whatsappNumber = content.whatsapp_number;
}

function setPracticeAreas(areas) {
  const rows = document.querySelectorAll('.service-list > article');
  if (rows.length !== 8 || areas.length !== 8) return;
  areas.forEach((area, index) => {
    const heading = rows[index].querySelector('h2');
    const description = rows[index].querySelector('p');
    if (heading) heading.textContent = area.title;
    if (description) description.textContent = area.description;
  });
}

fetch('/api/site-content', { headers: { Accept: 'application/json' } })
  .then(response => response.ok ? response.json() : Promise.reject())
  .then(({ content, practiceAreas }) => {
    setHero(content);
    setContactDetails(content);
    if (location.pathname.replace(/\/$/, '') === '/practice-areas') setPracticeAreas(practiceAreas);
  })
  .catch(() => {});
