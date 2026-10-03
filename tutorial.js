(function () {
  'use strict';

  var STORAGE_KEY = 'tradeteen.tutorialDone';
  var DELAY_AFTER_LOGIN = 620;

  var STEPS = [
    {
      target: '.portfolio-grid',
      placement: 'top',
      title: 'Your Portfolio Overview',
      body: 'These four cards show your total portfolio value, today\u2019s profit or loss, available coins, and how much capital is currently invested.'
    },
    {
      target: '.chart-card',
      placement: 'bottom',
      title: 'Live Market & Chart',
      body: 'Pick any stock to see its live simulated price. Use the 1D, 1W, 1M and 1Y chips to change the chart range.'
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
      title: 'Leaderboards & Challenges',
      body: 'Compete with traders worldwide, inside your school network, or against friends \u2014 and join weekly challenges to earn bonus coins.'
    },
    {
      target: '#learning',
      placement: 'top',
      title: 'Learning Hub',
      body: 'Bite-sized five-minute lessons and a searchable glossary will help you grow from a Rookie into a Pro Trader. That\u2019s it \u2014 happy trading!'
    }
  ];

  var root = null;
  var spotlight = null;
  var card = null;
  var dimmer = null;
  var currentIndex = 0;
  var activeTarget = null;
  var previousOverflow = '';
  var keydownHandler = null;
  var resizeHandler = null;

  function $(selector, ctx) {
    return (ctx || document).querySelector(selector);
  }

  function hasCompleted() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function markCompleted() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      return;
    }
  }

  function clearCompleted() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      return;
    }
  }

  function buildDom() {
    if (root) return;

    root = document.createElement('div');
    root.className = 'tour-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Product tour');
    root.setAttribute('hidden', 'hidden');

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

  function getTargetRect(selector) {
    var el = document.querySelector(selector);
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
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

    if (vw <= 480) return 'bottom';

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
    var top = rect.top;
    var bottom = rect.bottom;
    if (top >= 90 && bottom <= vh - 120) return;

    var target = rect.top + window.pageYOffset - vh / 3;
    window.scrollTo({
      top: Math.max(0, target),
      behavior: 'smooth'
    });
  }

  function render() {
    var step = STEPS[currentIndex];
    if (!step) return finish();

    activeTarget = step.target;

    var label = card.querySelector('[data-role="step-label"]');
    var title = card.querySelector('[data-role="title"]');
    var body = card.querySelector('[data-role="body"]');
    var bar = card.querySelector('[data-role="progress-bar"]');
    var backBtn = card.querySelector('[data-role="back"]');
    var nextBtn = card.querySelector('[data-role="next"]');

    label.textContent = 'Step ' + (currentIndex + 1) + ' of ' + STEPS.length;
    title.textContent = step.title;
    body.textContent = step.body;
    bar.style.width = ((currentIndex + 1) / STEPS.length * 100).toFixed(2) + '%';
    backBtn.disabled = currentIndex === 0;
    nextBtn.textContent = currentIndex === STEPS.length - 1 ? 'Finish' : 'Next';

    var rect = getTargetRect(step.target);
    if (!rect) {
      if (currentIndex < STEPS.length - 1) return next();
      return finish();
    }

    scrollTargetIntoView(rect);

    window.setTimeout(function () {
      var liveRect = getTargetRect(step.target);
      if (!liveRect) return;

      positionSpotlight(liveRect);
      var placement = computePlacement(liveRect, step.placement);
      positionCard(liveRect, placement);
    }, 260);
  }

  function next() {
    if (currentIndex >= STEPS.length - 1) return finish();
    currentIndex += 1;
    render();
  }

  function prev() {
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    render();
  }

  function start() {
    buildDom();
    currentIndex = 0;
    root.removeAttribute('hidden');
    root.classList.add('is-active');
    document.body.classList.add('tour-open');
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    keydownHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
      } else if (event.key === 'ArrowRight') {
        next();
      } else if (event.key === 'ArrowLeft') {
        prev();
      }
    };

    resizeHandler = function () {
      if (!root || root.hasAttribute('hidden')) return;
      var step = STEPS[currentIndex];
      if (!step) return;
      var rect = getTargetRect(step.target);
      if (!rect) return;
      positionSpotlight(rect);
      var placement = computePlacement(rect, step.placement);
      positionCard(rect, placement);
    };

    document.addEventListener('keydown', keydownHandler);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', resizeHandler, true);

    render();
  }

  function finish() {
    if (!root) return;

    root.classList.remove('is-active');

    window.setTimeout(function () {
      if (root) root.setAttribute('hidden', 'hidden');
      document.body.classList.remove('tour-open');
      document.body.style.overflow = previousOverflow || '';

      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        window.removeEventListener('scroll', resizeHandler, true);
        resizeHandler = null;
      }
    }, 260);

    markCompleted();
  }

  function reset() {
    clearCompleted();
    start();
  }

  function shouldAutoStart() {
    return !hasCompleted();
  }

  function autoStartAfterLogin() {
    if (!shouldAutoStart()) return;
    window.setTimeout(function () {
      start();
    }, DELAY_AFTER_LOGIN);
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
