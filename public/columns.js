/* Column pages: theme toggle, mobile search, share, related headlines, AdSense units. */
(function () {
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  function paint() { if (meta) meta.setAttribute('content', root.classList.contains('dark') ? '#0E141C' : '#1D4F91'); }
  paint();
  document.querySelectorAll('.theme-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem('darkMode', String(dark)); } catch (e) {}
      paint();
    });
  });
  document.querySelectorAll('.search-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var form = button.closest('.search-bar');
      var open = form.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
      if (open) { var input = form.querySelector('input'); if (input) input.focus(); }
    });
  });

  document.querySelectorAll('.share-buttons').forEach(function (box) {
    var url = box.getAttribute('data-url') || location.href;
    var title = box.getAttribute('data-title') || document.title;
    var copy = box.querySelector('.share-copy');
    if (copy) copy.addEventListener('click', function () {
      var done = function () { copy.textContent = '已複製'; copy.classList.add('done'); setTimeout(function () { copy.textContent = '複製連結'; copy.classList.remove('done'); }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('複製連結', url); });
      else prompt('複製連結', url);
    });
    var native = box.querySelector('.share-native');
    if (native && navigator.share) {
      native.hidden = false;
      native.addEventListener('click', function () { navigator.share({ title: title, url: url }).catch(function () {}); });
    }
  });

  try {
    document.querySelectorAll('ins.adsbygoogle').forEach(function () { (window.adsbygoogle = window.adsbygoogle || []).push({}); });
  } catch (e) {}

  var related = document.getElementById('related');
  if (!related) return;
  var TILE = { hk: ['#C8102E', 'hkg', '香港'], china: ['#9A3412', 'asi', '中國'], asia: ['#0C3C78', 'asi', '亞洲'], world: ['#1D4F91', 'int', '國際'], business: ['#0B6B4F', 'usa', '財經'], tech: ['#1E4D8C', 'all', '科技'], science: ['#0F6E56', 'int', '科學'], health: ['#8A4B08', 'all', '健康'], sport: ['#8E1B2C', 'all', '體育'], entertainment: ['#5B3A8C', 'all', '娛樂'] };
  var cats = (related.getAttribute('data-categories') || '').split(',').filter(Boolean);
  var exclude = [];
  try { exclude = JSON.parse(related.getAttribute('data-exclude') || '[]'); } catch (e) {}
  function el(tag, cls, text) { var node = document.createElement(tag); if (cls) node.className = cls; if (text) node.textContent = text; return node; }
  function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function tile(item) {
    var t = TILE[item.category] || TILE.world;
    var box = el('div', 'thumb thumb-fallback');
    box.style.setProperty('--ph', t[0]);
    var icon = el('span', 'region-icon region-icon-lg');
    icon.style.maskImage = icon.style.webkitMaskImage = "url('/icons/" + t[1] + ".svg')";
    box.appendChild(icon);
    box.appendChild(el('span', 'thumb-source', item.source));
    return box;
  }
  function card(item) {
    var t = TILE[item.category] || TILE.world;
    var article = el('article', 'story');
    var link = el('a', 'story-media');
    link.href = item.link; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.tabIndex = -1;
    if (item.image && /^https?:/.test(item.image)) {
      var img = el('img', 'thumb');
      img.src = item.image; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.width = 640; img.height = 360;
      img.onerror = function () { img.replaceWith(tile(item)); };
      link.appendChild(img);
    } else link.appendChild(tile(item));
    article.appendChild(link);
    var body = el('div', 'story-body');
    var kicker = el('div', 'story-kicker');
    var chip = el('a', 'chip cat-chip', t[2]);
    chip.href = '/category/' + (TILE[item.category] ? item.category : 'world');
    chip.style.setProperty('--ph', t[0]);
    kicker.appendChild(chip);
    body.appendChild(kicker);
    var h = el('h3', 'story-title');
    var a = el('a', '', item.title); a.href = item.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
    h.appendChild(a); body.appendChild(h);
    var meta = el('div', 'story-meta');
    var domain = host(item.sourceUrl || item.link);
    if (domain) { var fav = el('img', 'favicon'); fav.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=32'; fav.width = 16; fav.height = 16; fav.alt = ''; fav.loading = 'lazy'; meta.appendChild(fav); }
    meta.appendChild(el('span', 'source-tag', item.source));
    body.appendChild(meta);
    article.appendChild(body);
    return article;
  }
  fetch('/api/news').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
    if (!data || !data.items) return;
    var items = data.items.filter(function (item) { return item.link && exclude.indexOf(item.link) < 0; });
    var picked = items.filter(function (item) { return cats.indexOf(item.category) >= 0; });
    var withImg = function (list) { return list.slice().sort(function (a, b) { return (b.image ? 1 : 0) - (a.image ? 1 : 0); }); };
    picked = withImg(picked.slice(0, 12)).slice(0, 6);
    if (picked.length < 4) picked = picked.concat(items.filter(function (item) { return picked.indexOf(item) < 0; }).slice(0, 6 - picked.length));
    if (!picked.length) return;
    var grid = related.querySelector('.related-grid');
    picked.forEach(function (item) { grid.appendChild(card(item)); });
    related.hidden = false;
  }).catch(function () {});
})();

  // Merged HK weather + Hang Seng row. A failed side is omitted; both failing leaves the row hidden.
  (function () {
    var box = document.getElementById('hk-info');
    if (!box) return;
    function formatIndex(value) {
      var negative = value < -0.004;
      var parts = Math.abs(value).toFixed(2).split('.');
      var grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (negative ? '-' : '') + grouped + '.' + parts[1];
    }
    function formatSigned(value) {
      var body = formatIndex(value);
      return value > 0.004 ? '+' + body : body;
    }
    function paint(hk, hsi, ticks) {
      var weatherBits = [];
      if (hk && typeof hk.temperature === 'number') weatherBits.push(hk.temperature + '°C');
      if (hk && hk.aqhi && isFinite(hk.aqhi.value)) weatherBits.push('AQHI ' + Math.floor(hk.aqhi.value));
      var weather = weatherBits.join(' · ');
      var quote = '';
      var direction = '';
      if (hsi && typeof hsi.price === 'number' && typeof hsi.changePercent === 'number') {
        quote = '恒生 ' + formatIndex(hsi.price) + '  ' + formatSigned(hsi.changePercent) + '%';
        direction = hsi.change > 0.005 ? 'up' : hsi.change < -0.005 ? 'down' : 'flat';
      }
      box.textContent = '';
      if (!weather && !quote && !(ticks && ticks.length)) return;
      if (weather) {
        var wx = document.createElement('a');
        wx.className = 'hk-info-wx';
        wx.href = 'https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm';
        wx.target = '_blank';
        wx.rel = 'noopener noreferrer';
        wx.textContent = weather;
        box.appendChild(wx);
      }
      if (weather && quote) {
        var sep = document.createElement('span');
        sep.className = 'hk-info-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '|';
        box.appendChild(sep);
      }
      if (quote) {
        var link = document.createElement('a');
        link.className = 'hk-info-hsi hsi-' + direction;
        link.href = 'https://finance.yahoo.com/quote/%5EHSI/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = quote;
        box.appendChild(link);
      }
      (ticks || []).forEach(function (tick) {
        if (!tick || !tick.text || !tick.href) return;
        if (box.childNodes.length) {
          var gap = document.createElement('span');
          gap.className = 'hk-info-sep';
          gap.setAttribute('aria-hidden', 'true');
          gap.textContent = '|';
          box.appendChild(gap);
        }
        var item = document.createElement('a');
        item.className = 'hk-info-tick hsi-' + (tick.direction || 'flat');
        item.href = tick.href;
        item.title = tick.title || '';
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.textContent = tick.text;
        box.appendChild(item);
      });
      if (box.childNodes.length) box.hidden = false;
    }
    Promise.all([
      fetch('/api/hk').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/hsi').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/markets').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (pair) { paint(pair[0], pair[1], pair[2] && pair[2].ticks); });
  })();

  (function () {
    var DISMISS = 'wn-major-dismiss';
    function track(id) {
      if (!/^[0-9a-f]{6,16}$/.test(id)) return;
      var body = JSON.stringify({ id: id });
      try {
        if (navigator.sendBeacon && navigator.sendBeacon('/api/reads', new Blob([body], { type: 'application/json' }))) return;
      } catch (e) {}
      fetch('/api/reads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    }
    document.addEventListener('click', function (event) {
      var node = event.target && event.target.closest ? event.target.closest('a') : null;
      if (!node) return;
      var host = node.closest('[data-story-id]');
      var id = host ? host.getAttribute('data-story-id') : '';
      if (id) track(id);
    });
    var majorSlot = document.getElementById('major-slot');
    if (majorSlot && !document.querySelector('.major-banner')) {
      fetch('/api/major').then(function (r) { return r.ok ? r.json() : null; }).then(function (json) {
        var banner = json && json.banner;
        if (!banner || !banner.id || !banner.href) return;
        try { if (localStorage.getItem(DISMISS) === banner.id) return; } catch (e) {}
        var box = document.createElement('section');
        box.className = 'major-banner';
        box.setAttribute('data-major-id', banner.id);
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', '重大更新');
        var kicker = document.createElement('span');
        kicker.className = 'major-kicker';
        kicker.textContent = '重大更新';
        var link = document.createElement('a');
        link.href = banner.href;
        link.textContent = banner.title || '';
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'major-dismiss';
        close.setAttribute('aria-label', '關閉');
        close.textContent = '×';
        close.addEventListener('click', function () {
          try { localStorage.setItem(DISMISS, banner.id); } catch (e) {}
          box.remove();
        });
        box.appendChild(kicker);
        box.appendChild(link);
        box.appendChild(close);
        majorSlot.appendChild(box);
      }).catch(function () {});
    }
    var alertSlot = document.getElementById('alert-slot');
    if (alertSlot) {
      fetch('/api/alerts').then(function (r) { return r.ok ? r.json() : null; }).then(function (json) {
        var alerts = json && json.alerts;
        if (!alerts || !alerts.length) return;
        var row = document.createElement('section');
        row.className = 'alert-row';
        row.setAttribute('aria-label', '天氣及交通警告');
        alerts.forEach(function (alert) {
          if (!alert || !alert.name || !alert.href) return;
          var pill = document.createElement('a');
          pill.className = 'alert-pill';
          pill.href = alert.href;
          pill.target = '_blank';
          pill.rel = 'noopener noreferrer';
          pill.textContent = alert.name;
          row.appendChild(pill);
        });
        if (row.childNodes.length) alertSlot.appendChild(row);
      }).catch(function () {});
    }
  })();
