/* Download + pay-what-you-want.
   Nothing is ever blocked: the PDF downloads whatever amount is chosen.

   How the Stripe tab opens without being caught by popup blockers:
   while an amount above $0 is selected (and Stripe hasn't been opened yet),
   the download links become ordinary links to Stripe (target=_blank), which
   browsers always allow. The PDF itself is then downloaded alongside it.
   With Free selected, or once Stripe has been opened, they are plain downloads. */
(function () {
  document.querySelectorAll('.dl').forEach(function (box) {
    var stripe = box.getAttribute('data-stripe');
    var guide = box.getAttribute('data-guide') || '';
    var btn = box.querySelector('.dl-btn');
    var note = box.querySelector('.dl-note');
    var otherWrap = box.querySelector('.dl-other-wrap');
    var otherInput = box.querySelector('.dl-other-input');
    var radios = [].slice.call(box.querySelectorAll('input[type="radio"]'));
    var links = [].slice.call(box.querySelectorAll('[data-dl]'));
    var stripeOpened = false;

    links.forEach(function (a) { a.setAttribute('data-file', a.getAttribute('href')); });

    function selected() {
      var r = radios.filter(function (x) { return x.checked; })[0];
      if (!r) return 0;
      if (r.value === 'other') {
        var n = Math.round(Number(otherInput.value));
        return n > 0 && n <= 1000 ? n : NaN;
      }
      return Number(r.value);
    }

    function stripeUrl(amt) {
      return stripe + '?__prefilled_amount=' + (amt * 100) +
             (guide ? '&client_reference_id=' + encodeURIComponent(guide) : '');
    }

    function track(name, params) {
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    }

    function downloadFile(file) {
      var a = document.createElement('a');
      a.href = file;
      a.setAttribute('download', '');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); }, 1000);
    }

    // point each link at Stripe or at its file, depending on the current choice
    function setLinks() {
      var amt = selected();
      var toStripe = amt > 0 && stripe && !stripeOpened;
      links.forEach(function (a) {
        if (toStripe) {
          a.href = stripeUrl(amt);
          a.target = '_blank';
          a.rel = 'noopener';
          a.removeAttribute('download');
        } else {
          a.href = a.getAttribute('data-file');
          a.removeAttribute('target');
          a.removeAttribute('rel');
          a.setAttribute('download', '');
        }
      });
    }

    function refresh() {
      var other = radios.some(function (x) { return x.checked && x.value === 'other'; });
      otherWrap.hidden = !other;
      var amt = selected();
      btn.textContent = isNaN(amt) ? 'Download' : amt > 0 ? 'Chip in $' + amt + ' & download' : 'Download free';
      setLinks();
    }

    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        refresh();
        if (r.value === 'other' && r.checked) otherInput.focus();
      });
    });
    otherInput.addEventListener('input', refresh);

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var amt = selected();
        if (isNaN(amt)) {
          e.preventDefault();
          note.classList.remove('is-thanks');
          note.textContent = 'Please enter a whole-dollar amount between $1 and $1000, or choose Free.';
          otherInput.focus();
          return;
        }
        var file = a.getAttribute('data-file');
        track('guide_download', {
          guide: guide,
          file_name: file,
          download_type: a.classList.contains('dl-btn') ? 'guide_pdf' : 'pocket_cards',
          amount_chosen: amt
        });

        if (a.getAttribute('target') === '_blank') {
          track('contribution_start', { guide: guide, value: amt, currency: 'AUD' });
          // the link itself opens Stripe; start the PDF download alongside it
          downloadFile(a.getAttribute('data-file'));
          stripeOpened = true;
          setTimeout(setLinks, 0);   // later clicks are plain downloads
          note.textContent = 'Thank you! Your download has started, and Stripe has opened in a new tab to complete your $' + amt + ' contribution. If you don\'t see it, ';
          var retry = document.createElement('a');
          retry.href = stripeUrl(amt);
          retry.target = '_blank';
          retry.rel = 'noopener';
          retry.textContent = 'open Stripe here';
          note.appendChild(retry);
          note.appendChild(document.createTextNode('.'));
        } else {
          note.textContent = amt > 0
            ? 'Your download has started. Thank you for supporting the research.'
            : 'Your download has started. Thanks for reading, and feel free to share it.';
        }
        note.classList.add('is-thanks');
      });
    });

    refresh();
  });
})();
