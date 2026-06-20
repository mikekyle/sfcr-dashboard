(function (global) {
  var d3 = global.d3;
  var data = null;
  var reduced = false;

  function chartWidth(defaultW) {
    var el = document.getElementById('graphic');
    var w = el ? (el.clientWidth || 360) : 360;
    return Math.max(240, Math.min(defaultW || 420, w));
  }

  function sortedInsurers() {
    return data.insurers.slice().sort(function (a, b) {
      return b.scr_ratio_pct - a.scr_ratio_pct;
    });
  }

  function initViz(dataset) {
    data = dataset;
    reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('graphic').innerHTML = '<div id="viz-root"></div>';
  }

  function root() { return document.getElementById('viz-root'); }

  function drawBigNumber(container, n, label, sub) {
    var w = chartWidth(360);
    var h = Math.round(w * 0.55);
    var svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + w + ' ' + h).attr('width', '100%');
    svg.append('text').attr('x', w / 2).attr('y', h * 0.42)
      .attr('text-anchor', 'middle').attr('font-size', 64).attr('font-weight', 700)
      .attr('fill', 'var(--accent)').text(n);
    svg.append('text').attr('x', w / 2).attr('y', h * 0.6)
      .attr('text-anchor', 'middle').attr('font-size', 16).attr('fill', 'var(--text-muted)')
      .text(label);
    if (sub) {
      svg.append('text').attr('x', w / 2).attr('y', h * 0.76)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('fill', 'var(--text-muted)')
        .text(sub);
    }
  }

  function drawFloor(container) {
    var w = chartWidth(380);
    var h = Math.round(w * 0.55);
    var svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + w + ' ' + h).attr('width', '100%');
    var floor = data.meta.regulatory_minimum_pct;
    svg.append('line')
      .attr('x1', w * 0.15).attr('x2', w * 0.85)
      .attr('y1', h * 0.5).attr('y2', h * 0.5)
      .attr('stroke', 'var(--accent-warm)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4');
    svg.append('text').attr('x', w / 2).attr('y', h * 0.38)
      .attr('text-anchor', 'middle').attr('font-size', 42).attr('font-weight', 700)
      .attr('fill', 'var(--accent-warm)').text(floor + '%');
    svg.append('text').attr('x', w / 2).attr('y', h * 0.68)
      .attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', 'var(--text-muted)')
      .text('regulatory SCR floor');
  }

  function drawBars(container, opts) {
    opts = opts || {};
    var insurers = sortedInsurers();
    var w = chartWidth(420);
    var h = Math.round(w * 0.95);
    var margin = { top: 28, right: 44, bottom: 16, left: 108 };
    var svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + w + ' ' + h).attr('width', '100%');
    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    var innerW = w - margin.left - margin.right;
    var innerH = h - margin.top - margin.bottom;
    var ymax = d3.max(insurers, function (d) { return d.scr_ratio_pct; });
    var y = d3.scaleBand().domain(insurers.map(function (d) { return d.name; })).range([0, innerH]).padding(0.18);
    var x = d3.scaleLinear().domain([0, ymax]).nice().range([0, innerW]);

    if (opts.showFloor) {
      var fx = x(data.meta.regulatory_minimum_pct);
      g.append('line')
        .attr('x1', fx).attr('x2', fx)
        .attr('y1', -6).attr('y2', innerH)
        .attr('stroke', 'var(--accent-warm)').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3').attr('opacity', 0.85);
      g.append('text').attr('x', fx + 4).attr('y', -10)
        .attr('font-size', 10).attr('fill', 'var(--accent-warm)').text('100%');
    }

    if (opts.showMedian) {
      var mx = x(data.stats.median_scr);
      g.append('line')
        .attr('x1', mx).attr('x2', mx)
        .attr('y1', -6).attr('y2', innerH)
        .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');
      g.append('text').attr('x', mx + 4).attr('y', innerH + 12)
        .attr('font-size', 10).attr('fill', 'var(--text-muted)')
        .text('median ' + data.stats.median_scr + '%');
    }

    function barColor(d) {
      if (opts.highlightNames && opts.highlightNames.indexOf(d.name) >= 0) return 'var(--accent)';
      if (opts.warnBelow && d.scr_ratio_pct < opts.warnBelow) return 'var(--accent-warm)';
      return 'var(--chart-muted)';
    }

    g.selectAll('rect').data(insurers).join('rect')
      .attr('y', function (d) { return y(d.name); })
      .attr('x', 0)
      .attr('height', y.bandwidth())
      .attr('width', 0)
      .attr('fill', barColor)
      .attr('rx', 2)
      .transition().duration(reduced ? 0 : 500)
      .attr('width', function (d) { return x(d.scr_ratio_pct); });

    g.selectAll('.val').data(insurers).join('text').attr('class', 'val')
      .attr('x', function (d) { return x(d.scr_ratio_pct) + 5; })
      .attr('y', function (d) { return y(d.name) + y.bandwidth() / 2 + 4; })
      .attr('font-size', 10).attr('fill', 'var(--text)')
      .text(function (d) { return d.scr_ratio_pct + '%'; });

    g.append('g').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
    g.selectAll('.tick text').attr('font-size', 10).attr('fill', 'var(--text-muted)');

    svg.append('text').attr('x', w / 2).attr('y', 16)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--text-muted)')
      .text(data.meta.metric);
  }

  function drawExtremes(container) {
    drawBars(container, {
      showFloor: true,
      highlightNames: [data.stats.max_name, data.stats.min_name],
    });
  }

  var STATES = ['intro', 'floor', 'all-bars', 'extremes', 'median', 'tight', 'payoff'];

  function updateViz(stepIndex) {
    if (!data) return;
    var r = root();
    if (!r) return;
    r.innerHTML = '';
    var state = STATES[stepIndex] || STATES[0];
    switch (state) {
      case 'intro':
        drawBigNumber(r, 'SCR', 'coverage ratio', 'scroll — who has headroom?');
        break;
      case 'floor':
        drawFloor(r);
        break;
      case 'all-bars':
        drawBars(r, { showFloor: true });
        break;
      case 'extremes':
        drawExtremes(r);
        break;
      case 'median':
        drawBars(r, { showFloor: true, showMedian: true });
        break;
      case 'tight':
        drawBars(r, { showFloor: true, warnBelow: 150 });
        break;
      case 'payoff':
        drawBigNumber(
          r,
          data.stats.max_scr - data.stats.min_scr + 'pp',
          'spread top to bottom',
          data.stats.max_name + ' vs ' + data.stats.min_name
        );
        break;
    }
  }

  global.SfcrViz = { initViz: initViz, updateViz: updateViz };
})(window);
