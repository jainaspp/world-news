/**
 * Cloudflare Worker — 新聞聚合 API 代理 (v2 — 安全的環境變量版)
 *
 * 🔐 部署前請到 Cloudflare Dashboard → Workers & Pages → 你的 Worker
 *    → Settings → Variables & Secrets 加入：
 *    NEWS_API_KEY      = your_newsdata_io_key
 *    RSS2JSON_API_KEY  = your_rss2json_key
 */

const NEWS_API_KEY  = NEWS_API_KEY_GLOBAL     || 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const RSS2JSON_KEY  = RSS2JSON_API_KEY_GLOBAL || 'nplhxo4vdhcurftvk0fo57iwc2pzljfxxm6bfo9';

const RSS = {
  BBC:'https://feeds.bbci.co.uk/news/world/rss.xml',Reuters:'https://feeds.reuters.com/reuters/worldnews',
  Guardian:'https://www.theguardian.com/world/rss',NPR:'https://feeds.npr.org/1001/rss.xml',
  AlJazeera:'https://www.aljazeera.com/xml/rss/all.xml',CNN:'https://rss.cnn.com/rss/edition_world.rss',
  France24:'https://www.france24.com/en/rss',DW:'https://rss.dw.com/rdf/rss-en-world',
  Bloomberg:'https://feeds.bloomberg.com/world/news.rss',SkyNews:'https://feeds.sky.com/ngs/world/rss.xml',
  SCMP:'https://www.scmp.com/rss/91/feed',LTN:'https://news.ltn.com.tw/rss/world.xml',
  ChannelNewsAsia:'https://www.channelnewsasia.com/rss',YNA:'https://www.yna.co.kr/rss/news.xml',
  NHK:'https://www3.nhk.or.jp/rss/news/cat0.xml',NDTV:'https://feeds.feedburner.com/NDTVNews-World',
  VnExpress:'https://vnexpress.net/rss/the-gioi.rss',VnE:'https://vnexpress.net/rss/the-gioi.rss',
  ST:'https://www.straitstimes.com/news/world/rss.xml',Caixin:'https://www.caixinglobal.com/rss/',
  Meduza:'https://meduza.io/rss/en/index.xml',TASS:'https://tass.ru/rss/v2/news.xml',
  UkrainskaPravda:'https://www.pravda.com.ua/rss/',LIGA:'https://ua.liga.net/rss/news',
  AlArabiya:'https://www.alarabiya.net/.rss/full/2',TRTWorld:'https://www.trtworld.com/rss',
  Anadolu:'https://www.aa.com.tr/rss/world',Euronews:'https://feeds.euronews.com/world',
  NYTimes:'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',CBC:'https://rss.cbc.ca/lineup/world.xml',
  G1:'https://g1.globo.com/rss/g1.rss',TechCrunch:'https://techcrunch.com/feed/',
  ArsTech:'https://feeds.arstechnica.com/arstechnica/index',
};

const RGN = {
  ALL:['BBC','Reuters','Guardian','NPR','AlJazeera','CNN','France24','DW','Bloomberg','SkyNews'],
  ASI:['BBC','AlJazeera','NPR','SCMP','ChannelNewsAsia','NDTV','YNA','NHK'],
  EUR:['BBC','Guardian','Reuters','DW','France24','Euronews'],
  ME:['AlJazeera','AlArabiya','TRTWorld','Anadolu'],
  AFR:['BBC','AlJazeera'],
  AM:['CNN','NPR','Bloomberg','NYTimes','CBC','G1'],
  OCE:['ChannelNewsAsia'],
  EAS:['SCMP','LTN','NHK','YNA','Caixin'],
  SEA:['ChannelNewsAsia','VnExpress','ST','NDTV'],
  TWN:['LTN','SCMP','ChannelNewsAsia'],
  CHN:['Caixin','SCMP','Reuters'],
  USA:['CNN','NPR','Bloomberg','NYTimes'],
};

const TOP = {
  MIL:['BBC','AlJazeera','Reuters','NPR'],POL:['BBC','Guardian','NPR','CNN'],
  ECO:['BBC','Bloomberg','Reuters','DW'],TEC:['BBC','TechCrunch','ArsTech'],
  SCI:['BBC','NPR'],ENV:['BBC','Guardian','NPR','AlJazeera'],
};

