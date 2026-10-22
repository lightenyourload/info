/* Google Analytics 4 — loaded on every page.
   To change accounts, edit the Measurement ID below; nothing else needs touching. */
(function () {
  var ID = 'G-EZYCJ8Q5PJ';

  // Always provide gtag() so other scripts can send events safely,
  // even when analytics is off (placeholder ID, local preview, etc.).
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var placeholder = !/^G-[A-Z0-9]{4,}$/.test(ID) || ID === 'G-XXXXXXXXXX';
  var live = /(^|\.)lightenyourload\.info$/.test(location.hostname);  // don't count previews/testing
  if (placeholder || !live) return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', ID);
})();
