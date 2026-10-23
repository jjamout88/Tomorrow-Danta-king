/* 내꿈은 단타왕 - 무한 콤보 모드 (정적 웹게임). 전역에 아무것도 안 남기게 IIFE로 감싸요 */
(() => {
'use strict';
const START_CASH = 1000000;
const $ = (s) => document.querySelector(s);
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const pct = (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%';
const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : 'dim');
const shortT = (t) => t.replace(/\(.*?\)/g, '').trim();
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tick = (p) => { const t = p < 2000 ? 1 : p < 5000 ? 5 : p < 20000 ? 10 : p < 50000 ? 50 : p < 200000 ? 100 : p < 500000 ? 500 : 1000; return Math.round(p / t) * t; };

let DATA = null, S = null;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 리딩방 찌라시 (게임 속 가상) ---------- */
const CHAT_TPL = [
  '형님들 내일 {n} 갑니다 🚀🚀',
  '[VIP 리딩] {n} 오늘 종가 매수, 내일 익절 각입니다',
  '세력 매집 끝났다는 정보 입수. {n} 풀매수 ㄱㄱ',
  '{n} 차트 이쁘게 나왔습니다. 내일 슈팅 예상 📈',
  '회원님들 {n} 모르면 손해입니다. 마지막 기회!!',
  '{n} 내부자 정보랍니다. 쉿 🤫',
  '오늘 무료 종목 공개합니다 → {n}',
  '{n} 목표가 따블. 믿고 가시죠 형님들',
  '아직 {n} 안 담으신 분? 내일 후회합니다',
  '단타 고수 픽: {n} 🔥 시간 없습니다'];
const CHAT_WHO = ['주식고수K', '여의도불개미', '상한가제조기', '리딩왕김부장', '세력형님'];

/* ---------- 실제 시장 이벤트 (확실한 것만) ---------- */
// [시작, 끝, 문구, 최소 겹치는 날짜 수]. 하루짜리 사건은 그 날짜가 플레이 기간(매수·매도일)에 실제로 있어야 나와요.
const EVENTS = [
  ['2020-02-24', '2020-03-19', '사실 당신은 2020년 코로나19 폭락장을 지나왔습니다! 코스피가 3월 19일 1,457까지 떨어졌던 때예요', 3],
  ['2020-03-20', '2020-12-30', '사실 당신은 2020년 동학개미운동 시기를 지나왔습니다! 개인 투자자들이 주식을 대거 사들이던 때예요', 10],
  ['2021-01-07', '2021-01-07', '사실 당신은 코스피가 사상 처음 종가 3,000을 넘은 2021년 1월 7일을 지나왔습니다!', 1],
  ['2021-07-06', '2021-07-06', '사실 당신은 코스피가 당시 사상 최고치(3,305)를 찍은 2021년 7월 6일을 지나왔습니다!', 1],
  ['2022-02-24', '2022-02-24', '사실 당신은 러시아가 우크라이나를 침공한 2022년 2월 24일을 지나왔습니다!', 1],
  ['2022-01-03', '2022-12-29', '사실 당신은 2022년 미국 금리 인상 하락장을 지나왔습니다! 코스피가 9월 말 2,155까지 밀렸던 해예요', 10],
  ['2023-03-10', '2023-03-13', '사실 당신은 2023년 3월 미국 실리콘밸리은행(SVB) 파산 사태를 지나왔습니다!', 1],
  ['2023-02-01', '2023-07-31', '사실 당신은 2023년 에코프로·2차전지 열풍 한복판을 지나왔습니다!', 10],
  ['2023-11-06', '2023-11-06', '사실 당신은 공매도 전면 금지가 시작된 2023년 11월 6일을 지나왔습니다!', 1],
  ['2024-01-22', '2024-02-29', '사실 당신은 2024년 초 저PBR·기업 밸류업 랠리를 지나왔습니다!', 10],
  ['2024-08-05', '2024-08-05', '사실 당신은 2024년 8월 5일 블랙먼데이(코스피 하루 -8.77%)를 지나왔습니다!', 1],
  ['2024-12-04', '2024-12-04', '사실 당신은 2024년 12월 3일 밤 비상계엄 사태 직후의 장을 지나왔습니다!', 1],
  ['2025-03-31', '2025-03-31', '사실 당신은 공매도가 전면 재개된 2025년 3월 31일을 지나왔습니다!', 1],
  ['2025-04-07', '2025-04-07', '사실 당신은 2025년 4월 트럼프 상호관세 쇼크(4월 7일 코스피 하루 -5.57%)를 지나왔습니다!', 1],
  ['2025-06-20', '2025-06-20', '사실 당신은 코스피가 3년 반 만에 3,000을 되찾은 2025년 6월 20일을 지나왔습니다!', 1]];


async function loadData() {
  try {
    if ('DecompressionStream' in window) {
      const r = await fetch('data.json.gz');
      if (r.ok) return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text());
    }
  } catch (e) { console.warn('gzip 로드 실패, data.json으로 대체', e); }
  const r = await fetch('data.json');
  return r.json();
}


/* 결과·리딩방 픽은 필요할 때만 풀어요 (간단한 난독화) */
function decode(b64, seed) {
  const b = atob(b64);
  let x = (seed + 1) * 2654435761 + 0x5DA17A; x = x % 4294967296;
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0;
    out[i] = b.charCodeAt(i) ^ (x & 0xff);
  }
  return JSON.parse(new TextDecoder().decode(out));
}


/* ---------- 도트 그림 ---------- */
const ANT = [
  '....k......k....', '.....k....k.....', '......kkkk......', '.....kkkkkk.....',
  '....kkwkkwkk....', '....kkkkkkkk....', '.....kkMMkk.....', '......kkkk......',
  '...A..kkkk..A...', '....AkkkkkkA....', '......kkkk......', '.....kkkkkk.....',
  '....kkkkkkkk....', '.....kkkkkk.....', '....k..kk..k....', '...k...kk...k...'];
