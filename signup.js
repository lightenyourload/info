/* Email sign-up → Google Form → Google Sheet (temporary home for the list).
   Two steps: (1) email, (2) optional extras shown in the thank-you panel.
   Everything is sent as ONE form response when the person finishes or skips step 2
   (or, if they leave the page first, automatically as they go), so each sign-up is one row.

   Settings — the only things that should need touching:
   FORM_ACTION     the form's ".../formResponse" URL
   ENTRY_EMAIL     the Email question's field name
   ENTRY_DD        "Had you heard of the Dirty Dozen before?" (must stay OPTIONAL in the form)
   DD_OPTIONS      must match the form's options character for character
   ENTRY_POSTCODE  postcode question (short answer, OPTIONAL). Leave '' to hide the field.
   CHIP_IN_URL     shown after sign-up; leave '' to hide */
(function () {
  var FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScwsA_Ni6pqvLFX9ePs814MkHTpt4sXL-PeXkxrmZyTN8QK7Q/formResponse';
  var ENTRY_EMAIL = 'entry.1127642381';
  var ENTRY_DD = 'entry.1832093269';
  var DD_OPTIONS = ['Yes', 'No', 'Maybe', 'Only the 1967 war film!'];
  var ENTRY_POSTCODE = 'entry.2083154826';
  var CHIP_IN_URL = 'https://donate.stripe.com/eVq14n8RN7KkeafaU41Nu00';

  var ready = /^https:\/\/docs\.google\.com\/forms\/.+\/formResponse$/.test(FORM_ACTION) && /^entry\.\d+$/.test(ENTRY_EMAIL);
  var hasPostcode = /^entry\.\d+$/.test(ENTRY_POSTCODE);
  var uid = 0;

  function track(name, form, extra) {
    if (typeof window.gtag !== 'function') return;
    var p = { location: form.getAttribute('data-location') || '' };
    for (var k in extra) p[k] = extra[k];
    window.gtag('event', name, p);
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  function buildExtras() {
    var n = ++uid;
    var box = el('div', { 'class': 'signup-extras' });
    box.appendChild(el('p', { 'class': 'signup-extras-lead' }, 'Thanks! Two quick, optional questions before you go:'));

    var fs = el('fieldset', { 'class': 'signup-q' });
    fs.appendChild(el('legend', {}, 'Had you heard of the “Dirty Dozen” before?'));
    var opts = el('div', { 'class': 'signup-opts' });
    DD_OPTIONS.forEach(function (o, i) {
      var id = 'su-dd-' + n + '-' + i;
      var lab = el('label', { 'for': id });
      var r = el('input', { type: 'radio', name: 'su-dd-' + n, id: id, value: o });
      lab.appendChild(r);
      lab.appendChild(document.createTextNode(' ' + o));
      opts.appendChild(lab);
    });
    fs.appendChild(opts);
    box.appendChild(fs);

    if (hasPostcode) {
      var pid = 'su-pc-' + n;
      var pq = el('div', { 'class': 'signup-q' });
      pq.appendChild(el('label', { 'for': pid, 'class': 'signup-q-label' }, 'Your postcode'));
      pq.appendChild(el('input', { type: 'text', id: pid, 'class': 'signup-postcode', inputmode: 'numeric', maxlength: '4', pattern: '[0-9]{4}', autocomplete: 'postal-code', placeholder: 'e.g. 4000' }));
      pq.appendChild(el('p', { 'class': 'signup-q-hint' }, 'So I can see where readers are, and connect people locally.'));
      box.appendChild(pq);
    }

    var actions = el('div', { 'class': 'signup-actions' });
    actions.appendChild(el('button', { type: 'button', 'class': 'signup-finish' }, 'Done'));
    actions.appendChild(el('button', { type: 'button', 'class': 'signup-skip' }, 'Skip'));
    box.appendChild(actions);
    return box;
  }

  document.querySelectorAll('form.signup').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var trap = form.querySelector('input.signup-hp'); // honeypot: bots fill it, people never see it
    var msg = form.querySelector('.signup-msg');
    var btn = form.querySelector('.signup-row button');

    if (!ready) return;                              // stays hidden until a form is connected
    form.closest('.signup-wrap').hidden = false;

    var email = '';
    var sent = false;
    var extras = null;

    function payload(withAnswers) {
      var body = new URLSearchParams();
      body.append(ENTRY_EMAIL, email);
      if (withAnswers && extras) {
        var picked = extras.querySelector('input[type="radio"]:checked');
        if (picked && ENTRY_DD) body.append(ENTRY_DD, picked.value);
        var pc = extras.querySelector('.signup-postcode');
        if (pc && /^\d{4}$/.test(pc.value.trim())) body.append(ENTRY_POSTCODE, pc.value.trim());
      }
      return body;
    }

    function finish(withAnswers, how) {
      if (sent) return;
      var pc = extras && extras.querySelector('.signup-postcode');
      if (withAnswers && pc && pc.value.trim() && !/^\d{4}$/.test(pc.value.trim())) {
        msg.textContent = 'Postcodes are four digits. Leave it blank if you’d rather not say.';
        pc.focus();
        return;
      }
      sent = true;
      var body = payload(withAnswers);
      extras.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      msg.textContent = 'Signing you up…';

      fetch(FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
          extras.remove();
          form.classList.add('is-done');
          msg.textContent = 'Thank you! You’re on the list. I’ll be in touch when there’s something worth sharing.';
          if (CHIP_IN_URL) {
            var p = el('p', { 'class': 'signup-chip' }, 'The guides are free for everyone. If you’d like to help keep them that way, ');
            var a = el('a', { href: CHIP_IN_URL, target: '_blank', rel: 'noopener' }, 'you can chip in here');
            p.appendChild(a);
            p.appendChild(document.createTextNode('.'));
            msg.after(p);
          }
          track('newsletter_signup', form, { extras: how, answered_dd: body.has(ENTRY_DD) ? 'yes' : 'no', gave_postcode: body.has(ENTRY_POSTCODE) ? 'yes' : 'no' });
        })
        .catch(function () {
          sent = false;
          extras.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
          msg.textContent = 'Sorry, that didn’t go through. Please try again in a moment.';
        });
    }

    // If someone gives their email then leaves without finishing step 2, send what we have.
    function sendOnExit() {
      if (!email || sent) return;
      sent = true;
      if (navigator.sendBeacon) navigator.sendBeacon(FORM_ACTION, payload(true));
    }
    window.addEventListener('pagehide', sendOnExit);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (extras) return;
      var value = input.value.trim();
      if (!input.checkValidity() || !value) {
        msg.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      if (trap && trap.value) return;               // silently ignore bots

      email = value;
      form.classList.add('is-step2');
      msg.textContent = '';
      extras = buildExtras();
      form.querySelector('.signup-row').after(extras);
      extras.querySelector('.signup-finish').addEventListener('click', function () { finish(true, 'done'); });
      extras.querySelector('.signup-skip').addEventListener('click', function () { finish(false, 'skipped'); });
      extras.querySelector('input').focus();
    });
  });
})();