function sid(t,l){let h=0;for(let i=0;i<(t+l).length;i++)h=(h*31+(t+l).charCodeAt(i))>>>0;return h;}
function dh(h){return(h||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&#\d+;/g,m=>String.fromCharCode(+m.slice(2,-1))).replace(/<[^>]+>/g,'').trim();}
async function gj(u){try{const r=await fetch(u,{cf:{cacheTtl:300,cacheEverything:true},headers:{'User-Agent':'news-proxy/1.0'}});return r.ok?await r.json():null;}catch{return null;}}
async function gt(u){try{const r=await fetch(u,{cf:{cacheTtl:300,cacheEverything:true}});return r.ok?await r.text():'';}catch{return '';}}

async function fND(c){const d=await gj(`https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&category=${c}&country=us&language=en&size=20`);if(d?.status==='success'&&Array.isArray(d.results))return d.results.map(a=>({id:sid(dh(a.title),dh(a.link||'')),title:dh(a.title||a.headline||''),titleTL:{},summary:dh(a.description||a.content||'').slice(0,500),summaryTL:{},link:a.link||a.url||a.webUrl||'',source:a.source_id||a.source_name||'NewsData',pubDate:a.pubDate||a.publishedAt||new Date().toISOString(),imageUrl:a.image_url||a.thumbnail||a.image||''}));return[];}
async function fRSS(k,u){const d=await gj(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}&api_key=${RSS2JSON_KEY}&count=8`);if(d?.status==='ok'&&Array.isArray(d.items))return d.items.map(it=>({id:sid(dh(it.title),dh(it.link||'')),title:dh(it.title||''),titleTL:{},summary:dh(it.description||'').slice(0,500),summaryTL:{},link:it.link||'',source:k,pubDate:it.pubDate||new Date().toISOString(),imageUrl:it.thumbnail||it.image||it.enclosure?.link||''}));return[];}
async function fGN(){const x=await gt('https://news.google.com/rss/search?q=world&hl=en-US&gl=US&ceid=US:en');if(!x)return[];const is=[];const re=/<item[^>]*>([\s\S]*?)<\/item>/gi;let m;while((m=re.exec(x))!==null&&is.length<20){const b=m[1];const g=t=>{const r=b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,'i'));return r?r[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim():'';};const lp=g('link'),up=lp.match(/[?&]url=([^&]+)/),tl=g('title');if(tl&&(up?decodeURIComponent(up[1]):lp))is.push({id:sid(tl,up?decodeURIComponent(up[1]):lp),title:dh(tl),titleTL:{},summary:dh(g('description')||'').slice(0,500),summaryTL:{},link:up?decodeURIComponent(up[1]):lp,source:'GoogleNews',pubDate:g('pubDate')||new Date().toISOString(),imageUrl:''});}return is;}
async function fHN(){const d=await gj('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15');if(!d||!Array.isArray(d.hits))return[];return d.hits.map(h=>({id:sid(dh(h.title||''),dh(h.url||'')),title:dh(h.title||''),titleTL:{},summary:dh(h.story_text||'').slice(0,500),summaryTL:{},link:h.url||h.story_url||'',source:'HackerNews',pubDate:h.created_at||new Date().toISOString(),imageUrl:''}));}

const ogC={};
async function enrichOg(is){for(const i of is.filter(x=>!x.imageUrl).slice(0,8)){if(ogC[i.link]){i.imageUrl=ogC[i.link];continue;}try{const t=await gt(i.link);const mm=t.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)||t.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);i.imageUrl=ogC[i.link]=mm?dh(mm[1]):'';}catch{i.imageUrl=ogC[i.link]='';}}return is;}

async function coreFetch(group,type){
  const feeds=type==='topic'?(TOP[group]||TOP.MIL):(RGN[group]||RGN.ALL);
  const all=[];const seen=new Set();
  const add=items=>{for(const i of items)if(!seen.has(i.id)){seen.add(i.id);all.push(i);}};
  const cat={ALL:'world',ASI:'world',EUR:'world',ME:'world',AFR:'world',AM:'world',OCE:'world',EAS:'world',SEA:'world',TWN:'world',CHN:'world',USA:'us'};
  const[nd,gn,hn]=await Promise.allSettled([fND(cat[group]||'world'),fGN(),fHN()]);
  if(nd.status==='fulfilled')add(nd.value);
  if(gn.status==='fulfilled')add(gn.value);
  if(hn.status==='fulfilled')add(hn.value);
  for(let i=0;i<feeds.length;i+=6){const s=await Promise.allSettled(feeds.slice(i,i+6).map(k=>RSS[k]?fRSS(k,RSS[k]):Promise.resolve([])));for(const r of s)if(r.status==='fulfilled')add(r.value);}
  await enrichOg(all);
  const cutoff=Date.now()-48*3600*1000;
  return all.filter(i=>{const t=new Date(i.pubDate).getTime();return!isNaN(t)&&t>cutoff;}).sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate)).slice(0,80);
}

export default{async fetch(request){
  const url=new URL(request.url);
  const group=url.searchParams.get('group')||'ALL';
  const type_=url.searchParams.get('type')||'region';
  const cached=await caches.default.match(`https://news-cache${url.pathname}${url.search}`);
  if(cached)return new Response(cached.body,{headers:{'Content-Type':'application/json','Cache-Control':'s-maxage=300'}});
  const data=await coreFetch(group,type_);
  const body=JSON.stringify(data);
  return new Response(body,{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'s-maxage=300'}});
}};