function drawAnt(mood) {
  const c = $('#ant'); if (!c) return;
  const g = c.getContext('2d'); g.clearRect(0, 0, 16, 16);
  antOn(g, 0, 0, mood);
}
/* mood: happy / normal / meh / sad / dark / broke */
function antOn(g0, ox, oy, mood) {
  const g = { set fillStyle(v) { g0.fillStyle = v; }, fillRect: (x, y, w, h) => g0.fillRect(ox + x, oy + y, w, h) };
  const K = mood === 'dark' ? '#1a1018' : '#2b1a12';
  ANT.forEach((row, y) => [...row].forEach((ch, x) => {
    let col = null;
    if (ch === 'k') col = K; else if (ch === 'w') col = '#fff';
    else if (ch === 'M') col = mood === 'happy' ? '#ff4d4d' : (mood === 'sad' || mood === 'broke') ? '#4d8dff' : K;
    else if (ch === 'A') col = mood === 'happy' ? null : K;
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }));
  if (mood === 'happy') { g.fillStyle = K; [[2, 6], [2, 7], [13, 6], [13, 7], [3, 8], [12, 8]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); g.fillStyle = '#ffd23f'; g.fillRect(1, 5, 1, 1); g.fillRect(14, 5, 1, 1); }
  if (mood === 'sad' || mood === 'broke') { g.fillStyle = '#4d8dff'; g.fillRect(6, 5, 1, 2); g.fillRect(9, 5, 1, 2); }
  if (mood === 'broke') { g.fillStyle = '#c0c0c0'; g.fillRect(12, 10, 3, 4); g.fillStyle = '#888'; g.fillRect(12, 10, 3, 1); }
  if (mood === 'meh') { g.fillStyle = '#6b6b8a'; g.fillRect(6, 4, 4, 1); }
  if (mood === 'sad' || mood === 'dark') { g.fillStyle = '#4d8dff'; g.fillRect(5, 6, 1, 1); }
  if (mood === 'dark') { // 먹구름 + 비
    g.fillStyle = '#55556e'; g.fillRect(4, -3, 8, 2); g.fillRect(5, -4, 5, 1);
    g.fillStyle = '#4d8dff'; [[5, 0], [8, 1], [11, 0]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  }
}
function drawScene(c, tier, mood) {
  const W = 64, H = 36; c.width = W; c.height = H;
  const g = c.getContext('2d'); const R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (tier === 4) { // 한강뷰
    R('#1e2a5a', 0, 0, W, H); R('#0f1840', 4, 3, 56, 22);
    [[8, 5], [20, 7], [33, 4], [47, 6], [55, 9], [27, 10]].forEach(([x, y]) => R('#ffd23f', x, y, 1, 1));
    R('#2f6fd6', 4, 17, 56, 8); R('#5fa0ff', 8, 19, 10, 1); R('#5fa0ff', 34, 21, 12, 1);
    R('#c8c8d8', 4, 14, 56, 1); for (let x = 6; x < 60; x += 9) R('#c8c8d8', x, 14, 1, 4);
    R('#ff9a3c', 50, 4, 3, 3); R('#f4f1de', 4, 25, 56, 1); R('#8a5a3a', 0, 30, W, 6); R('#b07a50', 0, 30, W, 1);
    R('#ffd23f', 3, 26, 3, 4); R('#30305c', 46, 24, 14, 6); R('#ffd23f', 52, 22, 2, 2);
  } else if (tier === 3) { // 오피스텔
    R('#3a4470', 0, 0, W, H); R('#151a3a', 6, 3, 52, 20);
    [[8, 10, 6, 13], [16, 6, 7, 17], [25, 12, 5, 11], [32, 8, 8, 15], [42, 11, 6, 12], [50, 7, 7, 16]].forEach(([x, y, w, h]) => {
      R('#262e5a', x, y, w, h); for (let yy = y + 2; yy < y + h; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if ((xx + yy) % 3) R('#ffd23f', xx, yy, 1, 1);
    });
    R('#c8c8d8', 6, 23, 52, 1); R('#5a4a6a', 0, 30, W, 6); R('#30305c', 46, 24, 12, 6);
  } else if (tier === 2) { // 원룸
    R('#c9b48a', 0, 0, W, H); R('#a8946a', 0, 0, W, 2); R('#87c5ff', 40, 5, 16, 11); R('#f4f1de', 47, 5, 1, 11); R('#f4f1de', 40, 10, 16, 1);
    R('#ffffff', 44, 7, 3, 1); R('#7a5a3a', 0, 30, W, 6); R('#d24d4d', 42, 24, 20, 6); R('#f4f1de', 42, 23, 6, 3);
    R('#6b4a2a', 3, 18, 10, 12); R('#4d8dff', 5, 20, 6, 3);
  } else if (tier === 1) { // 반지하
    R('#4a4a52', 0, 0, W, H); R('#3a3a42', 0, 0, W, 3); R('#8aa0b8', 20, 2, 24, 7);
    for (let x = 22; x < 44; x += 4) R('#2a2a30', x, 2, 1, 7);
    R('#2b1a12', 27, 6, 2, 3); R('#2b1a12', 33, 5, 2, 4); R('#1b1b2f', 26, 8, 4, 1); R('#1b1b2f', 32, 8, 4, 1);
    R('#3a5a3a', 52, 4, 6, 6); R('#56565e', 0, 30, W, 6); R('#6a6a72', 44, 25, 18, 5);
  } else { // 라면 생활
    R('#2a2a33', 0, 0, W, H); R('#3a3a44', 6, 4, 10, 8); R('#555', 0, 30, W, 6); R('#8a6a3a', 40, 26, 20, 4);
    [[44, 18], [50, 20], [56, 17]].forEach(([x, y]) => R('#666677', x, y, 4, 6));
  }
  antOn(g, 24, 15, tier === 0 ? 'broke' : mood);
  if (tier === 0) { // 라면 냄비 + 김
    R('#d97a1e', 34, 25, 7, 4); R('#ffd23f', 35, 25, 5, 1); R('#9a5212', 34, 28, 7, 1);
    R('#dcdcdc', 36, 21, 1, 2); R('#dcdcdc', 38, 19, 1, 3);
  }
}
function drawChart(canvas, closes, big) {
  const W = big ? 120 : 60, H = big ? 50 : 22; canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const mn = Math.min(...closes), mx = Math.max(...closes), rg = mx - mn || 1;
  const n = closes.length, bw = Math.max(1, Math.floor(W / n));
  g.fillStyle = '#2a2a50'; for (let y = 0; y < H; y += big ? 10 : 5) g.fillRect(0, y, W, 1);
  const Y = (v) => Math.round((H - 2) - ((v - mn) / rg) * (H - 3));
  closes.forEach((v, i) => {
    const prev = i ? closes[i - 1] : v, y1 = Y(v), y0 = Y(prev);
    g.fillStyle = v >= prev ? '#ff4d4d' : '#4d8dff';
    g.fillRect(i * bw, Math.min(y0, y1), bw - (bw > 2 ? 1 : 0), Math.max(1, Math.abs(y1 - y0) + 1));
  });
}
function sparkle() {
  const fx = $('#fx');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div'); s.className = 'spark';
    s.style.left = 30 + Math.random() * 40 + '%'; s.style.top = 20 + Math.random() * 20 + '%';
    s.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px'); s.style.setProperty('--dy', (Math.random() * 240 - 120) + 'px');
    fx.appendChild(s); setTimeout(() => s.remove(), 1300);
  }
}
function shake() { const a = $('#app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); setTimeout(() => a.classList.remove('shake'), 1100); }

/* ---------- 모달 ---------- */
function modal(html) {
  closeModal();
  const m = document.createElement('div'); m.id = 'modal';
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  $('#app').appendChild(m); return m;
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }

/* ---------- 집 단계 (현금 기준) ---------- */
const HOMES = [
  { min: -Infinity, name: '라면 생활', desc: '리딩방에 다 털렸어요' },
  { min: 600000, name: '반지하', desc: '창문 밖으로 발만 보여요' },
  { min: 950000, name: '원룸', desc: '작지만 내 방' },
  { min: 1500000, name: '오피스텔', desc: '야경이 보이기 시작' },
  { min: 3000000, name: '한강뷰 아파트', desc: '한강이 내 정원' }];
const homeTier = (cash) => { let t = 0; HOMES.forEach((h, i) => { if (cash >= h.min) t = i; }); return t; };

const RUMOR_TPL = [
  '[찌라시] {n}, 내일 대형 공시 나온다는 소문',
  '[찌라시] {n}에 세력 들어왔다는 얘기가 돌아요',
  '[찌라시] {n} 대주주가 몰래 판다는 소문이…',
  '[찌라시] {n} 대기업이랑 계약 임박이라던데?',
  '[찌라시] {n} 실적 쇼크 난다는 말이 돌아요',
  '[찌라시] 단톡방에서 {n} 난리 났대요',
  '[찌라시] {n} 유상증자 한다는 소문이 있어요',
  '[찌라시] 큰손이 {n} 쓸어 담는 중이라는데'];
const RUMOR_GOOD = [true, true, false, true, false, true, false, true]; // 문구마다 호재/악재. 방향이 맞으면 [진짜]


/* ---------- 🧪 국장은 과학 (억지 연결고리 뉴스, 게임 속 가상) ----------
   실제 국장 해프닝(태풍 노루→노루페인트, 영풍→영풍제지, 손오공, 깐부치킨, 초전도체, 사외이사 동문 테마 등)에서 영감.
   [뉴스, 오르면 '과학적 설명', 떨어지면 '과학 실패' 한마디]. {n}=종목명 {a}=앞 두 글자 {c}=첫 글자 {t}=테마 */
const SCI_TPL = [
  ['기상청, 다음 태풍 이름은 \'{a}\'… {n} 들썩?', '태풍 이름 = 회사 이름 앞글자. 비 오면 오른다. 이게 과학이다', '태풍이 비껴갔대요. 이름만 같고 진로는 달랐다'],
  ['{n}, 이름이 오늘 터진 대형 호재 회사랑 한 글자 빼고 똑같다', '이름이 비슷하면 같은 회사다. 개미의 눈은 정확하다', '다른 회사였다… 공시 한 번만 읽었어도'],
  ['해외 FDA 승인 기업 이름이 \'{a}텍\'… {n}이랑 철자 하나 차이', '철자 하나쯤이야. 시장은 대충 읽는다', '미국 회사였어요. 스펠링 확인은 필수'],
  ['인기 만화 주인공 이름이 \'{a}\'… 작가 신작 발표에 {n} 소환', '주인공 이름 = 회사 이름. 만화 신작 = 실적 개선', '만화는 만화일 뿐… 현실은 냉정했다'],
  ['재계 총수들 회동 장소가 \'{a}\' 근처 식당이래요 → {n} 수혜?', '회장님 밥 먹은 곳 근처 회사는 무조건 간다', '회장님이 메뉴를 바꿨대요'],
  ['젠슨 황(?)이 \'{c}\'로 시작하는 음식 좋아한다는 썰 → {n}', 'AI 대장이 좋아하는 글자로 시작하는 회사 = AI 수혜주', '알고 보니 그 썰은 합성이었다'],
  ['유력 대선주자 A씨, {n} 사외이사랑 대학 동문이라는데?', '동문 = 같은 편 = 정책 수혜. 국장의 삼단논법', 'A씨가 그 사외이사 얼굴도 모른대요'],
  ['{n} 회장 본관이 유력 정치인 B씨랑 같다는 분석', '같은 본관 = 한 가족 = 테마주. 족보가 곧 차트', '본관만 같고 촌수는 30촌 이상이었다'],
  ['{n} 전 사외이사, 옛날에 정치인 캠프에 있었대요', '전직, 옛날, 캠프… 세 단어면 상한가 충분', '캠프 명단에 그런 사람 없었대요'],
  ['국무총리 후보 C씨가 10년 전 {n} 공장 견학했다는 사진 발견', '한 번 와 봤으면 평생 관련주', '사진 속 공장은 옆 회사였다'],
  ['정치인 D씨 지역구에 {n} 공장이 있다는 소식', '지역구 = 내 구역 = 내 회사. 지리도 과학이다', '공장 이사 간 지 5년 됐대요'],
  ['{n}, 상온 초전도체 연구소에 10년 전 소액 투자했다는 얘기', '초전도체 + 지분 0.몇 % = 시총 따블. 물리학 만세', '논문이 또 반박당했다. 저항은 0이 아니었다'],
  ['\'{t}\' 꿈의 신소재 논문 아카이브에 올라와… {n} 관련주로 묶여', '논문이 나오면 일단 산다. 검증은 나중에', '재현 실험 실패. 꿈의 물질은 꿈이었다'],
  ['{n}, 20년 전 국책 과제에 이름 한 줄 올렸던 이력 재조명', '이력 한 줄 = 기술력 무한대', '그 과제 결과 보고서가 공개됐다…'],
  ['동해에 석유 매장 가능성! {n}, 이름에 기름 냄새 난다는 개미들', '석유 회사 같은 이름이면 석유가 나온다', '시추 결과 발표 전에 차익실현 폭탄'],
  ['국민 \'돈쭐\' 캠페인 시작? {n} 미담 커뮤니티에 확산', '착한 기업은 오른다. 감동이 곧 수급', '감동은 3일, 공매도는 영원'],
  ['수돗물에서 벌레 나왔대요… 이름에 \'{c}\' 들어가서 {n} 매수?', '벌레 → 구충제 → 비슷한 글자 회사. 완벽한 연결', '벌레는 잡혔고 주가도 잡혔다'],
  ['해외 댐이 위험하다는 뉴스 → 홍수 → 비료 → 왠지 {n}', '물 → 흙 → 비료 → {t}. 나비효과 매매', '댐은 멀쩡했다'],
  ['오늘 서울 날씨 맑음 ☀️ 회사 이름 \'{a}\'랑 기운이 맞는다는 역술인', '사주가 맞으면 주가도 맞는다. 명리학 트레이딩', '역술인이 날짜를 착각했대요'],
  ['서울시 새 사업 이름이 \'{a}-넷\'?! 회사 {n}이랑 이름 겹쳐', '사업명이 회사명이면 그 회사가 하는 거다', '사업명이었어요. 회사랑은 남남'],
  ['{n}, 아이돌 신곡 가사에 회사 이름 비슷한 단어 나옴', '가사에 나오면 팬덤이 산다. K-팝은 과학', '가사 다시 들어보니 다른 단어였다'],
  ['미국 대선 후보 이름 한자 풀이가 {n}이랑 뜻이 같다고?', '한자 뜻이 같으면 해외 호재도 내 것', '번역기가 잘못 풀었대요'],
  ['오늘이 {n} 창립 기념일 근처라는 소식', '생일엔 선물이 온다. 주가도 선물이다', '생일 파티는 회사만 했다'],
  ['유명 유튜버가 영상 배경에 {n} 로고 비슷한 게 보였대요', '0.5초 노출 = 광고 효과 = 실적 서프라이즈', '로고가 아니라 벽지 무늬였다'],
  ['{n} 대표 사돈의 팔촌이 장관 후보자랑 동창이라는 찌라시', '사돈의 팔촌의 동창. 거리 멀수록 신비롭게 오른다', '장관 후보 낙마. 팔촌도 같이 낙마'],
  ['신임 장관 이름에 \'{c}\' 자가 들어간다 → {n} 들썩', '장관 이름 한 글자 = 정책 수혜. 한글은 과학적이다', '장관님 성씨가 달랐다'],
  ['{n}, 대기업 \'{a}그룹\'이랑 이름만 비슷한데 계열사냐는 문의 폭주', '이름 비슷 = 계열사 = 대기업 수혜', '회사 측 "저희 거기랑 아무 관계 없습니다"'],
  ['신작 게임 보스 이름이 \'{a}\'… {n} 게이머 매수세?', '보스를 잡으면 주가도 잡힌다(위로)', '보스가 너무 셌다'],
  ['이번 주 로또 1등 번호가 {n} 종목코드랑 두 개 겹쳐', '로또 번호 = 종목코드. 확률은 과학이다', '나머지 네 개가 안 맞았다'],
  ['외계 신호 포착(?) 뉴스에 이름이 우주 느낌 나는 {n} 관련주로', '우주 느낌 + 신호 = 우주항공 테마 합류', '외계 신호가 전자레인지였대요'],
  ['반도체 행사장 기념품이 {n} 제품 닮았다는 인증샷', '닮으면 공급한다. 공급하면 오른다', '중국산 기념품이었다'],
  ['고양이 밈 대유행… {n} 이름에서 \'냥\' 소리 난다는 주장', '밈 = 수급. 귀여우면 상한가', '밈은 하루 만에 식었다'],
  ['{n} 공장 근처 맛집이 방송 탔대요', '맛집 손님 → 공장 구경 → 주주 유입. 먹방 경제학', '맛집만 대박 났다'],
  ['전염병 뉴스에 \'{t}\' 관련주 다 묶였는데 {n}도 끼었어요', '마스크 한 장 안 만들어도 테마는 테마', '알고 보니 마스크 근처도 안 감'],
  ['노벨상 수상자 연구 분야가 \'{t}\'래요 → {n} 수혜?', '노벨상 = 기술 검증 완료 = 우리 회사 이야기', '수상자가 "그 회사 처음 듣는다"고'],
  ['대형 스포츠 경기 시구자가 {n} 지역 출신이라는데', '시구 = 상징 = 지역 기업 랠리', '공이 포수 미트에 못 갔다'],
  ['{n}, 회사 이름 거꾸로 읽으면 대박 단어 된다는 발견', '거꾸로 읽어도 호재. 회문의 과학', '거꾸로 읽으니 \'손절\'이 나왔다'],
  ['해외 동명 기업이 대형 백신 계약! 이름이 {n}이랑 같다', '이름 같으면 계약도 같이. 글로벌 과학', '그 회사는 미국 회사. 우리 {n}은 그냥 {n}'],
  ['오늘 아침 무지개 떴대요 🌈 {n} 로고 색이랑 같다', '무지개 = 길조 = 빨간 양봉', '무지개 끝엔 파란 음봉이 있었다'],
  ['{n} 대표가 출근길에 웃었다는 목격담', '대표 미소 = 내부 호재. 관상은 과학이다', '그냥 커피가 맛있었대요'],
  ['국회 청문회에서 \'{t}\' 단어가 3번 나왔어요 → {n}', '3번 언급 = 정책 확정. 셋은 과학', '네 번째엔 규제라고 말했다'],
  ['우리 동네 맘카페에서 {n} 이야기가 나왔대요', '맘카페 = 진짜 바닥 민심 = 바닥 신호', '맘카페 글은 그 회사 직원이 썼다'],
  ['{n}, 종목토론방 \'가즈아\' 글이 하루 만에 3배', '가즈아 3배 = 주가 3배 아님? 비례의 법칙', '가즈아는 갔다… 아래로'],
  ['새로 발견된 소행성 이름이 \'{a}\'… {n} 우주 테마 편입?', '하늘의 이름이 땅의 주가를 올린다', '소행성이 너무 멀었다']];
const fillSci = (t, s) => { const nm = s[0], th = (s[1] || []).map((x) => shortT(DATA.themes[x])); const v = { n: nm, a: [...nm].slice(0, 2).join(''), c: [...nm][0], t: th[0] || '신사업' };
  return esc(t).replace(/\{(n|a|c|t)\}/g, (_, k) => esc(v[k])); };
const sciNews = (sc, s) => fillSci(SCI_TPL[sc[1] % SCI_TPL.length][0], s);

/* ---------- 상태 ---------- */
// 데이터 v6: day = [나스닥, 종목풀, 비밀(풀 결과·날짜), 보통 구성, 잭팟 구성, 쉬운 구성(오름 4·내림 2)]. 구성 = [풀 번호 6개, 뉴스, 찌라시, 비밀(리딩방 픽·헛소문 표시)]
const LEAD_MAX = 3, LEAD_COSTS = [0.10, 0.15, 0.20], VSALT = 100003, JPV = 8, JP_P = 0.05, JP_FROM = 3, EASY0 = 10, EASY_TURNS = 3; // 잭팟: 4턴째부터 5%. 첫 3턴은 쉬운 구성
const leadCost = () => LEAD_COSTS[Math.min(S.lead, LEAD_COSTS.length - 1)];
const SAVE_KEY = 'dantaking_inf_run_v6';
const vIndex = (i) => (Math.imul(S.seed ^ (i * 40503), 2654435761) >>> 0) % DATA.days[i][3].length; // 판마다 다른 구성
const easyList = (i) => DATA.days[i][5] || [];
const eIndex = (i) => (Math.imul(S.seed ^ (i * 69069 + 7), 2246822519) >>> 0) % easyList(i).length;
const vNo = (i) => (i !== S.i ? vIndex(i) : S.jp ? JPV : (S.easy && easyList(i).length) ? EASY0 + eIndex(i) : vIndex(i));
const variant = (i) => { const n = vNo(i); return n === JPV ? DATA.days[i][4] : n >= EASY0 ? easyList(i)[n - EASY0] : DATA.days[i][3][n]; };
const vSecret = (i) => decode(variant(i)[3], VSALT + i * 16 + vNo(i));
function reveal(i) {
  const sec = decode(DATA.days[i][2], i), v = variant(i), vs = vSecret(i);
  return { ...sec, r: v[0].map((j) => sec.r[j]), f: vs.f };
}
const revealHint = (i) => vSecret(i).h;
const LS = { combo: 'dantaking_inf_best_combo', final: 'dantaking_inf_best_final', nick: 'dantaking_nick' };
const bestOf = (k) => Number(localStorage.getItem(LS[k]) || 0);
const idx = () => S.i;
// 화면용 하루: [나스닥, 뉴스, 6종목, -, -, 찌라시]
const day = () => { const d = DATA.days[S.i], v = variant(S.i); return [d[0], v[1], v[0].map((j) => d[1][j]), null, null, v[2], v[4] || 0]; };
/* 새로고침해도 같은 턴/결과로 돌아와요 */
function save() { try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 실패해도 게임은 계속 */ } }
function clearSave() { localStorage.removeItem(SAVE_KEY); }
function loadSave() { try { const x = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return x && x.v === 6 && x.i < DATA.days.length ? x : null; } catch (e) { return null; } }
const themeText = (s) => [...new Set(s[1].map((t) => shortT(DATA.themes[t])))].map(esc).join(' · ');

function hud() {
  $('#hud').classList.toggle('hidden', !S || S.over);
  if (!S) return;
  $('#hud-turn').textContent = `🔥 ${S.combo}콤보`;
  $('#hud-cash').textContent = won(S.cash);
}
let RID = 0; // 화면이 바뀌면 늦게 도착한 연출은 버려요
function render(html) { RID++; closeModal(); $('#fx').innerHTML = ''; $('#app').classList.remove('shake'); $('#screen').innerHTML = html; window.scrollTo(0, 0); hud(); }

function titleScreen() {
  S = null;
  render(`
  <h1>내꿈은 단타왕</h1>
  <p class="sub">무한 콤보 모드 · 실제 한국 주식 데이터</p>
  <canvas id="ant" width="16" height="16" class="bounce"></canvas>
  <div class="box bests">
    <div class="kv"><span>내 최고 콤보</span><span class="gold">${bestOf('combo')}콤보</span></div>
    <div class="kv"><span>내 최고 최종 금액</span><span class="gold">${bestOf('final') ? won(bestOf('final')) : '없음'}</span></div>
  </div>
  <button class="btn" id="start" ${DATA ? '' : 'disabled'}>${DATA ? '게임 시작' : '데이터 불러오는 중...'}</button>
  <button class="btn ghost" id="rank">🏆 랭킹 보기</button>
  <div class="box rules">
    <h2>규칙</h2>
    <ul>
      <li>2020년 이후 <b>랜덤한 실제 거래일</b>에서 시작해요. 턴 제한 없음!</li>
      <li>매일 6종목 중 1개를 골라 전 재산(시작 100만 원)으로 오늘 종가에 사요</li>
      <li>내일 종가가 <b class="up">오르면 콤보 +1</b>, 돈도 그만큼 불어나요. <b class="down">떨어지거나 보합(0%)이면 바로 게임오버</b></li>
      <li>오늘의 뉴스엔 헛소문과 찌라시가 섞여 있어요. 가끔 뜨는 <b>🧪 국장은 과학</b> 뉴스는… 믿거나 말거나</li>
      <li>리딩방은 돈을 내고 들어가요 (현금의 10% → 15% → 20%, 한 판에 최대 3번). 꽤 잘 맞히지만 쪽박 찰 수도 있어요</li>
      <li>최고 콤보와 최종 금액으로 랭킹에 도전해요. 날짜는 끝나면 공개!</li>
    </ul>
  </div>`);
  drawAnt('normal');
  $('#start').onclick = startGame;
  $('#rank').onclick = () => rankScreen('combo');
  const sv = DATA && loadSave();
  if (sv && (!sv.over || !sv.submitted)) { $('#start').textContent = sv.over ? '지난 판 결과 보기 ▶' : '이어하기 ▶'; $('#start').insertAdjacentHTML('afterend', '<button class="btn ghost" id="newrun">새 게임</button>'); $('#start').onclick = () => resume(sv); $('#newrun').onclick = () => { clearSave(); startGame(); }; }
}

function resume(sv) {
  S = sv;
  if (S.over && S.phase === 'end') return endScreen();
  if (S.phase === 'result' && S.R) return resultScreen(S.R);
  if (S.pick !== null && S.pick !== undefined) return settle(S.pick);
  turnScreen(true);
}
function startGame() {
  const n = DATA.days.length;
  S = { v: 6, seed: (Math.random() * 2 ** 31) | 0, phase: 'turn', pick: null, R: null, submitted: false, i: Math.floor(Math.random() * Math.max(1, n - 30)), combo: 0, cash: START_CASH, peak: START_CASH, hist: [], over: false, clear: false,
        jp: false, easy: false, jpWin: 0, milestones: [], lead: 0, leadSpend: 0, leadHit: 0, ups: 0, lead_on: false, rumorFollow: 0, rumorHit: 0 };
  turnScreen();
}

function turnScreen(resumed) {
  if (!resumed) { // 잭팟 턴은 고르기 전엔 비밀. 굴린 결과는 저장해서 새로고침으로 다시 못 굴려요
    S.jp = S.hist.length >= JP_FROM && !!DATA.days[S.i][4] && Math.random() < JP_P;
    S.easy = S.hist.length < EASY_TURNS; // 첫 3턴: 6종목 중 4개가 오르는 구성 (저장돼서 새로고침해도 그대로)
    S.lead_on = false; S.pick = null; S.R = null; S.phase = 'turn';
  }
  save();
  const d = day();
  const tier = homeTier(S.cash);
  const mood = S.combo >= 10 ? 'happy' : S.combo >= 3 ? 'happy' : 'normal';
  const rumor = d[5];
  render(`
  <div class="box status">
    <canvas id="scene" class="scene"></canvas>
    <div class="st-txt">
      <div class="home">🏠 ${HOMES[tier].name}</div>
      <div class="dim st-desc">${HOMES[tier].desc}</div>
      <div class="st-mood">최고 금액 ${won(S.peak)}</div>
      ${S.combo >= 3 ? `<span class="combo">🔥${S.combo}연승</span>` : `<span class="dim" style="font-size:12px">${S.combo}콤보 · 3연승부터 불붙어요</span>`}
    </div>
  </div>
  <div class="box nasdaq"><span>어젯밤 나스닥</span><span class="${cls(d[0])}">${pct(d[0])}</span></div>
  <div class="box news"><h2 style="margin-top:0">오늘의 뉴스</h2><ul>${d[1].map((n) => `<li>${esc(n)}</li>`).join('')}
    ${rumor ? `<li class="rumor" data-i="${rumor[0]}">${esc(RUMOR_TPL[rumor[1] % RUMOR_TPL.length]).replace('{n}', `<b>${esc(d[2][rumor[0]][0])}</b>`)}</li>` : ''}
    ${d[6] ? `<li class="sci" data-i="${d[6][0]}"><span class="sci-tag">🧪 국장은 과학</span> ${sciNews(d[6], d[2][d[6][0]])}</li>` : ''}</ul></div>
  <div class="box chat" id="chat"></div>
  <h2>오늘의 6종목 <span class="dim" style="font-size:12px">하나 골라요. 내일 오르면 생존!</span></h2>
  <div class="cards">${d[2].map((s, i) => `
    <div class="card" data-i="${i}">
      <div class="nm">${esc(s[0])}</div>
      <div class="tg">${themeText(s)}</div>
      <canvas class="chart" data-c="${i}"></canvas>
      <div class="px"><span class="${cls(s[4])}">${pct(s[4])}</span><span>${won(s[3])}</span></div>
    </div>`).join('')}</div>`);
  document.querySelectorAll('canvas.chart').forEach((c) => drawChart(c, d[2][Number(c.dataset.c)][5]));
  document.querySelectorAll('.card').forEach((e) => e.onclick = () => detail(Number(e.dataset.i)));
  const r = $('.rumor'); if (r) r.onclick = () => detail(Number(r.dataset.i));
  const sc = $('.news li.sci'); if (sc) sc.onclick = () => detail(Number(sc.dataset.i));
  drawScene($('#scene'), tier, mood);
  leadBox();
}

/* ---------- 리딩방 (유료, 현금의 10%) ---------- */
function leadBox() {
  const el = $('#chat'), d = day();
  if (!S.lead_on && S.lead >= LEAD_MAX) {
    el.innerHTML = `<div class="chat-head"><span>🚀 수익보장 리딩방</span><span class="dim">게임 속 가상</span></div>
      <button class="btn tipbtn" id="buylead" disabled>🚫 리딩방 강퇴당함 <small>남은 횟수 0/${LEAD_MAX}</small><small class="warn">"회원님은 너무 많이 따라오셨어요. 다른 방 알아보세요"</small></button>
      <div class="chat-foot dim">이번 판은 이제 혼자 힘으로 가야 해요</div>`;
    return;
  }
  if (!S.lead_on) {
    el.innerHTML = `<div class="chat-head"><span>🚀 수익보장 리딩방</span><span class="dim">게임 속 가상</span></div>
      <button class="btn tipbtn" id="buylead">리딩방 입장 <small>현금의 ${Math.round(leadCost() * 100)}% · -${won(S.cash * leadCost())} · 남은 횟수 ${LEAD_MAX - S.lead}/${LEAD_MAX}</small><small class="warn">⚠️ 쪽박 찰 수도 있음</small></button>
      <div class="chat-foot dim">돈 내면 오늘의 픽을 찍어 준대요. 들어갈수록 입장료가 올라요</div>`;
    $('#buylead').onclick = (e) => {
      e.stopPropagation();
      if (S.lead >= LEAD_MAX || S.lead_on) return;
      const c = Math.round(S.cash * leadCost());
      S.cash -= c; S.leadSpend += c; S.lead++; S.lead_on = true;
      save(); hud(); leadBox();
    };
    return;
  }
  const h = revealHint(idx()), who = CHAT_WHO[(idx() + h[1]) % CHAT_WHO.length];
  el.innerHTML = `<div class="chat-head"><span>🚀 수익보장 리딩방</span><span class="dim">입장 완료</span></div>
    <div class="chat-msg" data-i="${h[0]}"><div class="chat-ava">${esc(who[0])}</div>
      <div><div class="chat-who">${esc(who)}</div>
      <div class="bubble">${esc(CHAT_TPL[h[1] % CHAT_TPL.length]).replace('{n}', `<b>${esc(d[2][h[0]][0])}</b>`)}</div></div></div>
    <div class="chat-foot dim">누르면 종목을 볼 수 있어요</div>`;
  el.querySelector('.chat-msg').onclick = () => detail(h[0]);
}

function detail(i) {
  const s = day()[2][i];
  const m = modal(`
    <div class="kv"><b class="big-nm">${esc(s[0])}</b><span class="${cls(s[4])}">오늘 ${pct(s[4])}</span></div>
    <div class="tg">${themeText(s) || '테마 없음'}</div>
    <p class="summary">${esc(DATA.sums[s[2]] || '회사 소개 없음')}</p>
    <canvas class="chart big" id="bigchart"></canvas>
    <div class="kv dim"><span>최근 20일</span><span>오늘 종가 ${won(s[3])}</span></div>
    <div class="row"><button class="btn ghost" id="mclose">닫기</button><button class="btn" id="mpick">이걸로 간다!</button></div>`);
  drawChart(m.querySelector('#bigchart'), s[5], true);
  $('#mclose').onclick = closeModal;
  $('#mpick').onclick = () => { closeModal(); S.pick = i; save(); settle(i); }; // 결과 보기 전에 픽을 먼저 저장
}

function settle(k) {
  const d = day(), sec = reveal(idx()), ret = sec.r[k], s = d[2][k];
  const pre = S.cash, survived = ret > 0;
  const after = pre * (1 + ret / 100);
  const rumor = d[5], hint = S.lead_on ? revealHint(idx()) : null;
  if (survived && S.jp) S.jpWin++;
  if (survived) { S.combo++; S.cash = after; S.peak = Math.max(S.peak, after); if (ret >= 29) S.ups++; }
  else { S.cash = after; S.over = true; }
  const milestone = survived && [5, 10, 20].includes(S.combo) ? S.combo : 0;
  const isLast = survived && S.i + 1 >= DATA.days.length;
  if (isLast) { S.clear = true; S.over = true; }
  if (hint && sec.r[hint[0]] > 0) S.leadHit++;
  if (rumor && k === rumor[0]) { S.rumorFollow++; if (ret > 0) S.rumorHit++; }
  const scn = d[6]; if (scn && k === scn[0]) { S.sciFollow = (S.sciFollow || 0) + 1; if (ret > 0) S.sciHit = (S.sciHit || 0) + 1; }
  S.hist.push({ sec, name: s[0], ret, nas: d[0], cash: S.cash });
  const R = { k, s, sec, ret, pre, after, survived, rumor, sci: scn || 0, hint, jp: S.jp, milestone, leadFail: !!(hint && hint[0] === k && !survived), isLast };
  S.phase = 'result'; S.R = R; S.pick = null; save();
  resultScreen(R);
}

function labels(rets) {
  const L = rets.map((r) => (r >= 29 ? '상한가' : r <= -29 ? '하한가' : ''));
  const mx = rets.indexOf(Math.max(...rets)), mn = rets.indexOf(Math.min(...rets));
  if (!L[mx]) L[mx] = '1등';
  if (!L[mn]) L[mn] = '꼴찌';
  return L;
}

function resultScreen(R) {
  const d = day(), L = labels(R.sec.r);
  const rows = d[2].map((s, i) => ({ s, i, r: R.sec.r[i], l: L[i] })).sort((a, b) => b.r - a.r);
  const mi = rows.findIndex((x) => x.i === R.k); rows.unshift(rows.splice(mi, 1)[0]);
  const tag = (l) => (l ? `<span class="tag ${l === '상한가' || l === '1등' ? 'up' : 'down'}">${l}</span>` : '');
  const mood = !R.survived ? 'broke' : 'happy';
  const pnl = R.after - R.pre;
  render(`
  ${R.survived ? `<div class="combo-punch" id="punch">${S.combo}<small>COMBO</small></div>` : `<div class="gameover-title">게임오버</div>`}
  <canvas id="ant" width="16" height="16" class="${R.survived ? 'bounce' : ''}"></canvas>
  ${R.jp ? `<div class="box jp-banner">${R.survived ? '💰 잭팟!! 6개 중 오르는 건 딱 이것 하나였어요' : '💰 사실 잭팟 턴이었어요. 6개 중 하나만 상한가, 나머지는 전부 하락'}</div>` : ''}
  <div class="box">
    <div class="kv"><span>${esc(R.s[0])}${tag(L[R.k])}</span><span class="dim">${won(R.s[3])} → ${won(tick(R.s[3] * (1 + R.ret / 100)))}</span></div>
    <div class="big slot ${cls(R.ret)}" id="slot-pct">${pct(R.ret)}</div>
    <div class="big2 ${cls(pnl)}" id="slot-pnl">${pnl >= 0 ? '+' : ''}${won(pnl)}</div>
    <div class="kv"><span>현재 현금</span><span class="gold">${won(S.cash)}</span></div>
    ${!R.survived ? `<div class="big down">${R.ret === 0 ? '보합(0%)도 탈락!' : '떨어졌다…'}</div>` : ''}
    ${R.leadFail ? `<div class="big down">🧽 설거지 당했다! 쪽박</div>` : ''}
    ${R.isLast ? `<div class="big gold">🏁 완주! 시장 휴장</div><div class="center dim">더 이상 남은 장이 없어요</div>` : ''}
  </div>
  ${R.milestone ? `<div class="box milestone">🔥 ${R.milestone}콤보 달성! ${MILESTONE_TXT[R.milestone]}</div>` : ''}
  ${R.hint ? (() => { const r = R.sec.r[R.hint[0]], hit = r > 0; return `<div class="box chat">
    <div class="chat-head"><span>🚀 리딩방 결과</span><span class="tag ${hit ? 'up' : 'down'}">${hit ? '적중 🎯' : '설거지 🧽'}</span></div>
    <div class="kv"><span>${esc(d[2][R.hint[0]][0])}${R.k === R.hint[0] ? ' <span class="dim">(따라 삼)</span>' : ''}</span><span class="${cls(r)}">${pct(r)}</span></div></div>`; })() : ''}
  <div class="box news"><h2 style="margin-top:0">뉴스 결과</h2><ul>${d[1].map((n, i) => `<li>${esc(n)} ${R.sec.f[i] ? '<span class="fake">[헛소문]</span>' : '<span class="dim">[진짜]</span>'}</li>`).join('')}
    ${R.rumor ? `<li>${esc(RUMOR_TPL[R.rumor[1] % RUMOR_TPL.length]).replace('{n}', esc(d[2][R.rumor[0]][0]))} <span class="${cls(R.sec.r[R.rumor[0]])}">(${pct(R.sec.r[R.rumor[0]])})</span> ${(R.sec.r[R.rumor[0]] > 0) === RUMOR_GOOD[R.rumor[1] % RUMOR_GOOD.length] ? '<span class="up">[진짜였다]</span>' : '<span class="fake">[헛소문]</span>'}</li>` : ''}</ul></div>
  ${R.sci ? (() => { const sk = R.sci[0], sr = R.sec.r[sk], ok = sr > 0, T3 = SCI_TPL[R.sci[1] % SCI_TPL.length], st = d[2][sk];
    return `<div class="box sci-card ${ok ? 'ok' : 'ng'}">
    <div class="sci-head"><span>${ok ? '🧪 국장은 과학입니다' : '💥 과학 실패'}</span><span class="tag ${ok ? 'up' : 'down'}">믿거나 말거나</span></div>
    <div class="kv"><span>${esc(st[0])}${R.k === sk ? ' <span class="dim">(따라 삼)</span>' : ''}</span><span class="${cls(sr)}">${pct(sr)}</span></div>
    <div class="sci-news dim">"${sciNews(R.sci, st)}"</div>
    <div class="sci-why">${ok ? '🔬 연결고리: ' + fillSci(T3[1], st) : '🧯 ' + fillSci(T3[2], st)}</div></div>`; })() : ''}
  <div class="box res-list"><h2 style="margin-top:0">6종목 결과</h2>
    ${rows.map((x) => `<div class="r ${x.i === R.k ? 'me' : ''}"><span>${x.i === R.k ? '내 픽 · ' : ''}${esc(x.s[0])}${tag(x.l)}</span><span class="${cls(x.r)}">${pct(x.r)}</span></div>`).join('')}
  </div>
  <button class="btn" id="next">${R.isLast ? '최종 결과 보기 🏁' : R.survived ? '다음 날로 🔥' : '결과 보기'}</button>`);
  drawAnt(mood);
  const rid = RID;
  const fxAfter = () => {
    if (rid !== RID) return;
    if (!R.survived) {
      if (R.leadFail) { cinema('jjokbak'); freeze(''); }                    // 리딩방 따라갔다가 설거지
      else if (R.ret <= -10) { cinema(pick(DOWN_CINE)); if (R.ret <= -29) freeze(''); else if (!RM()) shake(); }
      else freeze('꽁꽁 얼었다…');
    }
    else if (R.jp) { cinema('moon', { text: '잭팟!! 투 더 문!' }); jackpot(); }
    else if (R.ret >= 29) cinema(pick(UP_CINE));
    else if (R.milestone) { fireworks(); burst(R.ret); }
    else burst(R.ret);
  };
  slot($('#slot-pct'), R.ret, pct, 800);
  slot($('#slot-pnl'), pnl, (v) => (v >= 0 ? '+' : '') + won(v), 800, fxAfter);
  $('#next').onclick = () => {
    if (S.over) return endScreen();
    S.i++;
    turnScreen();
  };
}

/* ---------- 도트 시네마 연출 (탭하면 넘김) ---------- */
const CW = 90, CH = 195;
const CINE = {
  homerun: { text: '홈~런!', cls: 'up', ms: 2600 },
  seoul: { text: '서울 불바다!', cls: 'up', ms: 2600 },
  moon: { text: '투 더 문! 🚀', cls: 'up', ms: 2800 },
  hangang: { text: '한강 다이빙! (튜브 착용 완료)', cls: 'down', ms: 2800 },
  elevator: { text: '지하 100층 도착…', cls: 'down', ms: 2600 },
  soul: { text: '영혼 탈출…', cls: 'down', ms: 2600 },
  jjokbak: { text: '설거지 당했다! 쪽박 🧽', cls: 'down', ms: 2800 } };
const UP_CINE = ['homerun', 'seoul', 'moon'], DOWN_CINE = ['hangang', 'elevator', 'soul'];
const MILESTONE_TXT = { 5: '슈퍼개미 등극!', 10: '단타 고수 인정!', 20: '전설의 단타왕!!' };
function cinema(kind, opt = {}) {
  const C = CINE[kind], fx = $('#fx');
  const L = document.createElement('div'); L.className = 'cine cine-' + kind; L.dataset.kind = kind;
  L.innerHTML = `<canvas width="${CW}" height="${CH}"></canvas><div class="cine-text ${C.cls}">${esc(opt.text || C.text)}</div><div class="cine-skip">탭해서 넘기기</div>`;
  fx.appendChild(L);
  const g = L.querySelector('canvas').getContext('2d'), txt = L.querySelector('.cine-text');
  const ms = RM() ? 1600 : C.ms; let raf = 0, done = false;
  const end = () => { if (done) return; done = true; cancelAnimationFrame(raf); L.remove(); };
  L.onclick = end; setTimeout(end, ms);
  const t0 = performance.now();
  const frame = (now) => {
    if (done || !L.isConnected) return;
    const t = RM() ? 1 : Math.min(1, (now - t0) / (ms * 0.8));
    g.clearRect(0, 0, CW, CH); SCENES[kind](g, t, now);
    txt.classList.toggle('show', t > (C.cls === 'up' ? 0.35 : 0.55));
    if (!RM()) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return L;
}
const P = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const stars = (g, n, seed) => { for (let i = 0; i < n; i++) P(g, '#fff', (i * 37 + seed) % CW, (i * 53 + seed * 3) % 90); };
const SCENES = {
  homerun(g, t) {
    P(g, '#5fb8ff', 0, 0, CW, CH); P(g, '#ffffff', 10, 20, 14, 3); P(g, '#ffffff', 55, 38, 18, 3);
    P(g, '#2f8f3a', 0, 140, CW, 55); P(g, '#c8a060', 0, 150, CW, 10);
    for (let x = 0; x < CW; x += 6) P(g, '#267a30', x, 140, 3, 55);
    const bx = 22, by = 122; // 타자
    P(g, '#1b1b2f', bx, by, 6, 6); P(g, '#ff4d4d', bx - 1, by - 1, 8, 2);           // 머리+헬멧
    P(g, '#f4f1de', bx, by + 6, 6, 10); P(g, '#1b1b2f', bx, by + 16, 2, 8); P(g, '#1b1b2f', bx + 4, by + 16, 2, 8);
    const swing = t > 0.3;
    if (!swing) { for (let i = 0; i < 12; i++) P(g, '#8a5a2a', bx - 2 - i * 0.3, by + 4 - i, 2, 1); }
    else { for (let i = 0; i < 14; i++) P(g, '#8a5a2a', bx + 6 + i, by + 9 - i * 0.2, 1, 2); }
    if (t < 0.3) { const k = t / 0.3; P(g, '#fff', 90 - k * 58, 128 - k * 4, 3, 3); }
    else { const k = (t - 0.3) / 0.7; const x = 32 + k * 90, y = 124 - k * 160 + k * k * 30;
      for (let i = 1; i < 6; i++) P(g, '#ffd23f', x - i * 4, y + i * 5, 2, 2);
      P(g, '#fff', x, y, 4, 4); if (k < 0.15) { P(g, '#ffd23f', 34, 116, 6, 1); P(g, '#ffd23f', 36, 112, 1, 6); } }
  },
  seoul(g, t, now) {
    P(g, '#1a1030', 0, 0, CW, CH); P(g, '#4a1a20', 0, 90, CW, 60); stars(g, 14, 3);
    P(g, '#2a2440', 52, 92, 30, 20); P(g, '#2a2440', 46, 100, 44, 12);              // 남산
    P(g, '#c8c8d8', 66, 56, 2, 36); P(g, '#c8c8d8', 63, 66, 8, 4); P(g, '#ff4d4d', 66, 54, 2, 2); // N서울타워
    const B = [[2, 120, 10], [13, 110, 9], [23, 125, 8], [32, 104, 11], [44, 118, 9], [54, 112, 10], [65, 122, 8], [74, 108, 12], [86, 126, 4]];
    B.forEach(([x, y, w]) => { P(g, '#151225', x, y, w, 160 - y); for (let yy = y + 3; yy < 158; yy += 5) for (let xx = x + 2; xx < x + w - 1; xx += 3) P(g, '#ffd23f', xx, yy); });
    P(g, '#0b0b1a', 0, 158, CW, 37); P(g, '#2f6fd6', 0, 168, CW, 6); // 한강
    const k = Math.min(1, t * 1.4), tick = Math.floor(now / 90);
    B.forEach(([x, y, w], bi) => { for (let i = 0; i < w; i++) { const h = (4 + ((i * 7 + bi * 13 + tick * 5) % 9)) * k * 2.2;
      P(g, '#ff4d4d', x + i, y - h, 1, h); P(g, '#ff9a3c', x + i, y - h * 0.6, 1, h * 0.6); P(g, '#ffd23f', x + i, y - h * 0.25, 1, h * 0.25); } });
    for (let i = 0; i < 30 * k; i++) P(g, (i % 2) ? '#ff9a3c' : '#ffd23f', (i * 29 + tick * 3) % CW, 100 - ((i * 17 + tick * 4) % 80));
    P(g, 'rgba(255,60,40,0.18)', 0, 0, CW, CH);
  },
  moon(g, t, now) {
    P(g, '#0b0b25', 0, 0, CW, CH); stars(g, 30, 7);
    P(g, '#f4f1de', 64, 10, 16, 16); P(g, '#c8c4a8', 68, 14, 4, 4); P(g, '#c8c4a8', 74, 20, 3, 3); P(g, '#0b0b25', 76, 10, 4, 2);
    P(g, '#3a3a50', 0, 175, CW, 20); P(g, '#55556e', 30, 168, 30, 7);
    const k = Math.max(0, t - 0.15) / 0.85, y = 130 - k * k * 190, x = 40 + k * k * 20;
    P(g, '#e8e8f0', x, y, 10, 22); P(g, '#ff4d4d', x + 2, y - 6, 6, 6); P(g, '#ff4d4d', x + 4, y - 9, 2, 3);
    P(g, '#5fb8ff', x + 3, y + 5, 4, 4); P(g, '#ff4d4d', x - 3, y + 14, 3, 8); P(g, '#ff4d4d', x + 10, y + 14, 3, 8);
    const fl = 6 + (Math.floor(now / 60) % 3) * 3;
    P(g, '#ffd23f', x + 2, y + 22, 6, fl); P(g, '#ff9a3c', x + 3, y + 22 + fl, 4, 4);
    for (let i = 0; i < 18; i++) { const sx = 30 + ((i * 13) % 30), sy = 160 + ((i * 7) % 12) - (t < 0.2 ? 0 : (i % 5)); P(g, '#a8a8b8', sx, sy, 4, 3); }
  },
  hangang(g, t, now) {
    P(g, '#ff9a6a', 0, 0, CW, 70); P(g, '#ffb88a', 0, 70, CW, 40); P(g, '#ffd23f', 60, 40, 12, 12);
    P(g, '#2f6fd6', 0, 120, CW, 75); P(g, '#5fa0ff', 8, 130, 14, 1); P(g, '#5fa0ff', 50, 150, 18, 1);
    P(g, '#8a8aa0', 0, 86, CW, 5); for (let x = 4; x < CW; x += 14) P(g, '#6a6a80', x, 91, 4, 29); P(g, '#b0b0c8', 0, 80, CW, 1); // 다리
    const k = t;
    if (k < 0.55) { const q = k / 0.55, x = 30 + q * 20, y = 64 - Math.sin(q * Math.PI) * 26 + q * q * 62; antOn(g, x, y, 'meh'); }
    else {
      const q = (k - 0.55) / 0.45, sy = 118;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI; P(g, '#e8f4ff', 54 + Math.cos(a) * q * 18, sy - Math.sin(a) * q * 20 + q * q * 18, 2, 2); }
      if (q > 0.35) { const bob = Math.floor(now / 250) % 2; P(g, '#ff9a3c', 47, 120 + bob, 16, 4); P(g, '#ffffff', 50, 120 + bob, 3, 4); P(g, '#ffffff', 57, 120 + bob, 3, 4);
        P(g, '#2b1a12', 50, 113 + bob, 10, 7); P(g, '#fff', 52, 115 + bob, 2, 2); P(g, '#fff', 56, 115 + bob, 2, 2); P(g, '#2b1a12', 51, 110 + bob, 1, 3); P(g, '#2b1a12', 58, 110 + bob, 1, 3); }
    }
  },
  elevator(g, t, now) {
    P(g, '#2a2a33', 0, 0, CW, CH); P(g, '#1b1b22', 20, 0, 50, CH);
    for (let y = 0; y < CH; y += 8) { P(g, '#3a3a44', 18, (y + t * 900) % CH, 2, 4); P(g, '#3a3a44', 70, (y + t * 900) % CH, 2, 4); }
    const fl = Math.min(100, Math.floor(t * t * 115));
    P(g, '#000', 25, 6, 40, 14); g.fillStyle = '#ff4d4d'; g.font = '10px monospace'; g.fillText(`B${fl}`, 30, 17);
    const shakeX = t > 0.85 ? ((Math.floor(now / 40) % 2) ? 1 : -1) : 0;
    const y = t < 0.85 ? 60 + Math.sin(now / 30) * 2 : 60;
    P(g, '#8a8aa0', 26 + shakeX, y, 38, 50); P(g, '#c8c8d8', 28 + shakeX, y + 2, 34, 46); P(g, '#55556e', 44 + shakeX, y + 2, 2, 46);
    antOn(g, 37 + shakeX, y + 26, t > 0.85 ? 'dark' : 'sad');
    if (t < 0.85) for (let i = 0; i < 8; i++) P(g, '#e8e8f0', 22 + ((i * 11) % 46), y - 6 - ((i * 23 + Math.floor(now / 20)) % 40), 1, 6);
    if (t > 0.85) { for (let i = 0; i < 12; i++) P(g, '#a8a8b8', 24 + i * 4, y + 52 + (i % 3), 3, 2); }
    P(g, '#1b1b22', 20, 112, 50, 2);
  },
  jjokbak(g, t, now) { // 리딩방이 설거지하고 나간 자리: 개수대 + 거품 + 쪼개지는 쪽박
    P(g, '#3a4a5a', 0, 0, CW, CH); for (let y = 0; y < 120; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < CW; x += 10) P(g, '#465868', x, y, 9, 9); // 타일
    P(g, '#9aa8b8', 4, 120, 82, 12); P(g, '#6a7888', 10, 132, 70, 40); P(g, '#2a3440', 14, 134, 62, 34);   // 개수대
    P(g, '#c8d0d8', 40, 98, 4, 22); P(g, '#c8d0d8', 40, 98, 16, 4); P(g, '#5fb8ff', 53, 102, 2, 8 + (Math.floor(now / 80) % 3) * 4); // 수도꼭지
    const crack = t > 0.45, bob = Math.sin(now / 160) * 2;
    if (!crack) { P(g, '#c89a4a', 28, 140 + bob, 34, 14); P(g, '#a87a2a', 28, 150 + bob, 34, 4); P(g, '#e8c07a', 31, 141 + bob, 28, 3); }
    else { const k = Math.min(1, (t - 0.45) / 0.3) * 10;
      P(g, '#c89a4a', 28 - k, 141 + k * 0.6, 16, 14); P(g, '#a87a2a', 28 - k, 151 + k * 0.6, 16, 4);
      P(g, '#c89a4a', 46 + k, 141 + k * 0.6, 16, 14); P(g, '#a87a2a', 46 + k, 151 + k * 0.6, 16, 4);
      for (let i = 0; i < 6; i++) P(g, '#2b1a12', 44 + (i % 2), 141 + i * 2, 1, 2); }
    for (let i = 0; i < 16; i++) { const x = 16 + ((i * 23) % 58), y = 130 - ((i * 17 + now / 25) % 70), r = 2 + (i % 3);
      P(g, 'rgba(232,244,255,0.85)', x, y, r, r); P(g, '#ffffff', x, y, 1, 1); }
    P(g, '#ffd23f', 66, 108, 10, 12); P(g, '#ff9a3c', 66, 104, 10, 4); P(g, '#1b1b2f', 68, 112, 6, 1); // 세제
    antOn(g, 8, 100, 'dark');
  },
  soul(g, t, now) {
    P(g, '#1b1b2f', 0, 0, CW, CH); P(g, '#30305c', 0, 150, CW, 45); stars(g, 10, 11);
    P(g, '#2b1a12', 30, 140, 26, 8); P(g, '#2b1a12', 52, 136, 8, 8); P(g, '#fff', 54, 138, 2, 1); P(g, '#fff', 57, 138, 2, 1); // 누운 개미
    P(g, '#2b1a12', 32, 148, 2, 3); P(g, '#2b1a12', 44, 148, 2, 3); P(g, '#2b1a12', 60, 134, 1, 3);
    const k = Math.max(0, t - 0.15) / 0.85, y = 128 - k * 110, x = 46 + Math.sin(now / 200) * 6;
    g.globalAlpha = 0.85;
    P(g, '#e8f4ff', x - 6, y, 12, 12); P(g, '#e8f4ff', x - 7, y + 4, 14, 10);
    for (let i = 0; i < 4; i++) P(g, '#e8f4ff', x - 7 + i * 4, y + 14 + ((i + Math.floor(now / 150)) % 2), 2, 2);
    P(g, '#1b1b2f', x - 3, y + 4, 2, 3); P(g, '#1b1b2f', x + 2, y + 4, 2, 3); P(g, '#1b1b2f', x - 1, y + 9, 3, 1);
    P(g, '#e8f4ff', x - 4, y - 4, 1, 4); P(g, '#e8f4ff', x + 4, y - 4, 1, 4);
    g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) P(g, '#9cc8ff', x - 10 + ((i * 7) % 20), y + 20 + ((i * 9 + Math.floor(now / 80)) % 30));
  } };

/* 잭팟 연출: 금빛 화면 + 코인 비 + 불꽃 */
function jackpot() {
  const p = $('#punch'); if (p) { p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); }
  const L = fxLayer('fx-gold', '<div class="fx-sub">💰 6개 중 단 하나뿐인 상한가 💰</div>', RM() ? 2000 : 3600);
  if (RM()) return;
  shake();
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('div'); c.className = 'coin';
    c.style.left = Math.random() * 100 + '%'; c.style.animationDelay = Math.random() * 1400 + 'ms';
    c.style.animationDuration = 1100 + Math.random() * 900 + 'ms'; L.appendChild(c);
  }
  const cols = ['#ffd23f', '#ff4d4d', '#ffffff', '#ff9a3c'];
  for (let b = 0; b < 8; b++) {
    const cx = 10 + Math.random() * 80, cy = 8 + Math.random() * 50;
    for (let i = 0; i < 20; i++) {
      const s = document.createElement('div'); s.className = 'boom big';
      const a = (i / 20) * Math.PI * 2, r = 60 + Math.random() * 90;
      s.style.left = cx + '%'; s.style.top = cy + '%'; s.style.background = cols[i % 4];
      s.style.setProperty('--dx', Math.round(Math.cos(a) * r / 4) * 4 + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * r / 4) * 4 + 'px');
      s.style.animationDelay = b * 260 + 'ms'; L.appendChild(s);
    }
  }
}
/* 매 턴 터지는 작은 축하 연출 */
function burst(ret) {
  const p = $('#punch'); if (p) { p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); }
  if (RM()) return;
  const L = fxLayer('', '', 1400), cols = ['#ffd23f', '#ff4d4d', '#ffffff', '#ff9a3c'], n = Math.min(40, 14 + Math.round(ret * 2));
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div'); s.className = 'boom';
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 110;
    s.style.left = '50%'; s.style.top = '16%'; s.style.background = cols[i % 4];
    s.style.setProperty('--dx', Math.round(Math.cos(a) * r / 4) * 4 + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * r / 4) * 4 + 'px');
    L.appendChild(s);
  }
}

