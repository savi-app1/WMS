/* WMS — suivi léger des interactions (analytics internes, sans cookie tiers). */
(function () {
  'use strict';

  function track(type, detail, productId) {
    try {
      var payload = JSON.stringify({ type: type, detail: detail || '', productId: productId || null });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) { /* silencieux */ }
  }

  // Clics WhatsApp préfixés par data-track
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-track]') : null;
    if (el) {
      track(el.dataset.track, el.dataset.detail || '', el.dataset.productId || null);
    }
  });

  // Bouton WhatsApp flottant
  var floater = document.getElementById('waFloat');
  if (floater) {
    floater.addEventListener('click', function () {
      track('whatsapp_click', 'bouton_flottant', null);
    });
  }
})();
