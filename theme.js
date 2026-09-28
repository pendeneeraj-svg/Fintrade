(function () {
  'use strict';

  var STORAGE_KEY = 'tradeteen.theme';
  var THEMES = ['dark', 'light', 'contrast'];
  var ICONS = { dark: '🌙', light: '☀️', contrast: '🔆' };
  var LABELS = { dark: 'Dark theme', light: 'Light theme', contrast: 'High contrast theme' };

  var root = document.documentElement;

  function readStored() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      if (value && THEMES.indexOf(value) !== -1) return value;
    } catch (error) {
      return null;
    }
    return null;
  }

  function store(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      return;
    }
  }

  function preferredTheme() {
    var stored = readStored();
    if (stored) return stored;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark';
  }

  function applyTheme(theme) {
    var next = THEMES.indexOf(theme) === -1 ? 'dark' : theme;

    root.setAttribute('data-theme', next);
    root.setAttribute('data-theme-mode', next);

    var icon = document.getElementById('themeIcon');
    if (icon) {
      icon.textContent = ICONS[next];
    }

    var toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-label', 'Switch theme. Current: ' + LABELS[next]);
      toggle.setAttribute('title', LABELS[next]);
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', next === 'light' ? '#F4F5F7' : '#050505');
    }

    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  }

  function nextTheme(current) {
    var index = THEMES.indexOf(current);
    if (index === -1) return 'dark';
    return THEMES[(index + 1) % THEMES.length];
  }

  function init() {
    var initial = preferredTheme();
    applyTheme(initial);

    var toggle = document.getElementById('themeToggle');

    if (toggle) {
      toggle.addEventListener('click', function () {
        var current = root.getAttribute('data-theme') || 'dark';
        var upcoming = nextTheme(current);
        applyTheme(upcoming);
        store(upcoming);
      });
    }

    if (window.matchMedia) {
      var query = window.matchMedia('(prefers-color-scheme: light)');

      var handleChange = function (event) {
        if (readStored()) return;
        applyTheme(event.matches ? 'light' : 'dark');
      };

      if (query.addEventListener) query.addEventListener('change', handleChange);
      else if (query.addListener) query.addListener(handleChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();