/* ---------- 칭호 ---------- */
function titles() {
  const c = S.combo, pk = S.peak, fin = S.cash, B = [];
  let main;
  if (S.clear && c >= 20) main = ['데이터 끝까지 간 전설', `${c}콤보로 마지막 장까지! 시장이 먼저 쉬었어요`];
  else if (c >= 20) main = ['전설의 단타왕', `${c}연속 생존! 신의 손`];
  else if (c >= 10) main = ['진짜 단타왕', `${c}콤보, 단타 고수 인정`];
  else if (S.jpWin >= 1 && c >= 5) main = ['잭팟 헌터', '여섯 중 하나뿐인 상한가를 찾아냈어요'];
  else if (fin >= 3000000) main = ['한강뷰 입성자', `최종 ${won(fin)}!`];
  else if (S.ups >= 2) main = ['상한가 사냥꾼', `상한가를 ${S.ups}번이나 잡았어요`];
  else if (S.lead >= 3 && S.leadSpend >= START_CASH * 0.3) main = ['리딩방 VIP 호구', `리딩방에 ${won(S.leadSpend)} 갖다 바쳤어요`];
  else if (c >= 5) main = ['슈퍼개미', `${c}콤보까지 버텼어요`];
  else if (c >= 2) main = ['개미 지옥 생존자', '조금만 더 갔으면…'];
  else if (c === 1) main = ['한 번은 운이었다', '두 번째에서 미끄러졌어요'];
  else main = ['한강 물 온도 체크러', '첫날부터 떨어졌어요'];
  if (c >= 3) B.push(`🔥최대 ${c}연승`);
  if (S.ups) B.push(`🚀상한가 ${S.ups}회`);
  if (S.jpWin) B.push(`💰잭팟 ${S.jpWin}회`);
  if (S.lead) B.push(`📱리딩방 ${S.lead}번 (${won(S.leadSpend)})`);
  if (S.rumorFollow) B.push(`📰찌라시 따라감 ${S.rumorFollow}회`);
  if (S.sciFollow) B.push(`🧪과학 신봉 ${S.sciFollow}회 (적중 ${S.sciHit || 0})`);
  if (pk > START_CASH) B.push(`🏠${HOMES[homeTier(pk)].name} 찍어봄`);
  [5, 10, 20].filter((m) => c >= m).forEach((m) => B.push(`🏅${m}콤보`));
  if (fin > START_CASH) B.push(`💵본전 이상 (${pct((fin / START_CASH - 1) * 100)})`);
  return { main, badges: B };
}

