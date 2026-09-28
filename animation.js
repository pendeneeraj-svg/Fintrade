(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (item) {
        item.classList.add('is-visible');
      });
      return;
    }

    document.documentElement.classList.add('reveal-ready');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (!entry.isIntersecting) return;
        var target = entry.target;
        window.setTimeout(function () {
          target.classList.add('is-visible');
        }, index * 70);
        observer.unobserve(target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function initSmoothScroll() {
    document.addEventListener('click', function (event) {
      var anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      var id = anchor.getAttribute('href');
      if (!id || id === '#') return;

      var target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();

      var navHeight = 96;
      var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

      window.scrollTo({
        top: top,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    });
  }

  function initActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (link) {
        return document.querySelector(link.getAttribute('href'));
      })
      .filter(Boolean);

    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('id');
        links.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.35, rootMargin: '-96px 0px -55% 0px' });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function initTicker() {
    var track = document.getElementById('tickerTrack');
    if (!track) return;

    var original = track.innerHTML;
    track.innerHTML = original + original;

    if (reducedMotion) {
      track.style.animation = 'none';
    }
  }

  function initChart() {
    var canvas = document.getElementById('stockChart');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentNode;

    var symbol = 'RELIANCE';
    var basePrice = 2940.5;
    var candles = [];
    var count = 54;
    var range = '1D';
    var dpr = window.devicePixelRatio || 1;

    function readVar(name, fallback) {
      var value = getComputedStyle(document.documentElement).getPropertyValue(name);
      return value && value.trim() ? value.trim() : fallback;
    }

    function hashSeed(text) {
      var h = 2166136261;
      for (var i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function mulberry32(seed) {
      var a = seed;
      return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function rangeVolatility() {
      if (range === '1W') return 0.012;
      if (range === '1M') return 0.022;
      if (range === '1Y') return 0.05;
      return 0.006;
    }

    function buildCandles(seedText, base, vol) {
      var random = mulberry32(hashSeed(seedText + range));
      var price = base * (1 - vol * 3);
      var data = [];

      for (var i = 0; i < count; i += 1) {
        var open = price;
        var move = (random() - 0.46) * vol * price;
        var close = Math.max(1, open + move);
        var high = Math.max(open, close) + random() * vol * price * 0.6;
        var low = Math.min(open, close) - random() * vol * price * 0.6;

        data.push({ open: open, close: close, high: high, low: low });
        price = close;
      }

      var scale = base / data[data.length - 1].close;
      return data.map(function (candle) {
        return {
          open: candle.open * scale,
          close: candle.close * scale,
          high: candle.high * scale,
          low: candle.low * scale
        };
      });
    }

    function resize() {
      var rect = wrap.getBoundingClientRect();
      var width = Math.max(320, rect.width);
      var height = Math.max(200, rect.height);

      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (!candles.length) return;

      var rect = wrap.getBoundingClientRect();
      var w = Math.max(320, rect.width);
      var h = Math.max(200, rect.height);

      var padTop = 18;
      var padBottom = 26;
      var padLeft = 14;
      var padRight = 62;

      var plotW = w - padLeft - padRight;
      var plotH = h - padTop - padBottom;

      var green = readVar('--neon-green', '#10B981');
      var red = readVar('--danger-red', '#EF4444');
      var violet = readVar('--electric-violet', '#6366F1');
      var gridColor = readVar('--border-color', '#262626');
      var mutedColor = readVar('--text-muted', '#A1A1AA');

      ctx.clearRect(0, 0, w, h);

      var highs = candles.map(function (c) { return c.high; });
      var lows = candles.map(function (c) { return c.low; });
      var max = Math.max.apply(null, highs);
      var min = Math.min.apply(null, lows);
      var pad = (max - min) * 0.12 || 1;
      max += pad;
      min -= pad;

      function yOf(value) {
        return padTop + plotH - ((value - min) / (max - min)) * plotH;
      }

      function xOf(index) {
        return padLeft + (index + 0.5) * (plotW / candles.length);
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.65;

      for (var g = 0; g <= 4; g += 1) {
        var gy = padTop + (plotH / 4) * g;
        ctx.beginPath();
        ctx.moveTo(padLeft, gy);
        ctx.lineTo(padLeft + plotW, gy);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      var slot = plotW / candles.length;
      var bodyW = Math.max(3, slot * 0.56);

      candles.forEach(function (candle, index) {
        var x = xOf(index);
        var bullish = candle.close >= candle.open;
        var color = bullish ? green : red;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(x, yOf(candle.high));
        ctx.lineTo(x, yOf(candle.low));
        ctx.stroke();

        var top = yOf(Math.max(candle.open, candle.close));
        var bottom = yOf(Math.min(candle.open, candle.close));
        var bodyH = Math.max(1.6, bottom - top);

        ctx.globalAlpha = bullish ? 0.85 : 0.9;
        ctx.fillRect(x - bodyW / 2, top, bodyW, bodyH);
        ctx.globalAlpha = 1;
      });

      ctx.beginPath();
      candles.forEach(function (candle, index) {
        var x = xOf(index);
        var y = yOf(candle.close);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = violet;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.shadowColor = violet;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      var last = candles[candles.length - 1];
      var lastX = xOf(candles.length - 1);
      var lastY = yOf(last.close);

      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = violet;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
      ctx.strokeStyle = violet;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = mutedColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (var l = 0; l <= 4; l += 1) {
        var value = max - ((max - min) / 4) * l;
        var ly = padTop + (plotH / 4) * l;
        ctx.fillText(value.toFixed(value > 1000 ? 0 : 2), padLeft + plotW + 10, ly);
      }
    }

    function setSymbol(nextSymbol, nextPrice) {
      symbol = nextSymbol;
      basePrice = nextPrice || basePrice;
      candles = buildCandles(symbol, basePrice, rangeVolatility());
      draw();
    }

    function updateLivePrice(price) {
      if (!candles.length) return;
      var last = candles[candles.length - 1];
      last.close = price;
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      draw();
    }

    candles = buildCandles(symbol, basePrice, rangeVolatility());

    window.addEventListener('resize', resize);

    document.addEventListener('stock:change', function (event) {
      setSymbol(event.detail.symbol, event.detail.price);
    });

    document.addEventListener('market:tick', function (event) {
      updateLivePrice(event.detail.price);
    });

    document.addEventListener('chart:range', function (event) {
      range = event.detail.range;
      candles = buildCandles(symbol, basePrice, rangeVolatility());
      draw();
    });

    document.addEventListener('themechange', function () {
      draw();
    });

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () {
        resize();
      });
      ro.observe(wrap);
    }

    resize();

    if (!reducedMotion) {
      window.setInterval(function () {
        var last = candles[candles.length - 1];
        var jitter = (Math.random() - 0.5) * last.close * 0.0018;
        var next = Math.max(1, last.close + jitter);
        updateLivePrice(next);
      }, 1400);
    }
  }

  function initHoverTransitions() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card, .info-card'));

    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.style.willChange = 'transform, box-shadow';
      });

      card.addEventListener('mouseleave', function () {
        card.style.willChange = 'auto';
      });
    });
  }

  function initTabTransitions() {
    var observer = new MutationObserver(function () {});
    observer.observe(document.body, { childList: true, subtree: true });
    observer.disconnect();
  }

  function initAll() {
    initReveal();
    initSmoothScroll();
    initActiveNav();
    initTicker();
    initChart();
    initHoverTransitions();
    initTabTransitions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();