/* Guide download box: three steps inside one box (no pop-up).
   1. "Download the guides" button
   2. Email (required) + optional postcode + optional Dirty Dozen question -> "Get the guides"
      Sends ONE row to the Google Form/Sheet and starts the PDF download straight away.
   3. Thank-you: link to the file in case the download didn't start, plus an optional chip-in
      (plain links to Stripe in a new tab, so popup blockers never interfere).

   Someone who has already given their email on this browser skips step 2 next time.

   Markup: <section class="dl" data-file="..." data-guide="..." data-stripe="..." [data-dd="no"]>
   Settings below must match the Google Form (same form as signup.js).
   The Dirty Dozen answers in the pages' HTML must match the form's options exactly,
   or Google silently rejects the whole response. */
(function () {
  var FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScwsA_Ni6pqvLFX9ePs814MkHTpt4sXL-PeXkxrmZyTN8QK7Q/formResponse';
  var ENTRY_EMAIL = 'entry.1127642381';
  var ENTRY_DD = 'entry.1832093269';
  var ENTRY_POSTCODE = 'entry.2083154826';
  var REMEMBER_KEY = 'lyl_signed_up';

  function remembered() {
    try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(REMEMBER_KEY, '1'); } catch (e) {}
  }
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }
  // Save the PDF straight to the reader's downloads rather than opening it in a tab.
  // Fetching it as a blob makes browsers that open PDFs inline (Chrome, Edge, Safari) save it instead.
  // If that fails for any reason, fall back to a plain download link.
  function clickLink(href, name) {
    var a = document.createElement('a');
    a.href = href;
    a.setAttribute('download', name || '');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 1000);
  }
  function downloadFile(file) {
    var name = file.split('/').pop();
    if (!window.fetch || !window.URL || !URL.createObjectURL) { clickLink(file, name); return; }
    fetch(file)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
        clickLink(url, name);
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      })
      .catch(function () { clickLink(file, name); });
  }

  document.querySelectorAll('.dl').forEach(function (box) {
    var file = box.getAttribute('data-file');
    var guide = box.getAttribute('data-guide') || '';
    var stripe = box.getAttribute('data-stripe') || '';
    var steps = {
      start: box.querySelector('.dl-step--start'),
      email: box.querySelector('.dl-step--email'),
      done: box.querySelector('.dl-step--done')
    };
    var form = box.querySelector('.dl-form');
    var emailInput = form.querySelector('input[type="email"]');
    var pcInput = form.querySelector('.dl-postcode');
    var trap = form.querySelector('.dl-hp');
    var msg = form.querySelector('.dl-msg');
    var listed = box.querySelector('.dl-listed');

    if (box.getAttribute('data-dd') === 'no') {
      var dd = form.querySelector('.dl-dd');
      if (dd) dd.remove();
    }

    // Fallback link and chip-in links
    var bundle = box.getAttribute('data-bundle');
    box.querySelectorAll('.dl-bundle-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        downloadFile(bundle || a.getAttribute('href'));
        track('guide_download', { guide: 'all-three-booklet', file_name: bundle, signed_up: 'bundle' });
      });
    });
    box.querySelectorAll('.dl-file-link').forEach(function (a) {
      a.href = file;
      a.addEventListener('click', function (e) { e.preventDefault(); downloadFile(file); });
    });
    box.querySelectorAll('[data-amount]').forEach(function (a) {
      var amt = Number(a.getAttribute('data-amount'));
      a.href = stripe + (amt > 0 ? '?__prefilled_amount=' + (amt * 100) + '&' : '?') +
               'client_reference_id=' + encodeURIComponent(guide);
      a.addEventListener('click', function () {
        track('contribution_start', { guide: guide, value: amt || 0, currency: 'AUD' });
      });
    });

    function show(name) {
      Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== name; });
    }

    function deliver(newSignup) {
      downloadFile(file);
      track('guide_download', { guide: guide, file_name: file, signed_up: newSignup ? 'new' : 'returning' });
      if (listed) listed.hidden = !newSignup;
      show('done');
      steps.done.querySelector('.dl-done-title').focus();
    }

    [emailInput, pcInput].forEach(function (i) {
      if (i) i.addEventListener('input', function () { msg.textContent = ''; });
    });

    box.querySelector('.dl-start-btn').addEventListener('click', function () {
      if (remembered()) { deliver(false); return; }
      show('email');
      emailInput.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      if (!email || !emailInput.checkValidity()) {
        msg.textContent = 'Please enter a valid email address.';
        emailInput.focus();
        return;
      }
      var pc = pcInput ? pcInput.value.trim() : '';
      if (pc && !/^\d{4}$/.test(pc)) {
        msg.textContent = 'Postcodes are four digits. Leave it blank if you’d rather not say.';
        pcInput.focus();
        return;
      }
      if (trap && trap.value) return;   // bots fill the hidden field; people never see it

      var body = new URLSearchParams();
      body.append(ENTRY_EMAIL, email);
      var picked = form.querySelector('.dl-dd input:checked');
      if (picked) body.append(ENTRY_DD, picked.value);
      if (pc) body.append(ENTRY_POSTCODE, pc);

      // Fire and forget, so the download starts inside the click (browsers allow that).
      // sendBeacon survives the page being closed straight away; fetch is the fallback.
      var sent = navigator.sendBeacon && navigator.sendBeacon(FORM_ACTION, body);
      if (!sent) fetch(FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body }).catch(function () {});

      remember();
      track('newsletter_signup', { location: guide, answered_dd: picked ? 'yes' : 'no', gave_postcode: pc ? 'yes' : 'no' });
      msg.textContent = '';
      deliver(true);
    });

    box.querySelector('.dl-back').addEventListener('click', function () {
      show('start');
      box.querySelector('.dl-start-btn').focus();
    });

    box.classList.add('is-ready');
  });
})();