function endScreen() {
  S.over = true;
  const h = S.hist, first = h[0].sec, last = h[h.length - 1].sec;
  const T = titles(), story = periodStory(first, last);
  const fin = Math.max(0, Math.round(S.cash));
  if (!S.bestSaved) { // 새로고침으로 신기록을 두 번 세지 않게
    S.newCombo = S.combo > bestOf('combo'); S.newFinal = fin > bestOf('final');
    if (S.newCombo) localStorage.setItem(LS.combo, String(S.combo));
    if (S.newFinal) localStorage.setItem(LS.final, String(fin));
    S.bestSaved = true;
  }
  S.phase = 'end'; save();
  const newCombo = S.newCombo, newPeak = S.newFinal;
  render(`
  <h1>${S.clear ? '완주! 시장 휴장 🏁' : '게임오버'}</h1>
  <button class="btn again-top" id="again">🔁 한 판 더</button>
  <div class="box">
    <div class="title-main"><div class="dim" style="font-size:12px">당신의 칭호</div><div class="big gold">${T.main[0]}</div><div class="dim">${T.main[1]}</div></div>
    ${T.badges.length ? `<div class="badges">${T.badges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>` : ''}
    <div class="kv"><span>연속 콤보</span><span class="gold">${S.combo}콤보${newCombo ? ' <span class="tag up">신기록</span>' : ''}</span></div>
    <div class="kv"><span>최종 금액</span><span class="gold">${won(fin)}${newPeak ? ' <span class="tag up">신기록</span>' : ''}</span></div>
    <div class="kv dim"><span>플레이 중 최고 금액</span><span>${won(S.peak)}</span></div>
    ${S.lead ? `<div class="kv"><span>리딩방에 쓴 돈</span><span class="down">-${won(S.leadSpend)} (${S.lead}번, 적중 ${S.leadHit})</span></div>` : ''}
    <div class="kv dim"><span>내 최고 기록</span><span>${bestOf('combo')}콤보 · ${won(bestOf('final'))}</span></div>
  </div>
  <div class="box rankbox" id="rankbox">
    <h2 style="margin-top:0">🏆 랭킹 등록</h2>
    <div class="row"><input id="nick" class="nick" maxlength="12" placeholder="닉네임 (1~12자)" autocomplete="off"><button class="btn" id="submit" style="flex:none;width:auto;padding:10px 14px">등록</button></div>
    <div class="dim rank-msg" id="rank-msg"></div>
    <div class="seg" id="rtabs"><button data-k="combo" class="on">최고 콤보</button><button data-k="final">최종 금액</button></div>
    <div id="rank-list"></div>
  </div>
  <div class="box"><h2 style="margin-top:0">진짜 날짜 공개</h2>
    <p>${first.b} ~ ${last.s} 실제 장이었어요.</p>
    <p class="reveal">${esc(story.main)}</p>
    ${story.sub.map((x) => `<p class="dim" style="margin:4px 0">${esc(x)}</p>`).join('')}
    <table class="hist"><tr><th>매수일</th><th>종목</th><th class="n">수익률</th></tr>
    ${h.map((x) => `<tr><td>${x.sec.b.slice(2)}</td><td>${esc(x.name)}</td><td class="n ${cls(x.ret)}">${pct(x.ret)}</td></tr>`).join('')}
    </table>
  </div>
  <button class="btn" id="again2">🔁 한 판 더</button>
  <button class="btn ghost" id="home">처음으로</button>`);
  const restart = () => { clearSave(); startGame(); };
  $('#again').onclick = restart; $('#again2').onclick = restart; $('#home').onclick = () => { clearSave(); titleScreen(); };
  rankForm({ max_combo: S.combo, final_cash: Math.min(1e11, fin), peak_cash: Math.max(0, Math.min(1e11, Math.round(S.peak))), reading_uses: S.lead, title: T.main[0].slice(0, 30) });
}

/* ---------- 랭킹 (Supabase REST, 공개용 publishable 키) ---------- */
const SB_URL = 'https://xdowpybbmtshggsyscbs.supabase.co/rest/v1/runs';
const SB_KEY = 'sb_publishable_3mVV7E1s9WqXaF9e5E6gDA_HpJweAIO';
const RANK_ORDER = { combo: 'max_combo.desc,final_cash.desc.nullslast,created_at.asc', final: 'final_cash.desc.nullslast,max_combo.desc,created_at.asc' };
async function sb(url, opt = {}) {
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { ...opt, signal: ctl.signal, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...(opt.headers || {}) } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  } finally { clearTimeout(tm); }
}
async function loadTop(kind) {
  const r = await sb(`${SB_URL}?select=nickname,max_combo,final_cash,reading_uses,title,created_at&order=${RANK_ORDER[kind]}&limit=100`);
  return r.json();
}
async function rankOf(kind, me) { // 나보다 확실히 높은 기록 수 + 1 (동점은 같은 등수로 봐요)
  const q = kind === 'combo' ? `or=(max_combo.gt.${me.max_combo},and(max_combo.eq.${me.max_combo},final_cash.gt.${me.final_cash}))` : `final_cash=gt.${me.final_cash}`;
  const r = await sb(`${SB_URL}?select=nickname&${q}`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } });
  const n = Number((r.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(n) ? n + 1 : null;
}
const el = (tag, c, text) => { const e = document.createElement(tag); if (c) e.className = c; if (text !== undefined) e.textContent = text; return e; };
function renderTop(box, rows, kind, me) {
  box.innerHTML = '';
  if (!rows.length) { box.appendChild(el('p', 'dim', '아직 기록이 없어요. 첫 번째 단타왕이 되어 보세요!')); return -1; }
  let myIdx = -1;
  if (me) myIdx = rows.findIndex((r) => r.nickname === me.nickname && Number(r.max_combo) === me.max_combo && Number(r.final_cash) === me.final_cash);
  const list = el('div', 'rank-list');
  rows.forEach((r, i) => {
    const row = el('div', 'rank-row' + (i === myIdx ? ' me' : '') + (i < 3 ? ' top' + (i + 1) : ''));
    row.appendChild(el('span', 'rk', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)));
    const nm = el('span', 'rn'); nm.appendChild(el('span', '', r.nickname));
    if (Number(r.reading_uses) > 0) nm.appendChild(el('small', 'lead-mark', ` 📢x${Number(r.reading_uses)}`));
    if (r.title) nm.appendChild(el('small', 'dim', ' ' + r.title));
    row.appendChild(nm);
    row.appendChild(el('span', 'rc', kind === 'combo' ? `${r.max_combo}콤보` : (r.final_cash === null || r.final_cash === undefined ? '-' : won(Number(r.final_cash)))));
    list.appendChild(row);
  });
  box.appendChild(list);
  return myIdx;
}
function rankTabs(onPick) {
  document.querySelectorAll('#rtabs button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('#rtabs button').forEach((x) => x.classList.toggle('on', x === b)); onPick(b.dataset.k);
  });
}
const failMsg = (box) => { box.innerHTML = ''; box.appendChild(el('p', 'dim', '랭킹을 못 불러왔어요. 인터넷 연결을 확인해 주세요.')); };
function rankForm(entry) {
  const nick = $('#nick'), btn = $('#submit'), msg = $('#rank-msg'), list = $('#rank-list');
  let kind = 'combo', me = null;
  const run = S;
  nick.value = localStorage.getItem(LS.nick) || '';
  if (run.submitted) { btn.disabled = true; nick.disabled = true; btn.textContent = '완료'; msg.textContent = '이 판은 이미 등록했어요'; }
  const show = async () => {
    const k = kind;
    try { const rows = await loadTop(k); if (k !== kind || !document.body.contains(list)) return null; return renderTop(list, rows, k, me); }
    catch (e) { if (document.body.contains(list)) failMsg(list); return null; }
  };
  rankTabs((k) => { kind = k; show(); });
  btn.onclick = async () => {
    const name = nick.value.trim();
    if (name.length < 1 || name.length > 12) { msg.textContent = '닉네임은 1~12자로 써 주세요'; return; }
    btn.disabled = true; nick.disabled = true; msg.textContent = '등록하는 중...';
    try {
      await sb(SB_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ nickname: name, ...entry }) });
      localStorage.setItem(LS.nick, name);
      btn.textContent = '완료';
      me = { nickname: name, max_combo: entry.max_combo, final_cash: entry.final_cash };
      run.submitted = true; if (S === run) save();
      await show();
      const [rc, rp] = await Promise.all([rankOf('combo', me).catch(() => null), rankOf('final', me).catch(() => null)]);
      msg.textContent = rc || rp ? `등록 완료! 콤보 ${rc || '?'}등 · 금액 ${rp || '?'}등` : '등록 완료!';
    } catch (e) {
      btn.disabled = false; nick.disabled = false;
      msg.textContent = '등록 실패. 인터넷 연결을 확인하고 다시 눌러 주세요';
    }
  };
  show();
}
function rankScreen(kind) {
  S = null;
  render(`
  <h1>🏆 랭킹</h1>
  <div class="seg" id="rtabs"><button data-k="combo" class="${kind === 'combo' ? 'on' : ''}">최고 콤보</button><button data-k="final" class="${kind === 'final' ? 'on' : ''}">최종 금액</button></div>
  <div class="box"><div id="rank-list"><p class="dim">불러오는 중...</p></div></div>
  <button class="btn ghost" id="back">처음으로</button>`);
  $('#back').onclick = titleScreen;
  rankTabs((k) => rankScreen(k));
  const list = $('#rank-list');
  loadTop(kind).then((rows) => { if (document.body.contains(list)) renderTop(list, rows, kind, null); })
    .catch(() => { if (document.body.contains(list)) failMsg(list); });
}

