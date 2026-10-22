/* Email sign-up → Google Form → Google Sheet (temporary home for the list).
   To connect a form, set the two values below; nothing else needs touching.
   FORM_ACTION: the form's ".../formResponse" URL
   ENTRY:       the Email question's field name, e.g. "entry.123456789" */
(function () {
  var FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScwsA_Ni6pqvLFX9ePs814MkHTpt4sXL-PeXkxrmZyTN8QK7Q/formResponse';
  var ENTRY = 'entry.1127642381';

  var ready = /^https:\/\/docs\.google\.com\/forms\/.+\/formResponse$/.test(FORM_ACTION) && /^entry\.\d+$/.test(ENTRY);

  document.querySelectorAll('form.signup').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var trap = form.querySelector('input.signup-hp'); // honeypot: bots fill it, people never see it
    var msg = form.querySelector('.signup-msg');
    var btn = form.querySelector('button');

    if (!ready) return;                              // stays hidden until a form is connected
    form.closest('.signup-wrap').hidden = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!input.checkValidity() || !email) {
        msg.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      if (trap && trap.value) return;               // silently ignore bots

      btn.disabled = true;
      msg.textContent = 'Signing you up…';
      var body = new URLSearchParams();
      body.append(ENTRY, email);

      fetch(FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
          form.classList.add('is-done');
          msg.textContent = 'Thank you! You’re on the list. I’ll be in touch when there’s something worth sharing.';
          input.value = '';
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'newsletter_signup', { location: form.getAttribute('data-location') || '' });
          }
        })
        .catch(function () {
          btn.disabled = false;
          msg.textContent = 'Sorry, that didn’t go through. Please try again in a moment.';
        });
    });
  });
})();
