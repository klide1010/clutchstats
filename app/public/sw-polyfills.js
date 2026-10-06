/* Polyfill per Chrome < 76 (Workbox usa Promise.allSettled). Caricato dal service worker via importScripts. */
if (typeof Promise !== 'undefined' && !Promise.allSettled) {
  Promise.allSettled = function (iterable) {
    return Promise.all(Array.prototype.map.call(iterable, function (p) {
      return Promise.resolve(p).then(
        function (value) { return { status: 'fulfilled', value: value }; },
        function (reason) { return { status: 'rejected', reason: reason }; }
      );
    }));
  };
}
