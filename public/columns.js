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

  // HK weather strip on column pages (same /api/hk as the homepage).
  (function () {
    var box = document.getElementById('hk-weather');
    if (!box) return;
    fetch('/api/hk').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || data.temperature == null) return;
      var icon = data.icon ? '<img src="https://www.hko.gov.hk/images/HKOWxIconOutline/pic' + data.icon + '.png" width="28" height="28" alt="" />' : '';
      var aq = data.aqhi ? '<span class="hk-aqhi aqhi-' + (data.aqhi.value <= 3 ? 'low' : data.aqhi.value <= 6 ? 'mid' : 'high') + '">AQHI ' + data.aqhi.value + ' ' + (data.aqhi.risk || '') + '</span>' : '';
      var warn = (data.warnings && data.warnings.length)
        ? '<span class="hk-warnings">' + data.warnings.map(function (w) { return '<span class="hk-warning">' + w.name + '</span>'; }).join('') + '</span>'
        : '<span class="hk-meta">現時無天氣警告</span>';
      box.innerHTML = '<a class="hk-now" href="https://www.hko.gov.hk/tc/index.html" target="_blank" rel="noopener noreferrer">' + icon + '<span class="hk-temp">' + data.temperature + '°C</span><span class="hk-meta">濕度 ' + data.humidity + '%</span></a>' + aq + warn + '<span class="hk-credit">天文台 · 環保署</span>';
      box.hidden = false;
    }).catch(function () {});
  })();
