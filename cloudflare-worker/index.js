/**
 * World News Proxy Worker — v5 (stable)
 * Uses NewsData.io free tier (no API cost)
 */
const NEWS_API_KEY = 'pub_2cc2f7c9e2694779871ea0d95a5a4689';

const REGION_ND = {
  ALL:[], ASI:['cn','jp','kr','tw','hk','sg'], EAS:['cn','jp','kr','tw','hk'],
  TWN:['tw'], CHN:['cn'], HKG:['hk'], JPN:['jp'], KOR:['kr'],
  IND:['in'], EUR:['gb','de','fr'], UK:['gb'], FRA:['fr'], DEU:['de'],
  RUS:['ru'], UKR:['ua'], ME:['ae','sa'], AFR:['za','ng'],
  AM:['us','ca'], USA:['us'], BRA:['br'], OCE:['au'],
};

const FALLBACK = [
  {
    id:1,title:'World News — Loading...',titleTL:{},summary:'Fetching latest headlines.',
    summaryTL:{},link:'https://world-news.xyz',source:'System',
    pubDate:new Date().toISOString(),imageUrl:'https://picsum.photos/seed/1/800/450',
  },
];

async function fetchND(countries, size) {
  try {
    let url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&category=world&language=en&size=${size||15}`;
    if (countries && countries.length > 0) url += '&country=' + countries.join(',');
    const r = await fetch(url, { cf:{ cacheTtl:300, cacheEverything:true } });
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status === 'success' && Array.isArray(d.results)) {
      return d.results.map(a => ({
        id: a.title ? btoa(a.title.slice(0,30)).replace(/[^a-z0-9]/gi,'') : String(Math.random()),
        title: a.title||'', titleTL:{},
        summary: (a.description||'').slice(0,400), summaryTL:{},
        link: a.link||a.url||'', source: a.source_id||'NewsData',
        pubDate: a.pubDate||new Date().toISOString(),
        imageUrl: a.image_url||a.thumbnail||'',
      }));
    }
  } catch(e) {}
  return [];
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
addEventListener('scheduled', e => e.waitUntil(handleScheduled()));
async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const group = (url.searchParams.get('group')||'ALL').toUpperCase().replace('-','');
    const countries = REGION_ND[group]||REGION_ND['ALL']||[];
    const cutoff = Date.now() - 48*3600*1000;
    let items = await fetchND(countries, 25);
    if (items.length === 0) items = await fetchND([], 25);
    items = items.filter(i => {
      try { return new Date(i.pubDate).getTime() > cutoff; } catch { return false; }
    }).slice(0,60);
    const body = items.length > 0 ? JSON.stringify(items) : JSON.stringify(FALLBACK);
    const status = items.length > 0 ? 200 : 200;
    return new Response(body, {
      status,
      headers:{
        'Content-Type':'application/json',
        'Access-Control-Allow-Origin':'*',
        'Cache-Control':'s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch(e) {
    return new Response(JSON.stringify(FALLBACK), {
      status:200, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
    });
  }
}
async function handleScheduled() {
  await fetchND([], 25); // pre-warm
}
