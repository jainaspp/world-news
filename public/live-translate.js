/* Live translation for the page the reader is already on.
   Traditional Chinese is the default. The choice is wn_lang on this device.
   The script replaces visible text in place. It does not open another site,
   does not call the writing route, and does not post to Telegram. */
(function () {
  var STORE = 'wn_tr_v1';
  var LANGS = [
    { code: 'zh-HK', label: '繁體中文', short: '繁' },
    { code: 'zh-CN', label: '简体中文', short: '简' },
    { code: 'en', label: 'English', short: 'EN' }
  ];
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, TEXTAREA: 1, SVG: 1 };
  var store = {};
  var failedAt = {};
  var inflight = {};
  var pending = [];
  var pendingSeen = {};
  var records = new WeakMap();
  var attrRecords = new WeakMap();
  var flight = false;
  var frame = 0;
  var wrap = null;
  var menuButton = null;
  var menu = null;

  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (saved && typeof saved === 'object') {
      Object.keys(saved).forEach(function (key) {
        if (typeof saved[key] === 'string') store[key] = saved[key];
      });
    }
  } catch (e) {}

  function normalize(raw) {
    if (raw === 'en') return 'en';
    if (raw === 'zh-CN' || raw === 'zh' || raw === 'cn' || raw === '简') return 'zh-CN';
    return 'zh-HK';
  }

  function currentTarget() {
    try {
      var stored = localStorage.getItem('wn_lang');
      if (stored) return normalize(stored);
    } catch (e) {}
    return normalize(document.documentElement.lang);
  }

  function htmlLang(code) {
    return code === 'en' ? 'en' : code;
  }

  function splitEdges(value) {
    var leadMatch = /^\s*/.exec(value || '');
    var lead = leadMatch ? leadMatch[0] : '';
    var rest = (value || '').slice(lead.length);
    var tailMatch = /\s*$/.exec(rest);
    var tail = tailMatch ? tailMatch[0] : '';
    var raw = rest.slice(0, rest.length - tail.length);
    return { lead: lead, tail: tail, core: raw.replace(/\s+/g, ' ').trim() };
  }

  function worth(core) {
    return /[\u3400-\u9fffA-Za-z]{2,}/.test(core) || /[\u3400-\u9fff]/.test(core);
  }

  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.getAttribute && (el.getAttribute('translate') === 'no' || el.hasAttribute('data-no-translate'))) return true;
      if (el.classList && el.classList.contains('lang-wrap')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function lookup(target, core) {
    var key = target + '\n' + core;
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  }

  function cooling(target, core) {
    var at = failedAt[target + '\n' + core] || 0;
    return Date.now() - at < 120000;
  }

  function persist() {
    try {
      var keys = Object.keys(store);
      if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(function (key) { delete store[key]; });
      localStorage.setItem(STORE, JSON.stringify(store));
    } catch (e) {}
  }

  function queue(target, core) {
    if (!worth(core) || lookup(target, core) != null || cooling(target, core)) return;
    var key = target + '\n' + core;
    if (pendingSeen[key] || inflight[key]) return;
    pendingSeen[key] = 1;
    pending.push({ target: target, core: core });
  }

  function rememberRecord(map, node, core) {
    var record = map.get(node);
    if (!record) {
      record = { original: core, applied: null };
      map.set(node, record);
      return record;
    }
    if (record.applied != null && core === record.applied) return record;
    record.original = core;
    record.applied = null;
    return record;
  }

  function paintText(node, target) {
    if (!node || !node.nodeValue || skipped(node)) return;
    var parts = splitEdges(node.nodeValue);
    if (!parts.core || !worth(parts.core)) return;
    var record = rememberRecord(records, node, parts.core);
    var next = lookup(target, record.original);
    if (next == null) {
      queue(target, record.original);
      return;
    }
    if (next === parts.core) return;
    node.nodeValue = parts.lead + next + parts.tail;
    record.applied = next;
  }

  function paintAttr(el, name, target) {
    if (!el || !el.getAttribute || skipped(el)) return;
    var value = el.getAttribute(name);
    if (!value) return;
    var parts = splitEdges(value);
    if (!parts.core || !worth(parts.core)) return;
    var bag = attrRecords.get(el);
    if (!bag) {
      bag = {};
      attrRecords.set(el, bag);
    }
    var slot = bag[name];
    if (!slot) slot = bag[name] = { original: parts.core, applied: null };
    else if (!(slot.applied != null && parts.core === slot.applied)) {
      slot.original = parts.core;
      slot.applied = null;
    }
    var next = lookup(target, slot.original);
    if (next == null) {
      queue(target, slot.original);
      return;
    }
    if (next === parts.core) return;
    el.setAttribute(name, parts.lead + next + parts.tail);
    slot.applied = next;
  }

  function updatePicker(target) {
    if (!menuButton) return;
    var current = LANGS[0];
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === target) current = LANGS[i];
    menuButton.textContent = current.short;
    menuButton.setAttribute('aria-label', 'Language: ' + current.label);
    if (!menu) return;
    var options = menu.querySelectorAll('[data-lang]');
    for (var j = 0; j < options.length; j++) {
      var on = options[j].getAttribute('data-lang') === target;
      options[j].classList.toggle('active', on);
      options[j].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function closeMenu() {
    if (!menu || !menuButton) return;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }

  function apply() {
    var target = currentTarget();
    if (document.documentElement.lang !== htmlLang(target)) document.documentElement.lang = htmlLang(target);
    updatePicker(target);
    if (!document.body) return;
    var title = document.querySelector('title');
    if (title && title.firstChild) paintText(title.firstChild, target);
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (skipped(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) paintText(nodes[i], target);
    var labeled = document.body.querySelectorAll('[placeholder], [aria-label], [title], [alt]');
    for (var n = 0; n < labeled.length; n++) {
      for (var a = 0; a < ATTRS.length; a++) paintAttr(labeled[n], ATTRS[a], target);
    }
    flush();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      apply();
    });
  }

  function flush() {
    if (flight) return;
    var batch = [];
    var rest = [];
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      var key = item.target + '\n' + item.core;
      delete pendingSeen[key];
      if (lookup(item.target, item.core) != null || cooling(item.target, item.core) || inflight[key]) continue;
      if (batch.length >= 24 || (batch.length && batch[0].target !== item.target)) {
        rest.push(item);
        pendingSeen[key] = 1;
        continue;
      }
      batch.push(item);
      inflight[key] = 1;
    }
    pending = rest;
    if (!batch.length) return;
    var asked = batch[0].target;
    var texts = batch.map(function (item) { return item.core; });
    flight = true;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : 0;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: asked, texts: texts }),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error('translate');
      return response.json();
    }).then(function (data) {
      var list = data && data.translations || [];
      var finals = data && data.final || [];
      var wrote = false;
      for (var i = 0; i < texts.length; i++) {
        var key = asked + '\n' + texts[i];
        delete inflight[key];
        if (finals[i] && typeof list[i] === 'string') {
          store[key] = list[i];
          wrote = true;
        } else {
          failedAt[key] = Date.now();
        }
      }
      if (wrote) persist();
    }).catch(function () {
      for (var i = 0; i < texts.length; i++) {
        var key = asked + '\n' + texts[i];
        delete inflight[key];
        failedAt[key] = Date.now();
      }
    }).then(function () {
      if (timer) clearTimeout(timer);
      flight = false;
      apply();
    });
  }

  function installPicker() {
    if (document.getElementById('root') || document.querySelector('.lang-wrap')) return;
    var host = document.querySelector('.header-actions') || document.querySelector('.masthead');
    if (!host) return;
    wrap = document.createElement('div');
    wrap.className = 'lang-wrap';
    wrap.setAttribute('translate', 'no');
    wrap.setAttribute('data-no-translate', '');
    menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'icon-btn';
    menuButton.setAttribute('aria-haspopup', 'listbox');
    menuButton.setAttribute('aria-expanded', 'false');
    menu = document.createElement('ul');
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    var listId = 'wn-lang-menu';
    menu.id = listId;
    menuButton.setAttribute('aria-controls', listId);
    LANGS.forEach(function (lang) {
      var item = document.createElement('li');
      item.setAttribute('role', 'presentation');
      var option = document.createElement('button');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('data-lang', lang.code);
      option.textContent = lang.label;
      option.addEventListener('click', function () {
        try { localStorage.setItem('wn_lang', lang.code); } catch (e) {}
        document.documentElement.lang = htmlLang(lang.code);
        closeMenu();
        apply();
      });
      item.appendChild(option);
      menu.appendChild(item);
    });
    menuButton.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    wrap.appendChild(menuButton);
    wrap.appendChild(menu);
    host.appendChild(wrap);
    document.addEventListener('mousedown', function (event) {
      if (!wrap || menu.hidden) return;
      if (!wrap.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  window.__wnApplyLive = apply;
  installPicker();
  if (document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'aria-label', 'title', 'alt']
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'wn_lang') apply();
  });
})();