/* ---------- 결과 연출 ---------- */
function slot(el, final, fmt, ms, done) {
  if (!el) return;
  if (RM()) { el.textContent = fmt(final); if (done) done(); return; }
  const t0 = performance.now(), mag = Math.max(Math.abs(final), 10);
  el.classList.add('spinning');
  const step = (now) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (now - t0) / ms);
    if (t < 1) {
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(final * e + (Math.random() * 2 - 1) * mag * (1 - e));
      requestAnimationFrame(step);
    } else { el.textContent = fmt(final); el.classList.remove('spinning'); el.classList.add('pop'); if (done) done(); }
  };
  requestAnimationFrame(step);
}
function fxLayer(cls, html, ms) {
  const fx = $('#fx'), L = document.createElement('div');
  L.className = 'fx-layer ' + cls; L.innerHTML = html || ''; fx.appendChild(L);
  setTimeout(() => L.remove(), ms); return L;
}
function fireworks() {
  const L = fxLayer('fx-red', '<div class="fx-text">상한가!!</div>', RM() ? 1500 : 2600);
  if (RM()) return;
  const cols = ['#ff4d4d', '#ff9a3c', '#ffd23f', '#ffffff'];
  for (let b = 0; b < 5; b++) {
    const cx = 15 + Math.random() * 70, cy = 12 + Math.random() * 40, delay = b * 220;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('div'); s.className = 'boom';
      const a = (i / 18) * Math.PI * 2, r = 50 + Math.random() * 60;
      s.style.left = cx + '%'; s.style.top = cy + '%'; s.style.background = cols[i % 4];
      s.style.setProperty('--dx', Math.round(Math.cos(a) * r / 4) * 4 + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * r / 4) * 4 + 'px');
      s.style.animationDelay = delay + 'ms'; L.appendChild(s);
    }
  }
  for (let i = 0; i < 22; i++) {
    const f = document.createElement('div'); f.className = 'flame';
    f.style.left = (i / 22) * 100 + Math.random() * 3 + '%'; f.style.background = cols[i % 3];
    f.style.animationDelay = Math.random() * 600 + 'ms'; f.style.setProperty('--h', 80 + Math.random() * 160 + 'px'); L.appendChild(f);
  }
}
function freeze(text) {
  const L = fxLayer('fx-ice', text === '' ? '' : `<div class="fx-text ice">${text || '꽁꽁 얼었다…'}</div>`, RM() ? 1500 : 2600);
  if (RM()) return;
  shake();
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('div'); s.className = 'snow';
    s.style.left = Math.random() * 100 + '%'; s.style.animationDelay = Math.random() * 900 + 'ms'; L.appendChild(s);
  }
}


