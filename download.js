/* Download + pay-what-you-want.
   Nothing is ever blocked: the PDF downloads whatever amount is chosen.
   If an amount above $0 is chosen, Stripe opens in a new tab with it prefilled. */
(function () {
  document.querySelectorAll('.dl').forEach(function (box) {
    var stripe = box.getAttribute('data-stripe');
    var guide = box.getAttribute('data-guide') || '';
    var btn = box.querySelector('.dl-btn');
    var note = box.querySelector('.dl-note');
    var otherWrap = box.querySelector('.dl-other-wrap');
    var otherInput = box.querySelector('.dl-other-input');
    var radios = [].slice.call(box.querySelectorAll('input[type="radio"]'));
    var stripeOpened = false;

    function selected() {
      var r = radios.filter(function (x) { return x.checked; })[0];
      if (!r) return 0;
      if (r.value === 'other') {
        var n = Math.round(Number(otherInput.value));
        return n > 0 && n <= 1000 ? n : NaN;
      }
      return Number(r.value);
    }

    function refresh() {
      var other = radios.some(function (x) { return x.checked && x.value === 'other'; });
      otherWrap.hidden = !other;
      var amt = selected();
      btn.textContent = isNaN(amt) ? 'Download' : amt > 0 ? 'Chip in $' + amt + ' & download' : 'Download free';
    }

    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        refresh();
        if (r.value === 'other' && r.checked) otherInput.focus();
      });
    });
    otherInput.addEventListener('input', refresh);

    box.querySelectorAll('[data-dl]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var amt = selected();
        if (isNaN(amt)) {
          e.preventDefault();
          note.classList.remove('is-thanks');
          note.textContent = 'Please enter a whole-dollar amount between $1 and $1000, or choose Free.';
          otherInput.focus();
          return;
        }
        if (amt > 0 && stripe && !stripeOpened) {
          var url = stripe + '?__prefilled_amount=' + (amt * 100) +
                    (guide ? '&client_reference_id=' + encodeURIComponent(guide) : '');
          window.open(url, '_blank', 'noopener');
          stripeOpened = true;
          note.textContent = 'Thank you! Your download has started, and Stripe has opened in a new tab to complete your $' + amt + ' contribution.';
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
