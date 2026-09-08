// El video decorativo carga cuando la portada es visible y terminó la bienvenida.
// La imagen del mismo video conserva la composición sin reproducción automática.
(function () {
  var video = document.getElementById('hero-video');
  var hero = document.getElementById('sc-hero');
  if (!video || !hero) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var visible = false;
  var failed = false;
  video.muted = true;
  video.defaultMuted = true;

  function update() {
    var allowed = visible && !document.hidden && !reducedMotion.matches &&
      !(connection && connection.saveData) && !failed &&
      !document.documentElement.classList.contains('tj-video-intro-on');
    if (!allowed) { video.pause(); return; }

    if (!video.getAttribute('src')) {
      video.src = window.matchMedia('(max-width: 1180px)').matches
        ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    }
    var playback = video.play();
    if (playback && playback.catch) playback.catch(function () {});
  }

  video.addEventListener('error', function () {
    failed = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
  });
  document.addEventListener('tejaz:intro-finished', update);
  document.addEventListener('visibilitychange', update);
  // Algunos navegadores permiten reproducir solo después del primer gesto.
  document.addEventListener('pointerdown', update, { once: true });
  document.addEventListener('keydown', update, { once: true });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', update);
  else if (reducedMotion.addListener) reducedMotion.addListener(update);
  if (connection && connection.addEventListener) connection.addEventListener('change', update);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(hero);
  } else {
    visible = true;
    update();
  }
})();
