/**
 * Hub-only edge notes for locked doors 04／05／08.
 * Numbering follows the live twelve-door order (and TREE §2.4／§2.5／§2.8):
 * 物質、變化、地表. These are not new leaves and do not open a door.
 */

export interface LearnEdgeNote {
  id: '04' | '05' | '08';
  subjectId: 'phy' | 'chem' | 'geo';
  title: string;
  body: string;
  href: `/learn/${'phy' | 'chem' | 'geo'}/`;
  linkLabel: string;
}

export const LEARN_EDGE_NOTES: readonly LearnEdgeNote[] = [
  {
    id: '04',
    subjectId: 'phy',
    title: '緣卡 04 · 物質',
    body: '物質之門仍是淡門。這一則緣卡只在頁緣標出方位，不另開一葉。可稱的東西先要能被再次指認：同一塊金屬、同一滴水，換了觀察的人，仍可按同一組性質核對。重量、體積與冷熱是入門時常用的三種性質，它們不是物質的全部，卻讓指認不停留在當下的感覺。單位若能跨地複核，便不必重頭約定。運動與力如何寫成下一級，正文尚未種入。沿頁內連結可到物質之門，那裡仍是尚未開啓之路。',
    href: '/learn/phy/',
    linkLabel: '物質之門',
  },
  {
    id: '05',
    subjectId: 'chem',
    title: '緣卡 05 · 變化',
    body: '變化之門在萬有地圖上仍標尚未開啓。頁緣先記一句：事物可以改變形貌，卻不必立刻失去可稱量的身份。冰融成水，形狀改了，仍可盛進同一件容器裡核對多少。混合之後若還能分開，便知道變了的部分與仍在的部分可以同時成立。物理變化與化學變化的邊界，這一則不展開，也不寫操作方法。門仍鎖著，緣卡只把方位說清楚。標籤與警示只說明如何讀，不代替尚未寫入的正文。',
    href: '/learn/chem/',
    linkLabel: '變化之門',
  },
  {
    id: '08',
    subjectId: 'geo',
    title: '緣卡 08 · 地表',
    body: '地表之門同樣尚未開啓。地圖上的符號是一種約定：比例、河流與高低，讓不在場的人仍能指出同一處地。降水如何匯成河，是這扇門日後要寫的能力，不是今日事件，也不是另一條敘事軸上的城市故事。這一則停在符號如何約定，不寫主權，不排座次。等高的直覺與流域的方向，都留待這扇門開啓之後再寫。沿頁內連結可到地表之門，那裡仍只有尚未開啓之路，沒有假正文。',
    href: '/learn/geo/',
    linkLabel: '地表之門',
  },
];
