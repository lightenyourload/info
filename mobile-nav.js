/* Mobile menu: a button inside the coloured banner opens a full-screen menu.
   The links are copied from the page's own nav, so there's only one list to maintain. */
(function () {
  var banner = document.querySelector('.page-header') || document.querySelector('.hero');
  var source = document.querySelector('.nav-links');
  if (!banner || !source) return;

  var here = location.pathname.split('/').pop() || 'index.html';

  var btn = document.createElement('button');
  btn.className = 'mnav-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mnav-panel');
  btn.innerHTML = '<span></span><span></span><span></span>';
  banner.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'mnav-panel';
  panel.id = 'mnav-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Site menu');
  panel.innerHTML =
    '<div class="mnav-top">' +
      '<a class="mnav-brand" href="index.html">Lighten <span>Your Load</span></a>' +
      '<button class="mnav-close" type="button" aria-label="Close menu">×</button>' +
    '</div>' +
    '<ul class="mnav-links"></ul>';
  var list = panel.querySelector('.mnav-links');

  // Home first (the homepage nav has no Home link of its own)
  var links = [].slice.call(source.querySelectorAll('a'));
  var hasHome = links.some(function (a) { return /(^|\/)index\.html$/.test(a.getAttribute('href') || ''); });
  if (!hasHome) {
    var h = document.createElement('a'); h.href = 'index.html'; h.textContent = 'Home'; links.unshift(h);
  }
  links.forEach(function (a) {
    var li = document.createElement('li');
    var link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.innerHTML = a.innerHTML;
    if ((link.getAttribute('href') || '') === here) link.setAttribute('aria-current', 'page');
    li.appendChild(link);
    list.appendChild(li);
  });
  document.body.appendChild(panel);

  var closeBtn = panel.querySelector('.mnav-close');

  function open() {
    panel.classList.add('is-open');
    document.body.classList.add('mnav-locked');
    btn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }
  function close() {
    panel.classList.remove('is-open');
    document.body.classList.remove('mnav-locked');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  panel.addEventListener('click', function (e) { if (e.target.closest('.mnav-links a')) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });
})();