/* ---------- 실제 날짜 공개 반전 ---------- */
const kdate = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${y}년 ${m}월 ${dd}일`; };
function periodStory(first, last) {
  const a = first.b, b = last.s, sub = [];
  const dates = [...new Set(S.hist.flatMap((x) => [x.sec.b, x.sec.s]))];
  const inWin = (f, t) => dates.filter((d) => d >= f && d <= t).length;
  const span = (e) => Date.parse(e[1]) - Date.parse(e[0]);
  const hits = EVENTS.filter((e) => inWin(e[0], e[1]) >= Math.min(e[3], dates.length)).sort((x, y) => span(x) - span(y));
  const ms = (DATA.ms || []).filter((m) => m[0] > 3000 && dates.includes(m[1])).pop();
  let main = null;
  if (ms) main = `사실 당신은 코스피가 사상 처음 종가 ${ms[0].toLocaleString()}을 넘은 ${kdate(ms[1])}을 지나왔습니다!`;
  else if (hits.length) main = hits[0][2];
  const big = S.hist.map((x) => x.sec).filter((x) => x.kp !== null && x.kp !== undefined).sort((x, y) => Math.abs(y.kp) - Math.abs(x.kp))[0];
  if (!main && big && Math.abs(big.kp) >= 5) main = `사실 이 기간엔 코스피가 하루 만에 ${pct(big.kp)} 움직인 날(${kdate(big.s)})이 끼어 있었어요!`;
  if (first.kb && last.ks) {
    const kr = (last.ks / first.kb - 1) * 100;
    const line = `이 기간 코스피 ${first.kb.toLocaleString()} → ${last.ks.toLocaleString()} (${pct(kr)})`;
    if (!main) main = `사실 당신은 코스피가 ${pct(kr)} ${kr >= 0 ? '오른' : '내린'} 장을 지나왔습니다!`; else sub.push(line);
  }
  const nas = S.hist.reduce((acc, x) => acc * (1 + x.nas / 100), 1);
  sub.push(`같은 기간 나스닥 누적 ${pct((nas - 1) * 100)}`);
  return { main: main || '평범해 보였던 그 장, 사실 진짜 역사였어요.', sub };
}


titleScreen();
loadData().then((d) => { DATA = d; if (!S) titleScreen(); })
  .catch((e) => { console.error(e); $('#screen').insertAdjacentHTML('beforeend', '<p class="down">데이터를 못 불러왔어요. 서버로 열어주세요.</p>'); });

// 로컬 테스트(Playwright)용 훅. 배포 주소(github.io)에서는 안 생겨요
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__dt = { get S() { return S; }, get DATA() { return DATA; }, reveal, revealHint, idx, day, variant, vIndex, vNo, easyList, turnScreen, startGame, cinema, jackpot, freeze };
}
})();
