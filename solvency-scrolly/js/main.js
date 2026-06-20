(function () {
  var scroller;
  var activeStep = -1;

  function throttle(fn, wait) {
    var t = 0;
    return function () {
      var now = Date.now();
      if (now - t >= wait) { t = now; fn(); }
    };
  }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function layoutSteps() {
    var h = window.innerHeight;
    var stepH = isMobile() ? Math.round(h * 0.92) : Math.round(h * 0.75);
    document.querySelectorAll('.step').forEach(function (el) {
      el.style.minHeight = stepH + 'px';
    });
    if (isMobile()) {
      var graphicH = Math.min(320, Math.max(240, Math.round(h * 0.36)));
      document.documentElement.style.setProperty('--graphic-height-mobile', graphicH + 'px');
    }
  }

  function setActiveStep(index) {
    if (index === activeStep) return;
    activeStep = index;
    document.querySelectorAll('.step').forEach(function (el, i) {
      el.classList.toggle('is-active', i === index);
    });
    window.SfcrViz.updateViz(index);
  }

  function loadData() {
    if (window.STORY_DATA) return Promise.resolve(window.STORY_DATA);
    return fetch('data/sfcr.json').then(function (res) {
      if (!res.ok) throw new Error('Could not load data');
      return res.json();
    });
  }

  function initScroller() {
    layoutSteps();
    scroller = scrollama();
    scroller
      .setup({ step: '.step', offset: isMobile() ? 0.72 : 0.55 })
      .onStepEnter(function (res) { setActiveStep(res.index); });
    var onResize = throttle(function () {
      layoutSteps();
      scroller.resize();
      window.SfcrViz.updateViz(activeStep);
    }, 200);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  function boot() {
    loadData().then(function (data) {
      window.SfcrViz.initViz(data);
      initScroller();
      setActiveStep(0);
      requestAnimationFrame(function () {
        layoutSteps();
        scroller.resize();
        window.SfcrViz.updateViz(0);
      });
    }).catch(function (err) {
      document.getElementById('graphic').innerHTML = '<p class="error">' + err.message + '</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
