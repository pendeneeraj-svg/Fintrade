(function () {
  'use strict';

  var STORAGE_KEY = 'tradeteen.tutorialDone';
  var LOGIN_DELAY = 520;

  var STEPS = [
    {
      target: '.hero-inner',
      placement: 'top',
      title: 'Welcome to TradeTEEN',
      body: 'This is your trading dashboard. Everything you need to practice the stock market without risking real money lives right here.'
    },
    {
      target: '.portfolio-grid',
      placement: 'top',
      title: 'Your Portfolio Overview',
      body: 'These four cards show your total portfolio value, today\u2019s profit or loss, available coins and how much capital is invested.'
    },
    {
      target: '.chart-card',
      placement: 'bottom',
      title: 'Live Market & Chart',
      body: 'Pick any stock to see its simulated live price. Use the 1D, 1W, 1M and 1Y chips to change the chart range.'
    },
    {
      target: '.order-card',
      placement: 'left',
      title: 'Buy & Sell Panel',
      body: 'Choose a stock, set the quantity, then pick Market or Limit order and hit Buy or Sell. Every trade updates your balance instantly.'
    },
    {
      target: '#leaderboard',
      placement: 'top',
      title: 'Leaderboards',
      body: 'Compete with traders worldwide, inside your school network, or against friends. Rankings update as portfolios move.'
    },
    {
      target: '#challenges',
      placement: 'top',
      title: 'Weekly Challenges',
      body: 'Join weekly missions to sharpen your strategy and earn bonus coins when you complete them.'
    },
    {
      target: '#learning',
      placement: 'top',
      title: 'Learning Hub',
      body: 'Bite-sized five-minute lessons and a searchable glossary help you grow from a Rookie into a Pro Trader. That\u2019s it \u2014 happy trading!'
    }
  ];

  var root = null;
  var spotlight = null;
  var card = null;
  var dimmer = null;
  var currentIndex = 0;
  var activeSteps = [];
  var isRunning = false;
  var pendingLoginToken = null;
  var missingRetryTimer = null;
  var keydownHandler = null;
  var resizeHandler = null;
  var scrollHandler = null;

  function $(selector, ctx) {
    return (ctx || document).querySelector(selector);
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function hasCompleted() {
    return safeGet(STORAGE_KEY) === '1';
  }

  function markCompleted() {
    safeSet(STORAGE_KEY, '1');
  }

  function clearCompleted() {
    safeRemove(STORAGE_KEY);
  }

  function buildDom() {
    if (root) return;

    root = document.createElement('div');
    root.className = 'tour-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Product tour');
    root.hidden = true;

    dimmer = document.createElement('div');
    dimmer.className = 'tour-dimmer';

    spotlight = document.createElement('div');
    spotlight.className = 'tour-spotlight';

    card = document.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('data-placement', 'bottom');

    card.innerHTML =
      '<div class="tour-head">' +
        '<span class="tour-step" data-role="step-label">Step 1 of ' + STEPS.length + '</span>' +
        '<button class="tour-skip" type="button" data-role="skip">Skip Tutorial</button>' +
      '</div>' +
      '<h3 class="tour-title" data-role="title"></h3>' +
      '<p class="tour-body" data-role="body"></p>' +
      '<div class="tour-progress" aria-hidden="true"><span data-role="progress-bar" style="width:0%"></span></div>' +
      '<div class="tour-actions">' +
        '<div class="tour-actions-left">' +
          '<button class="btn btn-outline" type="button" data-role="back">Back</button>' +
        '</div>' +
        '<div class="tour-actions-right">' +
          '<button class="btn btn-ghost" type="button" data-role="skip-sm">Skip</button>' +
          '<button class="btn btn-primary" type="button" data-role="next">Next</button>' +
        '</div>' +
      '</div>' +
      '<span class="tour-arrow" aria-hidden="true"></span>';

    root.appendChild(dimmer);
    root.appendChild(spotlight);
    root.appendChild(card);
    document.body.appendChild(root);

    card.querySelector('[data-role="skip"]').addEventListener('click', finish);
    card.querySelector('[data-role="skip-sm"]').addEventListener('click', finish);
    card.querySelector('[data-role="back"]').addEventListener('click', prev);
    card.querySelector('[data-role="next"]').addEventListener('click', next);
  }

  function isElementRenderable(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  }

  function getTargetRect(selector) {
    var el = document.querySelector(selector);
    if (!isElementRenderable(el)) return null;
    return el.getBoundingClientRect();
  }

  function collectValidSteps() {
    var valid = [];
    for (var i = 0; i < STEPS.length; i += 1) {
      if (document.querySelector(STEPS[i].target)) {
        valid.push(STEPS[i]);
      }
    }
    return valid.length ? valid : STEPS.slice();
  }

  function positionSpotlight(rect) {
    if (!rect) {
      spotlight.style.opacity = '0';
      return;
    }
    var pad = 8;
    spotlight.style.opacity = '1';
    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';
  }

  function computePlacement(rect, preferred) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cardW = card.offsetWidth || 360;
    var cardH = card.offsetHeight || 220;
    var gap = 18;

    if (vw <= 480) {
      return rect.top > vh / 2 ? 'top' : 'bottom';
    }

    var fits = {
      top: rect.top - gap - cardH >= 8,
      bottom: rect.bottom + gap + cardH <= vh - 8,
      left: rect.left - gap - cardW >= 8,
      right: rect.right + gap + cardW <= vw - 8
    };

    if (fits[preferred]) return preferred;

    var order = ['bottom', 'top', 'right', 'left'];
    for (var i = 0; i < order.length; i += 1) {
      if (fits[order[i]]) return order[i];
    }
    return 'bottom';
  }

  function positionCard(rect, placement) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cardW = card.offsetWidth;
    var cardH = card.offsetHeight;
    var gap = 18;
    var left = 0;
    var top = 0;

    if (placement === 'top' || placement === 'bottom') {
      left = rect.left + rect.width / 2 - cardW / 2;
    } else if (placement === 'left') {
      left = rect.left - gap - cardW;
    } else {
      left = rect.right + gap;
    }

    if (placement === 'top') {
      top = rect.top - gap - cardH;
    } else if (placement === 'bottom') {
      top = rect.bottom + gap;
    } else {
      top = rect.top + rect.height / 2 - cardH / 2;
    }

    var margin = 12;
    if (left < margin) left = margin;
    if (left + cardW > vw - margin) left = vw - cardW - margin;
    if (top < margin) top = margin;
    if (top + cardH > vh - margin) top = vh - cardH - margin;

    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.setAttribute('data-placement', placement);
  }

  function scrollTargetIntoView(rect) {
    if (!rect) return;
    var vh = window.innerHeight;
    var safeTop = 96;
    var safeBottom = vh - 140;

    if (rect.top >= safeTop && rect.bottom <= safeBottom) return;

    var targetY = rect.top + window.pageYOffset - vh / 3;
    if (targetY < 0) targetY = 0;

    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  }

  function reposition() {
    if (!isRunning) return;
    var step = activeSteps[currentIndex];
    if (!step) return;

    var rect = getTargetRect(step.target);
    if (!rect) return;

    positionSpotlight(rect);
    var placement = computePlacement(rect, step.placement);
    positionCard(rect, placement);
  }

  function scheduleMissingRetry() {
    if (missingRetryTimer) {
      window.clearTimeout(missingRetryTimer);
      missingRetryTimer = null;
    }
    var attempts = 0;
    var maxAttempts = 12;

    var attempt = function () {
      var step = activeSteps[currentIndex];
      if (!step) return;
      if (getTargetRect(step.target)) {
        render();
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        missingRetryTimer = window.setTimeout(attempt, 180);
      } else {
        next();
      }
    };

    missingRetryTimer = window.setTimeout(attempt, 180);
  }

  function render() {
    if (!card) return;
    var step = activeSteps[currentIndex];
    if (!step) return finish();

    var label = card.querySelector('[data-role="step-label"]');
    var title = card.querySelector('[data-role="title"]');
    var body = card.querySelector('[data-role="body"]');
    var bar = card.querySelector('[data-role="progress-bar"]');
    var backBtn = card.querySelector('[data-role="back"]');
    var nextBtn = card.querySelector('[data-role="next"]');

    label.textContent = 'Step ' + (currentIndex + 1) + ' of ' + activeSteps.length;
    title.textContent = step.title;
    body.textContent = step.body;
    bar.style.width = ((currentIndex + 1) / activeSteps.length * 100).toFixed(2) + '%';
    backBtn.disabled = currentIndex === 0;
    nextBtn.textContent = currentIndex === activeSteps.length - 1 ? 'Finish' : 'Next';

    var rect = getTargetRect(step.target);
    if (!rect) {
      scheduleMissingRetry();
      return;
    }

    scrollTargetIntoView(rect);

    window.setTimeout(function () {
      if (!isRunning) return;
      var liveRect = getTargetRect(step.target);
      if (!liveRect) {
        scheduleMissingRetry();
        return;
      }
      positionSpotlight(liveRect);
      var placement = computePlacement(liveRect, step.placement);
      positionCard(liveRect, placement);
    }, 260);
  }

  function next() {
    if (!isRunning) return;
    if (currentIndex >= activeSteps.length - 1) return finish();
    currentIndex += 1;
    render();
  }

  function prev() {
    if (!isRunning) return;
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    render();
  }

  function attachListeners() {
    keydownHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
      } else if (event.key === 'ArrowRight') {
        next();
      } else if (event.key === 'ArrowLeft') {
        prev();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    };

    resizeHandler = function () {
      reposition();
    };

    scrollHandler = function () {
      reposition();
    };

    document.addEventListener('keydown', keydownHandler);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);
    window.addEventListener('scroll', scrollHandler, true);
  }

  function detachListeners() {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('orientationchange', resizeHandler);
      resizeHandler = null;
    }
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      scrollHandler = null;
    }
    if (missingRetryTimer) {
      window.clearTimeout(missingRetryTimer);
      missingRetryTimer = null;
    }
  }

  function trapFocus(event) {
    if (!card) return;
    var focusable = card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function lockScroll() {
    document.documentElement.classList.add('tour-scroll-lock');
    document.body.classList.add('tour-scroll-lock');
  }

  function unlockScroll() {
    document.documentElement.classList.remove('tour-scroll-lock');
    document.body.classList.remove('tour-scroll-lock');
  }

  function start() {
    if (isRunning) return;
    buildDom();

    activeSteps = collectValidSteps();
    if (!activeSteps.length) return finish();

    currentIndex = 0;
    isRunning = true;
    root.hidden = false;
    root.classList.add('is-active');
    lockScroll();
    attachListeners();

    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });

    render();
  }

  function finish() {
    if (!root) {
      markCompleted();
      return;
    }

    markCompleted();
    isRunning = false;
    root.classList.remove('is-active');

    window.setTimeout(function () {
      if (root) root.hidden = true;
      unlockScroll();
      detachListeners();
    }, 260);
  }

  function reset() {
    clearCompleted();
    if (isRunning) {
      isRunning = false;
      if (root) {
        root.classList.remove('is-active');
        root.hidden = true;
      }
      unlockScroll();
      detachListeners();
    }
    window.setTimeout(start, 60);
  }

  function shouldAutoStart() {
    return !hasCompleted();
  }

  function autoStartAfterLogin() {
    if (!shouldAutoStart()) return;
    if (isRunning) return;

    var token = Date.now() + '-' + Math.random();
    pendingLoginToken = token;

    window.setTimeout(function () {
      if (pendingLoginToken !== token) return;
      pendingLoginToken = null;
      if (isRunning) return;
      if (!shouldAutoStart()) return;
      start();
    }, LOGIN_DELAY);
  }

  window.TradeTeenTutorial = {
    start: start,
    reset: reset,
    finish: finish,
    shouldAutoStart: shouldAutoStart,
    autoStartAfterLogin: autoStartAfterLogin
  };

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-tour-restart]');
    if (!trigger) return;
    event.preventDefault();
    reset();
  });
})();
