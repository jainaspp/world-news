(function () {
  var KEY = 'wn_bookmarks_v2';
  var list = document.getElementById('saved-list');
  var empty = document.getElementById('saved-empty');
  if (!list) return;
  var labels = { briefing: '導讀', explainer: '懶人包', story: '頭條', topic: '專題', headline: '頭條' };
  var items = [];
  try {
    var parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(parsed)) items = parsed;
  } catch (e) {}
  items = items.filter(function (item) { return item && item.title && item.link; });
  if (!items.length) {
    if (empty) empty.hidden = false;
    return;
  }
  items.forEach(function (item) {
    var article = document.createElement('article');
    article.className = 'story';
    var body = document.createElement('div');
    body.className = 'story-body';
    var kicker = document.createElement('div');
    kicker.className = 'story-kicker';
    var tag = document.createElement('span');
    tag.className = 'kicker-region';
    tag.textContent = labels[item.page] || (String(item.link).indexOf('/') === 0 ? '文章' : '頭條');
    kicker.appendChild(tag);
    if (item.source) {
      var source = document.createElement('span');
      source.className = 'source-tag';
      source.textContent = item.source;
      kicker.appendChild(source);
    }
    var title = document.createElement('h2');
    title.className = 'story-title';
    var link = document.createElement('a');
    link.href = item.link;
    link.textContent = item.title;
    if (/^https?:/i.test(item.link)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    title.appendChild(link);
    body.appendChild(kicker);
    body.appendChild(title);
    article.appendChild(body);
    list.appendChild(article);
  });
})();