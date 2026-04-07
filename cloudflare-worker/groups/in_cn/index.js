/**
 * Worker: IndiaChina (3 feeds) -> Supabase
 * Cron: */5 * * * *  (every 5 min)
 */
const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const FEEDS = [
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/international/rss/', region: 'IND', lang: 'en' },
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rss.cms', region: 'IND', lang: 'en' },
    { name: 'SCMP', url: 'https://www.scmp.com/rss/91/feed', region: 'CHN', lang: 'en' }
];

function sid(t, l) {
    const s = (t+'|'+l).replace(/\s+/g,' ').trim();
    let h = 0;
    for (let i=0; i<s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}

function dh(html) {
    if (!html) return '';
    return String(html)
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
        .replace(/&#(\d+);/g, (_,c) => String.fromCharCode(+c))
        .replace(/<[^>]+>/g,'').trim();
}

function parseRSS(xml) {
    const items = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const gt = (blk, tag) => {
        const m = blk.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
        return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
    };
    let mx;
    while ((mx = itemRe.exec(xml)) !== null && items.length < 15) {
        const blk = mx[1];
        const lp = gt(blk, 'link'), up = lp.match(/[?&]url=([^&]+)/);
        const link = up ? decodeURIComponent(up[1]) : lp;
        const title = gt(blk, 'title');
        if (!title || !link) continue;
        const imgM = blk.match(/<media:content[^>]+url=["']([^"']+)["']/i)
                  || blk.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
                  || blk.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
        const pd = gt(blk, 'pubDate') || new Date().toISOString();
        items.push({ title, summary: gt(blk, 'description'), link, source: gt(blk, 'source') || '', pubDate: pd, imageUrl: imgM ? imgM[1] : '' });
    }
    return items;
}

async function fetchOneFeed(feed) {
    try {
        const r = await fetch(feed.url, { headers: {'User-Agent': 'Mozilla/5.0'}, timeout: 10000 });
        if (!r.ok) return { feed, items: [], error: 'HTTP ' + r.status };
        const xml = await r.text();
        return { feed, items: parseRSS(xml), error: null };
    } catch(e) { return { feed, items: [], error: e.message }; }
}

async function getExistingLinks() {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    const r = await fetch(
        SB_URL + '/rest/v1/news?select=link&pub_date=gt.' + new Date(cutoff).toISOString() + '&limit=1000',
        { headers: {'apikey': SB_SVC_KEY, 'Authorization': 'Bearer ' + SB_SVC_KEY} }
    );
    if (!r.ok) return new Set();
    const d = await r.json();
    return new Set(Array.isArray(d) ? d.map(x => x.link).filter(Boolean) : []);
}

async function upsertRows(rows) {
    if (!rows.length) return 0;
    const r = await fetch(SB_URL + '/rest/v1/news', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'apikey': SB_SVC_KEY, 'Authorization': 'Bearer ' + SB_SVC_KEY, 'Prefer': 'resolution=merge-duplicates'},
        body: JSON.stringify(rows),
    });
    return r.ok ? rows.length : 0;
}

async function doCrawl(existingLinks) {
    let total = 0, errors = 0;
    // 5 feeds at a time
    for (let i = 0; i < FEEDS.length; i += 5) {
        const batch = FEEDS.slice(i, i + 5);
        const results = await Promise.all(batch.map(f => fetchOneFeed(f)));
        const newRows = [];
        for (const res of results) {
            if (res.error) { console.log('ERR ' + res.feed.name + ': ' + res.error); errors++; continue; }
            for (const item of res.items) {
                if (!item.link || existingLinks.has(item.link) || item.title.length < 10) continue;
                newRows.push({
                    title: item.title.slice(0, 300),
                    summary: (item.summary || '').replace(/<[^>]+>/g,'').slice(0, 1000),
                    link: item.link,
                    source: item.source || res.feed.name,
                    image_url: item.imageUrl || '',
                    pub_date: new Date(item.pubDate).toISOString(),
                    region: res.feed.region,
                    lang: res.feed.lang,
                    fetched_at: new Date().toISOString(),
                });
                existingLinks.add(item.link);
            }
            console.log('OK ' + res.feed.name + ': ' + res.items.length + ' items');
        }
        if (newRows.length) { await upsertRows(newRows); total += newRows.length; }
    }
    return { total, errors };
}

export default {
    async scheduled(controller, env, ctx) {
        const t0 = Date.now();
        console.log('START [in_cn] ' + FEEDS.length + ' feeds');
        const links = await getExistingLinks();
        const result = await doCrawl(links);
        console.log('DONE [in_cn] +' + result.total + ' | ' + result.errors + ' errors | ' + (Date.now()-t0) + 'ms');
    },

    async fetch(request) {
        return new Response(JSON.stringify({ status: 'ok', group: 'in_cn', feeds: FEEDS.length }), {
            headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
        });
    },
};
