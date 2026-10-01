
const menuButton=document.querySelector('.menu-toggle');
const mobileMenu=document.querySelector('#mobile-menu');
if(menuButton&&mobileMenu){menuButton.addEventListener('click',()=>{const open=mobileMenu.hasAttribute('hidden');if(open)mobileMenu.removeAttribute('hidden');else mobileMenu.setAttribute('hidden','');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu')});mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileMenu.setAttribute('hidden','');menuButton.setAttribute('aria-expanded','false')}));}
const rail=document.querySelector('[data-contact-rail]');const railToggle=document.querySelector('[data-contact-toggle]');
if(rail&&railToggle){railToggle.addEventListener('click',()=>{const collapsed=rail.classList.toggle('is-collapsed');railToggle.setAttribute('aria-expanded',String(!collapsed));});}
const io='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08}):null;document.querySelectorAll('.reveal').forEach(el=>io?io.observe(el):el.classList.add('is-visible'));
const form=document.querySelector('[data-whatsapp-form]');
if(form){form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const parts=[`Hello Achola Odhiambo & Company Advocates, I would like to discuss a legal matter.`,`Name: ${d.get('name')||''}`,`Phone: ${d.get('phone')||''}`,`Matter: ${d.get('matter')||'General legal enquiry'}`,`Message: ${d.get('message')||''}`];window.open('https://wa.me/254112572628?text='+encodeURIComponent(parts.join('\n')),'_blank','noopener');});}
