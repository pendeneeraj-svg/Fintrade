(function () {
  'use strict';

  var STOCKS = {
    AAPL: { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: '$', price: 189.25, prevClose: 189.82, change: -0.30, sector: 'Tech' },
    RELIANCE: { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', currency: '₹', price: 2940.50, prevClose: 2899.90, change: 1.40, sector: 'Energy' },
    TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: '$', price: 240.10, prevClose: 235.16, change: 2.10, sector: 'Energy' },
    MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', currency: '$', price: 412.80, prevClose: 410.13, change: 0.65, sector: 'Tech' },
    TCS: { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', currency: '₹', price: 4120.00, prevClose: 4087.30, change: 0.80, sector: 'Tech' }
  };

  var INDEXES = {
    NIFTY: { symbol: 'NIFTY 50', price: 22415.60, prevClose: 22299.70, currency: '₹' },
    SENSEX: { symbol: 'SENSEX', price: 73880.15, prevClose: 73961.50, currency: '₹' }
  };

  var LEVELS = [
    { min: 0, level: 1, title: 'Rookie', icon: '⚡' },
    { min: 55000, level: 2, title: 'Trader', icon: '📈' },
    { min: 70000, level: 3, title: 'Analyst', icon: '🧠' },
    { min: 100000, level: 4, title: 'Strategist', icon: '🎯' },
    { min: 150000, level: 5, title: 'Pro Trader', icon: '👑' }
  ];

  var START_CASH = 50000;

  var state = {
    cash: START_CASH,
    startingCash: START_CASH,
    holdings: {},
    orders: [],
    orderType: 'market',
    selected: 'RELIANCE',
    level: 1
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function fmt(value, decimals) {
    var d = typeof decimals === 'number' ? decimals : 2;
    var n = Number(value) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function coins(value) {
    return '🪙 ' + fmt(value, 2);
  }

  function pct(value) {
    var n = Number(value) || 0;
    return (n >= 0 ? '+' : '') + fmt(n, 2) + '%';
  }

  function signed(value) {
    var n = Number(value) || 0;
    return (n >= 0 ? '+' : '-') + '🪙 ' + fmt(Math.abs(n), 2);
  }

  function priceLabel(stock) {
    return stock.currency + fmt(stock.price, 2);
  }

  function currentPrice(symbol) {
    return STOCKS[symbol] ? STOCKS[symbol].price : 0;
  }

  function getHolding(symbol) {
    if (!state.holdings[symbol]) {
      state.holdings[symbol] = { qty: 0, avgCost: 0 };
    }
    return state.holdings[symbol];
  }

  function cacheElements() {
    el.navBalance = $('navBalance');
    el.levelIcon = $('levelIcon');
    el.levelText = $('levelText');
    el.stockSelect = $('stockSelect');
    el.qtyInput = $('qtyInput');
    el.orderTypeToggle = $('orderTypeToggle');
    el.limitField = $('limitField');
    el.limitInput = $('limitInput');
    el.orderValue = $('orderValue');
    el.orderAvailable = $('orderAvailable');
    el.orderHolding = $('orderHolding');
    el.buyBtn = $('buyBtn');
    el.sellBtn = $('sellBtn');
    el.chartSymbol = $('chartSymbol');
    el.chartName = $('chartName');
    el.chartPrice = $('chartPrice');
    el.chartChange = $('chartChange');
    el.portfolioValue = $('portfolioValue');
    el.portfolioDelta = $('portfolioDelta');
    el.pnlValue = $('pnlValue');
    el.pnlPct = $('pnlPct');
    el.cashValue = $('cashValue');
    el.investedValue = $('investedValue');
    el.holdingsCount = $('holdingsCount');
    el.allocNote = $('allocNote');
    el.allocTech = $('allocTech');
    el.allocEnergy = $('allocEnergy');
    el.allocBanking = $('allocBanking');
    el.allocBar = $('allocBar');
    el.toastStack = $('toastStack');
    el.navBurger = $('navBurger');
    el.navLinks = $('navLinks');
    el.leaderboardTabs = $('leaderboardTabs');
    el.tabIndicator = $('tabIndicator');
    el.glossaryDrawer = $('glossaryDrawer');
    el.glossaryOpen = $('glossaryOpen');
    el.glossaryClose = $('glossaryClose');
    el.glossarySearch = $('glossarySearch');
    el.glossaryList = $('glossaryList');
    el.drawerOverlay = $('drawerOverlay');
    el.authModal = $('authModal');
    el.authForm = $('authForm');
  }

  function renderTicker() {
    qsa('.ticker-item').forEach(function (item) {
      var symbol = item.getAttribute('data-symbol');
      var data = STOCKS[symbol] || INDEXES[symbol];
      if (!data) return;

      var priceEl = item.querySelector('.ticker-price');
      var changeEl = item.querySelector('.ticker-change');
      var changeValue = data.change;

      if (typeof changeValue !== 'number') {
        changeValue = ((data.price / data.prevClose) - 1) * 100;
        data.change = changeValue;
      }

      if (priceEl) priceEl.textContent = data.currency + fmt(data.price, 2);

      if (changeEl) {
        changeEl.textContent = (changeValue >= 0 ? '+' : '') + fmt(changeValue, 2) + '%';
        changeEl.classList.toggle('up', changeValue >= 0);
        changeEl.classList.toggle('down', changeValue < 0);
      }
    });
  }

  function renderChartHeader() {
    var stock = STOCKS[state.selected];
    if (!stock || !el.chartSymbol) return;

    el.chartSymbol.textContent = stock.symbol;
    el.chartName.textContent = stock.name + ' · ' + stock.exchange;
    el.chartPrice.textContent = priceLabel(stock);
    el.chartChange.textContent = (stock.change >= 0 ? '+' : '') + fmt(stock.change, 2) + '%';
    el.chartChange.classList.toggle('up', stock.change >= 0);
    el.chartChange.classList.toggle('down', stock.change < 0);
  }

  function renderBalance() {
    if (el.navBalance) el.navBalance.textContent = fmt(state.cash, 0);
    if (el.cashValue) el.cashValue.textContent = coins(state.cash);
    if (el.orderAvailable) el.orderAvailable.textContent = coins(state.cash);
  }

  function portfolioMetrics() {
    var marketValue = 0;
    var invested = 0;
    var dailyChange = 0;
    var positions = 0;

    Object.keys(state.holdings).forEach(function (symbol) {
      var holding = state.holdings[symbol];
      if (!holding || holding.qty <= 0) return;

      var stock = STOCKS[symbol];
      if (!stock) return;

      var value = holding.qty * stock.price;
      var cost = holding.qty * holding.avgCost;

      marketValue += value;
      invested += cost;
      dailyChange += holding.qty * (stock.price - stock.prevClose);
      positions += 1;
    });

    var totalValue = state.cash + marketValue;
    var totalReturn = totalValue - state.startingCash;
    var totalReturnPct = state.startingCash > 0 ? (totalReturn / state.startingCash) * 100 : 0;
    var dayBase = totalValue - dailyChange;
    var dailyPct = dayBase > 0 ? (dailyChange / dayBase) * 100 : 0;

    return {
      marketValue: marketValue,
      invested: invested,
      dailyChange: dailyChange,
      dailyPct: dailyPct,
      totalValue: totalValue,
      totalReturn: totalReturn,
      totalReturnPct: totalReturnPct,
      positions: positions
    };
  }

  function renderPortfolio() {
    var m = portfolioMetrics();

    if (el.portfolioValue) el.portfolioValue.textContent = coins(m.totalValue);

    if (el.portfolioDelta) {
      el.portfolioDelta.textContent = pct(m.totalReturnPct) + ' all time';
      el.portfolioDelta.classList.toggle('up', m.totalReturnPct >= 0);
      el.portfolioDelta.classList.toggle('down', m.totalReturnPct < 0);
    }

    if (el.pnlValue) el.pnlValue.textContent = signed(m.dailyChange);

    if (el.pnlPct) {
      el.pnlPct.textContent = pct(m.dailyPct) + ' today';
      el.pnlPct.classList.toggle('up', m.dailyChange >= 0);
      el.pnlPct.classList.toggle('down', m.dailyChange < 0);
      el.pnlPct.classList.toggle('muted', false);
    }

    if (el.investedValue) el.investedValue.textContent = coins(m.invested);

    if (el.holdingsCount) {
      el.holdingsCount.textContent = m.positions === 1 ? '1 open position' : m.positions + ' open positions';
    }

    renderAllocation(m.marketValue);
    updateLevel(m.totalValue);
    renderBalance();
  }

  function renderAllocation(marketValue) {
    var totals = { Tech: 0, Energy: 0, Banking: 0 };
    var sum = 0;

    Object.keys(state.holdings).forEach(function (symbol) {
      var holding = state.holdings[symbol];
      if (!holding || holding.qty <= 0) return;

      var stock = STOCKS[symbol];
      if (!stock) return;

      var value = holding.qty * stock.price;
      totals[stock.sector] = (totals[stock.sector] || 0) + value;
      sum += value;
    });

    if (sum <= 0) sum = marketValue > 0 ? marketValue : 0;

    var techPct = sum > 0 ? (totals.Tech / sum) * 100 : 0;
    var energyPct = sum > 0 ? (totals.Energy / sum) * 100 : 0;
    var bankingPct = sum > 0 ? (totals.Banking / sum) * 100 : 0;

    var segTech = document.querySelector('.alloc-seg.seg-tech');
    var segEnergy = document.querySelector('.alloc-seg.seg-energy');
    var segBanking = document.querySelector('.alloc-seg.seg-banking');

    if (segTech) segTech.style.width = techPct.toFixed(2) + '%';
    if (segEnergy) segEnergy.style.width = energyPct.toFixed(2) + '%';
    if (segBanking) segBanking.style.width = bankingPct.toFixed(2) + '%';

    if (el.allocTech) el.allocTech.textContent = fmt(techPct, 0) + '%';
    if (el.allocEnergy) el.allocEnergy.textContent = fmt(energyPct, 0) + '%';
    if (el.allocBanking) el.allocBanking.textContent = fmt(bankingPct, 0) + '%';

    if (el.allocNote) {
      el.allocNote.textContent = sum > 0 ? 'Across ' + fmt(sum, 0) + ' coins deployed' : 'No open positions yet';
    }
  }

  function updateLevel(totalValue) {
    var active = LEVELS[0];

    for (var i = 0; i < LEVELS.length; i += 1) {
      if (totalValue >= LEVELS[i].min) active = LEVELS[i];
    }

    state.level = active.level;

    if (el.levelIcon) el.levelIcon.textContent = active.icon;
    if (el.levelText) el.levelText.textContent = active.title + ' (Level ' + active.level + ')';
  }

  function renderOrderSummary() {
    var stock = STOCKS[state.selected];
    if (!stock) return;

    var qty = parseInt(el.qtyInput ? el.qtyInput.value : '1', 10);
    if (isNaN(qty) || qty < 0) qty = 0;

    var price = state.orderType === 'limit' ? parseFloat(el.limitInput.value) : stock.price;
    if (isNaN(price) || price < 0) price = stock.price;

    if (el.orderValue) el.orderValue.textContent = coins(qty * price);
    if (el.orderAvailable) el.orderAvailable.textContent = coins(state.cash);

    var holding = getHolding(state.selected);
    if (el.orderHolding) {
      el.orderHolding.textContent = holding.qty + (holding.qty === 1 ? ' share' : ' shares');
    }
  }

  function renderStockSelect() {
    if (!el.stockSelect) return;

    qsa('option', el.stockSelect).forEach(function (option) {
      var stock = STOCKS[option.value];
      if (!stock) return;
      option.textContent = stock.name.replace(/\s(Ltd\.|Inc\.|Corp\.)$/, '') + ' (' + stock.symbol + ') · ' + priceLabel(stock);
    });
  }

  function toast(type, title, message) {
    if (!el.toastStack) return;

    var icons = { success: '✅', error: '⚠️', info: 'ℹ️' };

    var node = document.createElement('div');
    node.className = 'toast toast-' + type;

    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || icons.info;

    var body = document.createElement('div');
    body.className = 'toast-body';

    var titleNode = document.createElement('span');
    titleNode.className = 'toast-title';
    titleNode.textContent = title;

    var msgNode = document.createElement('span');
    msgNode.className = 'toast-msg';
    msgNode.textContent = message;

    body.appendChild(titleNode);
    body.appendChild(msgNode);
    node.appendChild(icon);
    node.appendChild(body);
    el.toastStack.appendChild(node);

    window.setTimeout(function () {
      node.classList.add('is-leaving');
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 300);
    }, 3600);
  }

  function setSelected(symbol) {
    if (!STOCKS[symbol]) return;

    state.selected = symbol;

    var stock = STOCKS[symbol];
    var holding = getHolding(symbol);

    if (el.stockSelect) el.stockSelect.value = symbol;
    if (el.limitInput) el.limitInput.value = fmt(stock.price, 2).replace(/,/g, '');

    renderChartHeader();
    renderOrderSummary();

    document.dispatchEvent(new CustomEvent('stock:change', {
      detail: { symbol: symbol, price: stock.price, name: stock.name, exchange: stock.exchange }
    }));

    if (holding.qty > 0) {
      toast('info', symbol + ' selected', 'You currently hold ' + holding.qty + ' shares at an average of ' + coins(holding.avgCost) + '.');
    }
  }

  function resolvePrice(symbol, side, orderType, limitPrice) {
    var market = currentPrice(symbol);

    if (orderType === 'market') {
      return { fill: true, price: market };
    }

    if (!limitPrice || isNaN(limitPrice) || limitPrice <= 0) {
      return { fill: true, price: market };
    }

    if (side === 'buy') {
      return limitPrice >= market
        ? { fill: true, price: market }
        : { fill: false, price: limitPrice };
    }

    return limitPrice <= market
      ? { fill: true, price: market }
      : { fill: false, price: limitPrice };
  }

  function executeBuy(symbol, qty, orderType, limitPrice) {
    var stock = STOCKS[symbol];
    var resolution = resolvePrice(symbol, 'buy', orderType, limitPrice);

    if (!resolution.fill) {
      state.orders.push({ symbol: symbol, side: 'buy', qty: qty, price: resolution.price, type: 'limit', status: 'Pending' });
      toast('info', 'Limit order queued', 'Buy ' + qty + ' ' + symbol + ' at ' + coins(resolution.price) + '. Waiting for the market to reach your price.');
      return;
    }

    var cost = qty * resolution.price;

    if (cost > state.cash) {
      toast('error', 'Insufficient coins', 'You need ' + coins(cost) + ' but only have ' + coins(state.cash) + '.');
      return;
    }

    var holding = getHolding(symbol);
    var newQty = holding.qty + qty;
    var newCost = holding.qty * holding.avgCost + cost;

    holding.qty = newQty;
    holding.avgCost = newQty > 0 ? newCost / newQty : 0;

    state.cash -= cost;
    state.orders.push({ symbol: symbol, side: 'buy', qty: qty, price: resolution.price, type: orderType, status: 'Filled' });

    renderPortfolio();
    renderOrderSummary();

    toast('success', 'Bought ' + qty + ' ' + symbol, 'Filled at ' + coins(resolution.price) + ' · Total ' + coins(cost) + '.');
  }

  function executeSell(symbol, qty, orderType, limitPrice) {
    var holding = getHolding(symbol);

    if (holding.qty < qty) {
      toast('error', 'Not enough shares', 'You hold ' + holding.qty + ' ' + symbol + ' shares and tried to sell ' + qty + '.');
      return;
    }

    var resolution = resolvePrice(symbol, 'sell', orderType, limitPrice);

    if (!resolution.fill) {
      state.orders.push({ symbol: symbol, side: 'sell', qty: qty, price: resolution.price, type: 'limit', status: 'Pending' });
      toast('info', 'Limit order queued', 'Sell ' + qty + ' ' + symbol + ' at ' + coins(resolution.price) + '. Waiting for the market to reach your price.');
      return;
    }

    var proceeds = qty * resolution.price;
    var realized = (resolution.price - holding.avgCost) * qty;

    holding.qty -= qty;
    if (holding.qty === 0) holding.avgCost = 0;

    state.cash += proceeds;
    state.orders.push({ symbol: symbol, side: 'sell', qty: qty, price: resolution.price, type: orderType, status: 'Filled' });

    renderPortfolio();
    renderOrderSummary();

    toast(
      realized >= 0 ? 'success' : 'error',
      'Sold ' + qty + ' ' + symbol,
      'Filled at ' + coins(resolution.price) + ' · ' + (realized >= 0 ? 'Profit ' : 'Loss ') + coins(Math.abs(realized)) + '.'
    );
  }

  function readOrderInput() {
    var symbol = el.stockSelect ? el.stockSelect.value : state.selected;
    var qty = parseInt(el.qtyInput ? el.qtyInput.value : '1', 10);
    var limitPrice = el.limitInput ? parseFloat(el.limitInput.value) : 0;

    if (!STOCKS[symbol]) {
      toast('error', 'Invalid stock', 'Please choose a valid stock from the list.');
      return null;
    }

    if (isNaN(qty) || qty <= 0) {
      toast('error', 'Invalid quantity', 'Enter a quantity of at least 1 share.');
      return null;
    }

    return { symbol: symbol, qty: qty, orderType: state.orderType, limitPrice: limitPrice };
  }

  function handleBuy() {
    var order = readOrderInput();
    if (!order) return;
    executeBuy(order.symbol, order.qty, order.orderType, order.limitPrice);
  }

  function handleSell() {
    var order = readOrderInput();
    if (!order) return;
    executeSell(order.symbol, order.qty, order.orderType, order.limitPrice);
  }

  function initOrderTypeToggle() {
    if (!el.orderTypeToggle) return;

    qsa('.toggle-btn', el.orderTypeToggle).forEach(function (button) {
      button.addEventListener('click', function () {
        var type = button.getAttribute('data-order-type');
        state.orderType = type;

        qsa('.toggle-btn', el.orderTypeToggle).forEach(function (other) {
          other.classList.toggle('is-active', other === button);
        });

        if (el.limitField) el.limitField.hidden = type !== 'limit';

        if (type === 'limit' && el.limitInput && !el.limitInput.value) {
          el.limitInput.value = fmt(currentPrice(state.selected), 2).replace(/,/g, '');
        }

        renderOrderSummary();
      });
    });
  }

  function initLeaderboardTabs() {
    if (!el.leaderboardTabs) return;

    var buttons = qsa('.tab-btn', el.leaderboardTabs);

    function moveIndicator(button) {
      if (!el.tabIndicator || !button) return;
      el.tabIndicator.style.width = button.offsetWidth + 'px';
      el.tabIndicator.style.transform = 'translateX(' + (button.offsetLeft - 5) + 'px)';
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-tab');

        buttons.forEach(function (other) {
          other.classList.toggle('is-active', other === button);
          other.setAttribute('aria-selected', other === button ? 'true' : 'false');
        });

        qsa('.tab-panel').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target);
        });

        moveIndicator(button);
      });
    });

    window.setTimeout(function () {
      moveIndicator(el.leaderboardTabs.querySelector('.tab-btn.is-active'));
    }, 80);

    window.addEventListener('resize', function () {
      moveIndicator(el.leaderboardTabs.querySelector('.tab-btn.is-active'));
    });
  }

  function initGlossary() {
    if (el.glossaryList) {
      qsa('.accordion-head', el.glossaryList).forEach(function (head) {
        head.addEventListener('click', function () {
          var item = head.parentNode;
          var wasOpen = item.classList.contains('is-open');

          qsa('.accordion-item', el.glossaryList).forEach(function (other) {
            other.classList.remove('is-open');
          });

          if (!wasOpen) item.classList.add('is-open');
        });
      });
    }

    if (el.glossarySearch && el.glossaryList) {
      el.glossarySearch.addEventListener('input', function () {
        var query = el.glossarySearch.value.trim().toLowerCase();

        qsa('.accordion-item', el.glossaryList).forEach(function (item) {
          var term = (item.getAttribute('data-term') || '') + ' ' + item.textContent.toLowerCase();
          item.classList.toggle('is-hidden', query.length > 0 && term.indexOf(query) === -1);
        });
      });
    }
  }

  function openDrawer() {
    if (!el.glossaryDrawer) return;
    el.glossaryDrawer.classList.add('is-open');
    el.glossaryDrawer.setAttribute('aria-hidden', 'false');
    if (el.drawerOverlay) {
      el.drawerOverlay.hidden = false;
      el.drawerOverlay.style.display = '';
    }
    if (el.glossarySearch) window.setTimeout(function () { el.glossarySearch.focus(); }, 220);
  }

  function closeDrawer() {
    if (!el.glossaryDrawer) return;
    el.glossaryDrawer.classList.remove('is-open');
    el.glossaryDrawer.setAttribute('aria-hidden', 'true');
    if (el.drawerOverlay) {
      el.drawerOverlay.hidden = true;
      el.drawerOverlay.style.display = 'none';
    }
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = '';
    modal.style.visibility = '';
    modal.style.pointerEvents = '';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';

    var active = document.activeElement;
    if (active && modal.contains(active) && typeof active.blur === 'function') {
      active.blur();
    }
  }

  function closeAllModals() {
    qsa('.modal').forEach(function (modal) {
      closeModal(modal);
    });
  }

  function initModals() {
    qsa('.modal-close').forEach(function (button) {
      button.addEventListener('click', function () {
        closeModal(document.getElementById(button.getAttribute('data-close')));
      });
    });

    qsa('.modal').forEach(function (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal(modal);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeAllModals();
      closeDrawer();
    });

    var loginBtn = $('loginBtn');
    var getStartedBtn = $('getStartedBtn');
    var heroStart = $('heroStart');

    if (loginBtn) loginBtn.addEventListener('click', function () { openModal(el.authModal); });
    if (getStartedBtn) getStartedBtn.addEventListener('click', function () { openModal(el.authModal); });
    if (heroStart) heroStart.addEventListener('click', function () { openModal(el.authModal); });

    if (el.authForm) {
      el.authForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var nameInput = $('authName');
        var name = (nameInput && nameInput.value.trim()) || 'Trader';

        closeModal(el.authModal);
        el.authForm.reset();

        toast('success', 'Welcome, ' + name + '!', 'Your account is ready with 50,000 virtual coins.');
      });
    }

    closeAllModals();
  }

  function initNav() {
    if (!el.navBurger || !el.navLinks) return;

    el.navBurger.addEventListener('click', function () {
      var isOpen = el.navLinks.classList.toggle('is-open');
      el.navBurger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    qsa('.nav-link', el.navLinks).forEach(function (link) {
      link.addEventListener('click', function () {
        el.navLinks.classList.remove('is-open');
        el.navBurger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initChallengeButtons() {
    qsa('.join-challenge').forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('.challenge-card');
        var title = card ? (card.querySelector('.challenge-title') || {}).textContent : 'Challenge';

        if (button.classList.contains('btn-outline')) {
          button.classList.remove('btn-outline');
          button.classList.add('btn-primary');
          toast('success', 'Joined: ' + title, 'The challenge is now active on your dashboard.');
        } else {
          toast('info', 'Already joined', 'You are already competing in ' + title + '.');
        }
      });
    });
  }

  function initLessonButtons() {
    qsa('.start-lesson').forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('.module-card');
        var title = card ? (card.querySelector('.module-title') || {}).textContent : 'Lesson';
        toast('info', 'Starting: ' + title, 'Lesson player launching — 5 minutes, no prerequisites.');
      });
    });
  }

  function initChartRanges() {
    qsa('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        qsa('.chip').forEach(function (other) {
          other.classList.remove('is-active');
        });
        chip.classList.add('is-active');

        document.dispatchEvent(new CustomEvent('chart:range', {
          detail: { range: chip.getAttribute('data-range') }
        }));
      });
    });
  }

  function tickMarket() {
    Object.keys(STOCKS).forEach(function (key) {
      var stock = STOCKS[key];
      var drift = (Math.random() - 0.5) * 0.006;
      stock.price = Math.max(1, Number((stock.price * (1 + drift)).toFixed(2)));
      stock.change = Number((((stock.price / stock.prevClose) - 1) * 100).toFixed(2));
    });

    Object.keys(INDEXES).forEach(function (key) {
      var index = INDEXES[key];
      var drift = (Math.random() - 0.5) * 0.0025;
      index.price = Number((index.price * (1 + drift)).toFixed(2));
      index.change = Number((((index.price / index.prevClose) - 1) * 100).toFixed(2));
    });

    renderTicker();
    renderChartHeader();
    renderOrderSummary();
    renderPortfolio();

    document.dispatchEvent(new CustomEvent('market:tick', {
      detail: { symbol: state.selected, price: currentPrice(state.selected) }
    }));
  }

  function init() {
    cacheElements();
    renderStockSelect();
    initOrderTypeToggle();
    initLeaderboardTabs();
    initGlossary();
    initModals();
    initNav();
    initChallengeButtons();
    initLessonButtons();
    initChartRanges();

    if (el.stockSelect) {
      el.stockSelect.addEventListener('change', function () {
        setSelected(el.stockSelect.value);
      });
    }

    if (el.qtyInput) {
      el.qtyInput.addEventListener('input', renderOrderSummary);
      el.qtyInput.addEventListener('change', renderOrderSummary);
    }

    if (el.limitInput) {
      el.limitInput.addEventListener('input', renderOrderSummary);
    }

    if (el.buyBtn) el.buyBtn.addEventListener('click', handleBuy);
    if (el.sellBtn) el.sellBtn.addEventListener('click', handleSell);
    if (el.glossaryOpen) el.glossaryOpen.addEventListener('click', openDrawer);
    if (el.glossaryClose) el.glossaryClose.addEventListener('click', closeDrawer);
    if (el.drawerOverlay) el.drawerOverlay.addEventListener('click', closeDrawer);

    setSelected(state.selected);
    renderTicker();
    renderPortfolio();
    renderOrderSummary();

    window.setInterval(tickMarket, 3200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();