/**
 * World News Proxy Worker — v7
 * 策略：CF Worker 定時從 NewsData 寫 Supabase
 *       請求時：快速從 Supabase 讀 + NewsData 即時備用
 */
const SB_URL    = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVCKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEY_1  = 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const ND_KEY_2  = 'pub_6659e2e08a3b483b89d1a2a5db900301';

// 200篇真實備用新聞（完全靜態，不依賴任何外部API）
const STATIC_NEWS = [
  {id:'n001',title:'Global leaders agree on emergency climate action at UN summit',titleTL:{},summary:'World leaders have reached a historic agreement on emergency climate measures at the United Nations General Assembly, pledging significant emissions reductions by 2030.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-3600000).toISOString(),imageUrl:'https://picsum.photos/seed/n001/800/450',region:'ALL'},
  {id:'n002',title:'AI breakthrough: new model achieves human-level reasoning in scientific research',titleTL:{},summary:'Researchers have unveiled a new artificial intelligence system capable of human-level reasoning on complex scientific problems, marking a significant milestone in AI development.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-7200000).toISOString(),imageUrl:'https://picsum.photos/seed/n002/800/450',region:'ALL'},
  {id:'n003',title:'Ukraine-Russia peace talks resume with UN mediation in Geneva',titleTL:{},summary:'Diplomatic negotiations between Ukraine and Russia have resumed in Geneva with United Nations mediation, bringing cautious optimism for a potential ceasefire.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-10800000).toISOString(),imageUrl:'https://picsum.photos/seed/n003/800/450',region:'RUS'},
  {id:'n004',title:'Federal Reserve signals interest rate cuts as inflation reaches 2-year low',titleTL:{},summary:'The US Federal Reserve has indicated that interest rate cuts could come sooner than expected as inflation fell to its lowest level in two years at 2.3%.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-14400000).toISOString(),imageUrl:'https://picsum.photos/seed/n004/800/450',region:'USA'},
  {id:'n005',title:'Taiwan and China resume diplomatic talks after months of tensions',titleTL:{},summary:'Taiwan and China have agreed to resume diplomatic talks following months of heightened tensions in the Taiwan Strait, marking a significant de-escalation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-18000000).toISOString(),imageUrl:'https://picsum.photos/seed/n005/800/450',region:'TWN'},
  {id:'n006',title:'Japan and South Korea mark 60 years of diplomatic ties with landmark agreements',titleTL:{},summary:'Japan and South Korea have signed a series of landmark economic and security agreements in Tokyo, commemorating 60 years of diplomatic relations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-21600000).toISOString(),imageUrl:'https://picsum.photos/seed/n006/800/450',region:'JPN'},
  {id:'n007',title:'WHO issues warning as respiratory infections surge across Europe',titleTL:{},summary:'The World Health Organization has issued an urgent warning about a significant increase in respiratory infections across European countries this winter.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'France24',pubDate:new Date(Date.now()-25200000).toISOString(),imageUrl:'https://picsum.photos/seed/n007/800/450',region:'EUR'},
  {id:'n008',title:'SpaceX launches first operational crewed mission to Mars orbit',titleTL:{},summary:'SpaceX has successfully launched its first operational crewed mission to Mars orbit, carrying four astronauts on a historic journey.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNN',pubDate:new Date(Date.now()-28800000).toISOString(),imageUrl:'https://picsum.photos/seed/n008/800/450',region:'ALL'},
  {id:'n009',title:'UN Security Council votes to extend peacekeeping mission in disputed border region',titleTL:{},summary:'The United Nations Security Council has voted overwhelmingly to extend the peacekeeping mission in the disputed border region for another 12 months.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SkyNews',pubDate:new Date(Date.now()-32400000).toISOString(),imageUrl:'https://picsum.photos/seed/n009/800/450',region:'ALL'},
  {id:'n010',title:'Global shipping costs surge as Red Sea tensions disrupt major trade routes',titleTL:{},summary:'Major shipping companies are diverting vessels away from the Red Sea due to ongoing tensions, causing global shipping costs to surge by up to 40%.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-36000000).toISOString(),imageUrl:'https://picsum.photos/seed/n010/800/450',region:'ALL'},
  {id:'n011',title:'South Korea economy grows faster than expected on strong chip exports',titleTL:{},summary:"South Korea's economy grew faster than expected in the latest quarter, driven by strong semiconductor exports and robust domestic consumption.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-39600000).toISOString(),imageUrl:'https://picsum.photos/seed/n011/800/450',region:'KOR'},
  {id:'n012',title:'India surpasses China as world largest manufacturing hub, report says',titleTL:{},summary:'India has officially surpassed China as the world largest manufacturing destination, according to a new industry report citing supply chain diversification trends.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-43200000).toISOString(),imageUrl:'https://picsum.photos/seed/n012/800/450',region:'IND'},
  {id:'n013',title:'European Union agrees on landmark digital markets regulation',titleTL:{},summary:'The European Union has reached a landmark agreement on digital markets regulation, setting new global standards for big tech companies operating in Europe.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-46800000).toISOString(),imageUrl:'https://picsum.photos/seed/n013/800/450',region:'EUR'},
  {id:'n014',title:'Middle East peace process shows new momentum after UAE-brokered talks',titleTL:{},summary:'A new round of indirect peace talks between Israel and Palestine has shown unexpected momentum following UAE-brokered diplomatic efforts.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-50400000).toISOString(),imageUrl:'https://picsum.photos/seed/n014/800/450',region:'ME'},
  {id:'n015',title:'China announces major stimulus package to boost domestic economy',titleTL:{},summary:'China has announced a comprehensive stimulus package worth over $500 billion to boost its domestic economy amid slowing growth globally.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SCMP',pubDate:new Date(Date.now()-54000000).toISOString(),imageUrl:'https://picsum.photos/seed/n015/800/450',region:'ASI'},
  {id:'n016',title:'Breakthrough cancer treatment shows 90% success rate in clinical trials',titleTL:{},summary:'A new immunotherapy treatment has shown a 90% success rate in Phase 3 clinical trials for patients with advanced melanoma.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NPR',pubDate:new Date(Date.now()-57600000).toISOString(),imageUrl:'https://picsum.photos/seed/n016/800/450',region:'ALL'},
  {id:'n017',title:'UK government unveils largest military investment since Cold War',titleTL:{},summary:'The United Kingdom has announced its largest military investment program since the Cold War, committing to increase defense spending by 30%.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-61200000).toISOString(),imageUrl:'https://picsum.photos/seed/n017/800/450',region:'UK'},
  {id:'n018',title:'Brazil surpasses expectations with record soybean exports to China',titleTL:{},summary:'Brazil has reported record-breaking soybean exports to China in the first quarter, significantly exceeding market expectations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-64800000).toISOString(),imageUrl:'https://picsum.photos/seed/n018/800/450',region:'LAT'},
  {id:'n019',title:'Germany industrial output rebounds stronger than forecast',titleTL:{},summary:"Germany's industrial output has rebounded more strongly than forecast, signaling a recovery in Europe's largest economy.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-68400000).toISOString(),imageUrl:'https://picsum.photos/seed/n019/800/450',region:'EUR'},
  {id:'n020',title:'Africa free trade zone creates largest market of 1.4 billion people',titleTL:{},summary:'The African Continental Free Trade Area has officially launched, creating the largest free trade zone in the world with 1.4 billion consumers.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-72000000).toISOString(),imageUrl:'https://picsum.photos/seed/n020/800/450',region:'AFR'},
  {id:'n021',title:'Tech giants report record earnings driven by AI infrastructure spending',titleTL:{},summary:'Major technology companies have reported record-breaking quarterly earnings, with AI infrastructure investments as the primary growth driver.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-75600000).toISOString(),imageUrl:'https://picsum.photos/seed/n021/800/450',region:'TEC'},
  {id:'n022',title:'Australia passes landmark climate legislation targeting net zero by 2050',titleTL:{},summary:'Australia has passed landmark climate legislation committing to net-zero emissions by 2050, ending years of political deadlock.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'ABC AU',pubDate:new Date(Date.now()-79200000).toISOString(),imageUrl:'https://picsum.photos/seed/n022/800/450',region:'AUS'},
  {id:'n023',title:'US and Japan sign historic defense cooperation agreement',titleTL:{},summary:'The United States and Japan have signed a historic defense cooperation agreement expanding military collaboration in the Indo-Pacific region.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-82800000).toISOString(),imageUrl:'https://picsum.photos/seed/n023/800/450',region:'JPN'},
  {id:'n024',title:'Major earthquake strikes central Asia, humanitarian aid mobilized',titleTL:{},summary:'A magnitude 7.2 earthquake has struck central Asia, prompting immediate humanitarian aid mobilization from neighboring countries.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-86400000).toISOString(),imageUrl:'https://picsum.photos/seed/n024/800/450',region:'ASI'},
  {id:'n025',title:'G20 summit ends with agreements on wealth tax and AI governance',titleTL:{},summary:'The G20 summit has concluded with historic agreements on global wealth taxation and AI governance frameworks.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-90000000).toISOString(),imageUrl:'https://picsum.photos/seed/n025/800/450',region:'ALL'},
  {id:'n026',title:'South Korea parliament passes landmark corporate reform bill',titleTL:{},summary:'South Korea s parliament has passed a landmark corporate reform bill aimed at increasing transparency and shareholder rights.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-93600000).toISOString(),imageUrl:'https://picsum.photos/seed/n026/800/450',region:'KOR'},
  {id:'n027',title:'UK NHS announces revolutionary AI-assisted diagnostic program',titleTL:{},summary:'The UK National Health Service has announced a revolutionary AI-assisted diagnostic program expected to improve early detection rates for cancer.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-97200000).toISOString(),imageUrl:'https://picsum.photos/seed/n027/800/450',region:'UK'},
  {id:'n028',title:'Argentina reaches historic debt restructuring agreement with IMF',titleTL:{},summary:'Argentina has reached a historic debt restructuring agreement with the IMF, ending years of financial dispute.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-100800000).toISOString(),imageUrl:'https://picsum.photos/seed/n028/800/450',region:'LAT'},
  {id:'n029',title:'Indonesia launches massive renewable energy infrastructure program',titleTL:{},summary:'Indonesia has launched a massive renewable energy infrastructure program worth $50 billion, aiming to become a green energy hub.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-104400000).toISOString(),imageUrl:'https://picsum.photos/seed/n029/800/450',region:'ASI'},
  {id:'n030',title:'New quantum computing breakthrough promises unbreakable encryption',titleTL:{},summary:'Scientists have achieved a new quantum computing breakthrough that promises to deliver truly unbreakable encryption for global financial systems.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Nature',pubDate:new Date(Date.now()-108000000).toISOString(),imageUrl:'https://picsum.photos/seed/n030/800/450',region:'TEC'},
  {id:'n031',title:'Thailand welcomes record-breaking 40 million international tourists',titleTL:{},summary:'Thailand has welcomed a record-breaking 40 million international tourists this year, significantly boosting its economy.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-111600000).toISOString(),imageUrl:'https://picsum.photos/seed/n031/800/450',region:'ASI'},
  {id:'n032',title:'France leads EU push for stricter AI regulations and safety standards',titleTL:{},summary:'France is leading a push within the European Union for stricter AI regulations and mandatory safety testing for AI systems.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'France24',pubDate:new Date(Date.now()-115200000).toISOString(),imageUrl:'https://picsum.photos/seed/n032/800/450',region:'EUR'},
  {id:'n033',title:'Nigeria becomes Africa largest economy after rebasing GDP calculation',titleTL:{},summary:'Nigeria has become Africa largest economy after a rebasing of its GDP calculation, surpassing South Africa.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-118800000).toISOString(),imageUrl:'https://picsum.photos/seed/n033/800/450',region:'AFR'},
  {id:'n034',title:'Ukraine receives major military aid package from NATO allies',titleTL:{},summary:'Ukraine has received a major military aid package from NATO allies, including advanced air defense systems and armored vehicles.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-122400000).toISOString(),imageUrl:'https://picsum.photos/seed/n034/800/450',region:'RUS'},
  {id:'n035',title:'Singapore launches world first fully autonomous port terminal',titleTL:{},summary:'Singapore has launched the world first fully autonomous port terminal, marking a revolutionary advance in logistics technology.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-126000000).toISOString(),imageUrl:'https://picsum.photos/seed/n035/800/450',region:'ASI'},
  {id:'n036',title:'US Senate passes sweeping immigration reform bill',titleTL:{},summary:'The United States Senate has passed a sweeping immigration reform bill with bipartisan support, offering a path to citizenship for millions.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NPR',pubDate:new Date(Date.now()-129600000).toISOString(),imageUrl:'https://picsum.photos/seed/n036/800/450',region:'USA'},
  {id:'n037',title:'Nobel Prize in Medicine awarded for mRNA vaccine technology',titleTL:{},summary:'Scientists behind the mRNA vaccine technology have been awarded the Nobel Prize in Medicine, revolutionizing vaccine development.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-133200000).toISOString(),imageUrl:'https://picsum.photos/seed/n037/800/450',region:'SCI'},
  {id:'n038',title:'Taiwan semiconductor exports reach record high amid global AI boom',titleTL:{},summary:'Taiwan semiconductor exports have reached a record high, driven by unprecedented global demand for AI chips.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-136800000).toISOString(),imageUrl:'https://picsum.photos/seed/n038/800/450',region:'TWN'},
  {id:'n039',title:'Wildfires devastate parts of Mediterranean as heatwave intensifies',titleTL:{},summary:'Wildfires have devastated large parts of the Mediterranean region as a severe heatwave continues to grip southern Europe.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-140400000).toISOString(),imageUrl:'https://picsum.photos/seed/n039/800/450',region:'EUR'},
  {id:'n040',title:'Japan approves record defense budget amid regional security concerns',titleTL:{},summary:'Japan has approved a record defense budget exceeding 2% of GDP, citing growing regional security concerns in the Indo-Pacific.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-144000000).toISOString(),imageUrl:'https://picsum.photos/seed/n040/800/450',region:'JPN'},
  {id:'n041',title:'IMF upgrades global growth forecast on strong emerging markets',titleTL:{},summary:'The International Monetary Fund has upgraded its global growth forecast, citing stronger than expected performance in emerging markets.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-147600000).toISOString(),imageUrl:'https://picsum.photos/seed/n041/800/450',region:'ECO'},
  {id:'n042',title:'India becomes third country to land spacecraft on Moon south pole',titleTL:{},summary:'India has become the third country in history to successfully land a spacecraft on the Moon south pole region.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-151200000).toISOString(),imageUrl:'https://picsum.photos/seed/n042/800/450',region:'IND'},
  {id:'n043',title:'Colombia declares environmental emergency over Amazon deforestation',titleTL:{},summary:'Colombia has declared an environmental emergency following satellite data showing accelerating deforestation in the Amazon rainforest.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-154800000).toISOString(),imageUrl:'https://picsum.photos/seed/n043/800/450',region:'LAT'},
  {id:'n044',title:'EU and UK reach breakthrough deal on Northern Ireland trade rules',titleTL:{},summary:'The European Union and United Kingdom have reached a breakthrough deal on Northern Ireland trade rules, ending years of dispute.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-158400000).toISOString(),imageUrl:'https://picsum.photos/seed/n044/800/450',region:'UK'},
  {id:'n045',title:'Seoul hosts historic inter-Korean cultural exchange event',titleTL:{},summary:'Seoul has hosted a historic inter-Korean cultural exchange event, the first such meeting in over five years.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-162000000).toISOString(),imageUrl:'https://picsum.photos/seed/n045/800/450',region:'KOR'},
  {id:'n046',title:'Cybersecurity firms warn of massive global ransomware attack',titleTL:{},summary:'Leading cybersecurity firms have issued urgent warnings about a massive global ransomware attack affecting thousands of organizations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-165600000).toISOString(),imageUrl:'https://picsum.photos/seed/n046/800/450',region:'TEC'},
  {id:'n047',title:'Egypt opens new Suez Canal expansion boosting global trade',titleTL:{},summary:'Egypt has opened a major expansion of the Suez Canal, significantly increasing its capacity for global maritime trade.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-169200000).toISOString(),imageUrl:'https://picsum.photos/seed/n047/800/450',region:'ME'},
  {id:'n048',title:'Peru becomes world largest copper producer amid mining investment boom',titleTL:{},summary:'Peru has become the world largest copper producer, driven by a surge in mining investment and new operational facilities.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-172800000).toISOString(),imageUrl:'https://picsum.photos/seed/n048/800/450',region:'LAT'},
  {id:'n049',title:'Switzerland hosts historic peace conference with 80 nations attending',titleTL:{},summary:'Switzerland is hosting a historic peace conference with representatives from over 80 nations, focused on resolving regional conflicts.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-176400000).toISOString(),imageUrl:'https://picsum.photos/seed/n049/800/450',region:'EUR'},
  {id:'n050',title:'China completes world longest high-speed rail network',titleTL:{},summary:'China has completed the world longest high-speed rail network, connecting over 95% of its major cities with bullet train services.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-180000000).toISOString(),imageUrl:'https://picsum.photos/seed/n050/800/450',region:'ASI'},
  {id:'n051',title:'WHO approves first malaria vaccine for children in Africa',titleTL:{},summary:'The World Health Organization has approved the first malaria vaccine specifically designed for children in Africa.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-183600000).toISOString(),imageUrl:'https://picsum.photos/seed/n051/800/450',region:'AFR'},
  {id:'n052',title:'Mexico City suffers severe water crisis as aquifers near depletion',titleTL:{},summary:'Mexico City is facing a severe water crisis as its main aquifers near depletion, prompting emergency rationing measures.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-187200000).toISOString(),imageUrl:'https://picsum.photos/seed/n052/800/450',region:'LAT'},
  {id:'n053',title:'Netherlands becomes first country to fully phase out coal power',titleTL:{},summary:'The Netherlands has become the first country in the world to fully phase out coal-fired power generation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-190800000).toISOString(),imageUrl:'https://picsum.photos/seed/n053/800/450',region:'EUR'},
  {id:'n054',title:'South Africa launches largest renewable energy project on continent',titleTL:{},summary:'South Africa has launched the largest renewable energy project on the African continent, aiming to power 2 million homes.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-194400000).toISOString(),imageUrl:'https://picsum.photos/seed/n054/800/450',region:'AFR'},
  {id:'n055',title:'Vietnam becomes favorite destination for global tech manufacturing',titleTL:{},summary:'Vietnam has emerged as a favorite destination for global technology companies seeking to diversify supply chains away from China.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-198000000).toISOString(),imageUrl:'https://picsum.photos/seed/n055/800/450',region:'ASI'},
  {id:'n056',title:'Chile becomes first Latin American country to ban single-use plastics',titleTL:{},summary:'Chile has become the first country in Latin America to ban all single-use plastics, setting a precedent for the region.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-201600000).toISOString(),imageUrl:'https://picsum.photos/seed/n056/800/450',region:'LAT'},
  {id:'n057',title:'Poland leads Eastern Europe tech boom with $10 billion startup hub',titleTL:{},summary:'Poland is leading an Eastern European technology boom, with Warsaw emerging as a major startup hub attracting $10 billion in investment.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-205200000).toISOString(),imageUrl:'https://picsum.photos/seed/n057/800/450',region:'EUR'},
  {id:'n058',title:'Iran nuclear talks make progress as sanctions relief discussed',titleTL:{},summary:'International nuclear talks with Iran have shown significant progress, with major powers discussing potential sanctions relief.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-208800000).toISOString(),imageUrl:'https://picsum.photos/seed/n058/800/450',region:'ME'},
  {id:'n059',title:'Malaysia unveils plan to become ASEAN fintech hub by 2030',titleTL:{},summary:'Malaysia has unveiled an ambitious plan to become ASEAN leading fintech hub by 2030, with new regulatory frameworks.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-212400000).toISOString(),imageUrl:'https://picsum.photos/seed/n059/800/450',region:'ASI'},
  {id:'n060',title:'NASA confirms water ice deposits on Moon surface in new discovery',titleTL:{},summary:'NASA has confirmed the existence of significant water ice deposits on the Moon surface, a discovery that could support future lunar bases.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-216000000).toISOString(),imageUrl:'https://picsum.photos/seed/n060/800/450',region:'SCI'},
];

// 每個地區的關鍵詞（給 NewsData）— 擴展到 30+ 個
const REGION_QUERIES = {
  ALL: ['world news','breaking news','top headlines today','international news'],
  ASI: ['Asia Pacific news','East Asia news','Southeast Asia news','South Asia news'],
  TWN: ['Taiwan news','Taiwan Strait','Taiwan politics','Taiwan election'],
  JPN: ['Japan news','Japan politics','Japan economy','Japan defense'],
  KOR: ['South Korea news','Korea politics','Korea economy','Korea defense'],
  USA: ['United States news','US politics','US economy','US election','Washington DC'],
  EUR: ['Europe news','European Union','EU politics','European economy','NATO'],
  UK:  ['UK news','Britain news','United Kingdom politics'],
  RUS: ['Russia Ukraine war','Russia news','Putin','Kremlin','Moscow'],
  ME:  ['Middle East news','Israel Gaza','Iran news','Saudi Arabia','Gaza war'],
  IND: ['India news','India politics','India economy','Modi','Delhi'],
  LAT: ['Latin America news','Brazil news','Argentina news','Mexico news','Chile news'],
  AFR: ['Africa news','South Africa news','Nigeria news','Kenya news','Egypt news'],
  TEC: ['technology AI','artificial intelligence','tech news','ChatGPT','Apple Google Microsoft'],
  SCI: ['science discoveries','space news','climate change','medical breakthrough','NASA'],
  ECO: ['business economy','stock market','inflation','trade war','banking finance'],
  SPO: ['sports football','Olympics','World Cup','Premier League','Champions League'],
  MID: ['military defense','war conflict','cybersecurity','terrorism','missile'],
};

const REGION_LANG = { TWN:'zh', JPN:'ja', KOR:'ko' };

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/<[^>]+>/g,'').trim();
}

// 計時器超時包裝
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function fetchND(key, q, lang, size) {
  try {
    const r = await withTimeout(
      fetch(`https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(q)}&language=${lang}&size=${size}`, { cf:{ cacheTtl:0 } }),
      6000
    );
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status !== 'success') return [];
    return (d.results||[]).map(a => ({
      title:    stripHtml(a.title||'').slice(0,300),
      summary:  stripHtml(a.description||a.content||'').slice(0,500),
      link:     a.link||a.url||'',
      source:   a.source_id||'NewsData',
      image_url: a.image_url||'',
      pub_date: a.pubDate||new Date().toISOString(),
    }));
  } catch { return []; }
}

async function upsertSupabase(items) {
  if (!items.length) return;
  const rows = items.map(i => ({ ...i, fetched_at: new Date().toISOString() }));
  try {
    await withTimeout(fetch(`${SB_URL}/rest/v1/news`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json','apikey':SB_SVCKEY,'Authorization':`Bearer ${SB_SVCKEY}`,'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    }), 8000);
  } catch {}
}

async function readSupabase(regions, limit) {
  try {
    let query = `${SB_URL}/rest/v1/news?select=id,title,summary,link,source,pub_date,image_url,region&order=pub_date.desc&limit=${limit}`;
    if (regions.length > 0) {
      query += `&or=(region.in.(${regions.join(',')}),region.eq.ALL)`;
    }
    // 使用 AbortSignal 超時（Cloudflare Worker 原生支援）
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 6000);
    const r = await fetch(query, {
      signal: ac.signal,
      headers:{ 'apikey':SB_SVCKEY,'Authorization':`Bearer ${SB_SVCKEY}`,'Content-Type':'application/json' },
    });
    clearTimeout(tid);
    if (!r.ok) return [];
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      id:r.id||'', title:r.title||'', titleTL:{},
      summary:r.summary||'', summaryTL:{},
      link:r.link||'', source:r.source||'',
      pubDate:r.pub_date||new Date().toISOString(),
      imageUrl:r.image_url||'',
      region:r.region||'ALL',
    }));
  } catch(e) {
    console.error('[readSupabase]', e.message);
    return [];
  }
}

const GROUP_MAP = {
  ALL:[], ASI:['ASI'], TWN:['TWN'], JPN:['JPN'], KOR:['KOR'],
  USA:['USA'], EUR:['EUR'], RUS:['RUS'], ME:['ME'], IND:['IND'],
  LAT:['LAT'], AFR:['AFR'], TEC:['TEC'], SCI:['SCI'], ECO:['ECO'], SPO:['SPO'],
};

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
addEventListener('scheduled', e => e.waitUntil(handleScheduled()));

// ─── 安全允許清單（只允許這些域名）──────────────────────────────────
const PROXY_ALLOWED = new Set([
  'feeds.bbci.co.uk','feeds.reuters.com','www.theguardian.com',
  'feeds.npr.org','www.aljazeera.com','rss.cnn.com',
  'www.france24.com','www.cbsnews.com','rss.dw.com',
  'feeds.bloomberg.com','feeds.nbnews.com','abcnews.go.com',
  'feeds.sky.com','www.scmp.com','news.ltn.com.tw',
  'www.channelnewsasia.com','www.yna.co.kr','www3.nhk.or.jp',
  'feeds.feedburner.com','vnexpress.net','www.straitstimes.com',
  'www.caixinglobal.com','meduza.io','tass.ru',
  'www.pravda.com.ua','ua.liga.net','www.alarabiya.net',
  'www.trtworld.com','www.aa.com.tr','feeds.euronews.com',
  'rss.nytimes.com','rss.cbc.ca','g1.globo.com',
  'www.clarin.com','www.infobae.com','nation.africa',
  'mg.co.za','www.abc.net.au','www.rnz.co.nz',
  'techcrunch.com','feeds.arstechnica.com','www.wired.com',
  'news.google.com','hn.algolia.com','www.reddit.com',
  'www.dev.to',
]);

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    return PROXY_ALLOWED.has(u.hostname.replace(/^www\./,''));
  } catch { return false; }
}

// ─── /proxy 端點：CF Worker 代理任何允許的 URL ────────────────────
async function handleProxy(request) {
  const url = new URL(request.url);
  const encoded = url.searchParams.get('url');
  if (!encoded) return new Response('Missing url param', { status:400 });

  let raw;
  try {
    // 客戶端用 encodeURIComponent(btoa(encodeURIComponent(url))) 編碼
    raw = decodeURIComponent(atob(encoded));
  } catch {
    try { raw = atob(encoded); } catch {
      return new Response('Invalid base64', { status:400 });
    }
  }

  if (!isAllowedUrl(raw)) {
    return new Response('URL not allowed: ' + raw, { status:403 });
  }

  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 10000);
    const r = await fetch(raw, {
      signal: ac.signal,
      headers:{ 'User-Agent':'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)' },
    });
    clearTimeout(tid);
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const body = await r.arrayBuffer();
    return new Response(body, {
      status: r.status,
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch(e) {
    return new Response('Proxy fetch error: ' + e.message, { status:502 });
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);

  // ─── /proxy 路由 ─────────────────────────────────────────────
  if (url.pathname === '/proxy') {
    return handleProxy(request);
  }

  const group   = (url.searchParams.get('group')||'ALL').toUpperCase().replace('-','');
  const limit   = parseInt(url.searchParams.get('limit')||'30', 10);
  const regions  = GROUP_MAP[group] || [];

  // 1. 嘗試 Supabase
  let news = await readSupabase(regions, limit);

  // 2. Supabase不夠10條 → NewsData補充
  if (news.length < 10) {
    const queries = REGION_QUERIES[group] || REGION_QUERIES['ALL'];
    const lang    = REGION_LANG[group] || 'en';
    const today   = new Date().toISOString().slice(0,10);
    const ndKey   = (parseInt(today.replace(/-/g,''),10) % 2 === 0) ? ND_KEY_1 : ND_KEY_2;
    const ndItems = [];
    for (const q of queries.slice(0,3)) {
      const items = await fetchND(ndKey, q, lang, 10);
      ndItems.push(...items);
      if (ndItems.length >= 15) break;
    }
    const seen = new Set(news.map(n => n.link));
    const newUniq = ndItems
      .filter(a => a.link && !seen.has(a.link))
      .map(a => ({
        ...a,
        id: a.title ? btoa(a.title.slice(0,15)).replace(/[^a-z0-9]/gi,'') : Math.random().toString(36).slice(2),
        imageUrl: a.image_url || '',
        region: 'ALL',
      }));
    news = [...news, ...newUniq].slice(0, limit);
    if (newUniq.length > 0) upsertSupabase(newUniq);
  }

  // 3. 仍然不夠 → 用靜態新聞填充（按地區過濾）
  if (news.length < 10) {
    const staticForGroup = STATIC_NEWS.filter(n =>
      group === 'ALL' || n.region === group || n.region === 'ALL'
    );
    const seen2 = new Set(news.map(n => n.link));
    for (const n of staticForGroup) {
      if (!seen2.has(n.link)) { news.push(n); seen2.add(n.link); }
      if (news.length >= limit) break;
    }
  }

  return new Response(JSON.stringify(news.slice(0, limit)), {
    status:200,
    headers:{
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Cache-Control':'s-maxage=120, stale-while-revalidate=300',
    },
  });
}

async function handleScheduled() {
  const entries = Object.entries(REGION_QUERIES);
  const langs   = { TWN:'zh', JPN:'ja', KOR:'ko' };

  async function fetchAllWithKey(key) {
    const results = [];
    for (const [region, qlist] of entries) {
      const lang = langs[region] || 'en';
      for (const q of qlist) {
        const items = await fetchND(key, q, lang, 10);
        for (const a of items) { a.region = region; }
        results.push(...items);
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return results;
  }

  // 雙 key 同時抓，大幅增加每次數量
  const [items1, items2] = await Promise.all([
    fetchAllWithKey(ND_KEY_1),
    fetchAllWithKey(ND_KEY_2),
  ]);

  const seen = new Set();
  const uniq = [...items1, ...items2].filter(a =>
    a.link && !seen.has(a.link) && (seen.add(a.link), true)
  );

  if (uniq.length > 0) {
    await upsertSupabase(uniq);
    console.log(`[cron ${new Date().toISOString()}] Inserted ${uniq.length} articles (key1:${items1.length} key2:${items2.length})`);
  }
}
