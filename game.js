'use strict';
/* 내꿈은 단타왕 - 정적 웹게임 */
const START_CASH = 1000000, TURNS = 30, WIPE_RATIO = 0.05;
const FEE = 0.002, LOAN_INT = 0.01, LIVING_PCT = 0.01, LIVING_MIN = 10000;
const LEVS = [1, 2, 3.33];
const $ = (s) => document.querySelector(s);
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const pct = (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%';
const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : 'dim');
const shortT = (t) => t.replace(/\(.*?\)/g, '').trim();
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tick = (p) => { const t = p < 2000 ? 1 : p < 5000 ? 5 : p < 20000 ? 10 : p < 50000 ? 50 : p < 200000 ? 100 : p < 500000 ? 500 : 1000; return Math.round(p / t) * t; };
const living = (cash) => Math.max(LIVING_MIN, Math.round(cash * LIVING_PCT));

let DATA = null, S = null;

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

/* 결과는 매도 시점에만 풀어요 (간단한 난독화) */
function reveal(idx) {
  const b = atob(DATA.days[idx][3]);
  let x = (idx + 1) * 2654435761 + 0x5DA17A; x = x % 4294967296;
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0;
    out[i] = b.charCodeAt(i) ^ (x & 0xff);
  }
  return JSON.parse(new TextDecoder().decode(out));
}

function validStarts() {
  const d = DATA.days, out = [];
  for (let i = 0; i + TURNS <= d.length; i++) {
    let ok = true;
    for (let k = 0; k < TURNS - 1; k++) if (!d[i + k][4]) { ok = false; break; }
    if (ok) out.push(i);
  }
  return out;
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
  const K = '#2b1a12';
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

/* ---------- 화면 ---------- */
function best() { return Number(localStorage.getItem('dantaking_best') || 0); }
function hud() {
  $('#hud').classList.toggle('hidden', !S || S.over);
  if (!S) return;
  $('#hud-turn').textContent = `게임 종료까지 ${TURNS - S.turn}일`;
  $('#hud-cash').textContent = won(S.cash);
}
function render(html) { closeModal(); $('#screen').innerHTML = html; window.scrollTo(0, 0); hud(); }

function titleScreen() {
  S = null;
  render(`
  <h1>내꿈은 단타왕</h1>
  <p class="sub">실제 한국 주식 데이터로 하는 단타 게임</p>
  <canvas id="ant" width="16" height="16" class="bounce"></canvas>
  <div class="box rules">
    <h2>규칙</h2>
    <ul>
      <li>시작 자금 1,000,000원</li>
      <li>2020년 이후 <b>랜덤한 실제 거래일</b>에서 시작해 <b>30 영업일</b>, 30턴을 해요</li>
      <li>매일 12종목 중 딱 1종목을 오늘 종가에 사면, 다음 날 종가에 자동으로 팔려요. 쉬어도 돼요</li>
      <li>12종목 중엔 내일 상한가 가는 종목과 폭락하는 종목이 숨어 있어요</li>
      <li>미수로 현금의 최대 3.33배까지 살 수 있어요. 미수 이자 하루 1%, 남은 돈이 5% 이하면 깡통, 바로 게임오버</li>
      <li>팔 때 수수료와 세금 0.2%가 붙어요</li>
      <li>매 턴 생활비로 현금의 1%(최소 10,000원)가 빠져요. 0원이면 게임오버</li>
      <li>오늘의 뉴스엔 호재, 악재, 헛소문이 섞여 있어요</li>
      <li>날짜는 게임이 끝나면 공개돼요</li>
    </ul>
  </div>
  <p class="sub">최고 기록: ${best() ? won(best()) : '없음'}</p>
  <button class="btn" id="start" ${DATA ? '' : 'disabled'}>${DATA ? '게임 시작' : '데이터 불러오는 중...'}</button>`);
  drawAnt('normal');
  $('#start').onclick = startGame;
}

function startGame() {
  S = { start: pick(validStarts()), turn: 0, cash: START_CASH, hist: [], over: false, sel: null, lev: 1, amt: 100 };
  turnScreen();
}
const idx = () => S.start + S.turn;
const day = () => DATA.days[idx()];
const themeText = (s) => [...new Set(s[1].map((t) => shortT(DATA.themes[t])))].map(esc).join(' · ');

function turnScreen() {
  const d = day();
  S.sel = null; S.lev = 1; // 미수는 매 턴 다시 골라요
  render(`
  <div class="box nasdaq"><span>어젯밤 나스닥</span><span class="${cls(d[0])}">${pct(d[0])}</span></div>
  <div class="box news"><h2 style="margin-top:0">오늘의 뉴스</h2><ul>${d[1].map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>
  <h2>오늘의 12종목 <span class="dim" style="font-size:12px">카드를 누르면 자세히 봐요</span></h2>
  <div class="cards">${d[2].map((s, i) => `
    <div class="card" data-i="${i}">
      <div class="nm">${esc(s[0])}</div>
      <div class="tg">${themeText(s)}</div>
      <canvas class="chart" data-c="${i}"></canvas>
      <div class="px"><span class="${cls(s[4])}">${pct(s[4])}</span><span>${won(s[3])}</span></div>
    </div>`).join('')}</div>
  <div class="sticky-buy" id="buy"></div>`);
  document.querySelectorAll('canvas.chart').forEach((c) => drawChart(c, d[2][Number(c.dataset.c)][5]));
  document.querySelectorAll('.card').forEach((el) => el.onclick = () => detail(Number(el.dataset.i)));
  buyPanel();
}

function detail(i) {
  const s = day()[2][i];
  const m = modal(`
    <div class="kv"><b class="big-nm">${esc(s[0])}</b><span class="${cls(s[4])}">오늘 ${pct(s[4])}</span></div>
    <div class="tg">${themeText(s) || '테마 없음'}</div>
    <p class="summary">${esc(DATA.sums[s[2]] || '회사 소개 없음')}</p>
    <canvas class="chart big" id="bigchart"></canvas>
    <div class="kv dim"><span>최근 20일</span><span>오늘 종가 ${won(s[3])}</span></div>
    <div class="row"><button class="btn ghost" id="mclose">닫기</button><button class="btn" id="mpick">이 종목 고르기</button></div>`);
  drawChart(m.querySelector('#bigchart'), s[5], true);
  $('#mclose').onclick = closeModal;
  $('#mpick').onclick = () => { closeModal(); select(i); };
}
function select(i) {
  S.sel = i;
  document.querySelectorAll('.card').forEach((e) => e.classList.toggle('sel', Number(e.dataset.i) === i));
  buyPanel();
  $('#buy').scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function order() {
  const s = day()[2][S.sel];
  const power = S.cash * S.lev * (S.amt / 100);
  const qty = Math.max(0, Math.floor(power / s[3]));
  const cost = qty * s[3];
  const loan = Math.max(0, cost - S.cash);
  // 깡통 기준: 매도 후 남은 돈 <= 매수 전 현금의 5%
  let wipeAt = null;
  if (cost > 0) wipeAt = ((-(1 - WIPE_RATIO) * S.cash + loan * LOAN_INT + cost * FEE) / (cost * (1 - FEE))) * 100;
  return { s, qty, cost, loan, wipeAt };
}

function buyPanel() {
  const el = $('#buy');
  if (S.sel === null) {
    el.innerHTML = `<p class="dim" style="margin:4px 0;text-align:center">카드를 눌러 종목을 골라요</p><button class="btn ghost" id="pass">이번 턴은 쉬기</button>`;
    $('#pass').onclick = () => settle(null); return;
  }
  const o = order();
  const wipeTxt = o.wipeAt === null ? (o.qty ? '' : '현금이 모자라서 1주도 못 사요. 미수 배율이나 비율을 올려 봐요') : o.wipeAt <= -30 ? '하루 최대 하락(-30%)으로는 깡통이 안 나요' : `내일 ${o.wipeAt.toFixed(1)}% 이하로 떨어지면 깡통!`;
  el.innerHTML = `
    <div class="kv"><span>${esc(o.s[0])}</span><span>${won(o.s[3])} × ${o.qty.toLocaleString()}주</span></div>
    <div class="seg" id="lev">${LEVS.map((l) => `<button data-l="${l}" class="${l === S.lev ? 'on' : ''}">${l === 1 ? '현금만' : l + '배 미수'}</button>`).join('')}</div>
    <input type="range" id="amt" min="0" max="100" step="5" value="${S.amt}" aria-label="매수 비율">
    <div class="kv"><span>매수금액 ${won(o.cost)}</span><span class="${o.loan ? 'up' : 'dim'}">미수 ${won(o.loan)}${o.loan ? ` (이자 ${won(o.loan * LOAN_INT)})` : ''}</span></div>
    <div class="kv wipe ${o.wipeAt !== null && o.wipeAt > -30 ? 'down' : 'dim'}"><span>${wipeTxt}</span></div>
    <div class="row"><button class="btn ghost" id="pass">쉬기</button><button class="btn" id="go" ${o.qty ? '' : 'disabled'}>사고 내일로</button></div>`;
  el.querySelectorAll('#lev button').forEach((b) => b.onclick = () => { S.lev = Number(b.dataset.l); buyPanel(); });
  $('#amt').oninput = (e) => { S.amt = Number(e.target.value); buyPanel(); };
  $('#pass').onclick = () => settle(null);
  $('#go').onclick = () => {
    const o2 = order();
    if (S.lev >= 3) {
      modal(`<h2 style="margin-top:0">3.33배 풀미수, 진짜요?</h2>
        <p>미수 ${won(o2.loan)}, 이자 ${won(o2.loan * LOAN_INT)}.<br>${wipeTxt}</p>
        <div class="row"><button class="btn ghost" id="mno">다시 생각</button><button class="btn" id="myes">간다!</button></div>`);
      $('#mno').onclick = closeModal; $('#myes').onclick = () => { closeModal(); settle(o2); };
    } else settle(o2);
  };
}

function labels(rets) {
  const L = rets.map((r) => (r >= 29 ? '상한가' : r <= -29 ? '하한가' : ''));
  const mx = rets.indexOf(Math.max(...rets)), mn = rets.indexOf(Math.min(...rets));
  if (!L[mx]) L[mx] = '1등';
  if (!L[mn]) L[mn] = '꼴찌';
  return L;
}

function settle(o) {
  const sec = reveal(idx());
  const pre = S.cash;
  let after = pre, pnl = 0, wiped = false, fee = 0, interest = 0, ret = null, sellPx = null;
  if (o && o.qty) {
    ret = sec.r[S.sel];
    const proceeds = o.cost * (1 + ret / 100);
    fee = proceeds * FEE; interest = o.loan * LOAN_INT;
    sellPx = tick(o.s[3] * (1 + ret / 100));
    after = pre - o.cost + proceeds - fee - interest;
    pnl = after - pre;
    wiped = after <= pre * WIPE_RATIO;
  }
  const live = wiped ? 0 : living(after);
  const final = wiped ? Math.max(after, 0) : after - live;
  const broke = !wiped && final <= 0;
  S.hist.push({ sec, name: o && o.qty ? o.s[0] : null, ret, lev: o && o.qty ? S.lev : null, pnl, cash: final });
  S.cash = final;
  if (wiped || broke) S.over = true;
  resultScreen({ o, sec, pre, after, pnl, wiped, broke, fee, interest, live, ret, sellPx });
}

function resultScreen(R) {
  const d = day(), L = labels(R.sec.r);
  const rows = d[2].map((s, i) => ({ s, i, r: R.sec.r[i], l: L[i] })).sort((a, b) => b.r - a.r);
  const mine = R.o && R.o.qty ? S.sel : null;
  if (mine !== null) { const k = rows.findIndex((x) => x.i === mine); rows.unshift(rows.splice(k, 1)[0]); }
  const mood = R.wiped || R.broke ? 'broke' : mine === null ? 'normal' : R.pnl > 0 ? 'happy' : 'sad';
  const tag = (l) => (l ? `<span class="tag ${l === '상한가' || l === '1등' ? 'up' : 'down'}">${l}</span>` : '');
  render(`
  <canvas id="ant" width="16" height="16" class="${mood === 'happy' ? 'bounce' : ''}"></canvas>
  <div class="box">
    ${mine !== null ? `<div class="kv"><span>${esc(R.o.s[0])}${tag(L[mine])}</span><span class="${cls(R.ret)}">${pct(R.ret)}</span></div>
      <div class="kv dim"><span>${won(R.o.s[3])} → ${won(R.sellPx)}</span><span>${R.o.qty.toLocaleString()}주${S.lev > 1 ? ` · ${S.lev}배` : ''}</span></div>
      <div class="big ${cls(R.pnl)}">${R.pnl >= 0 ? '+' : ''}${won(R.pnl)}</div>
      <div class="kv dim"><span>수수료·세금</span><span>-${won(R.fee)}</span></div>
      ${R.interest ? `<div class="kv dim"><span>미수 이자</span><span>-${won(R.interest)}</span></div>` : ''}` : `<div class="big dim">오늘은 쉬었어요</div>`}
    <div class="kv"><span>매도 후 남은 돈</span><span>${won(R.after)}</span></div>
    ${R.wiped ? `<div class="big down">깡통! 게임오버</div>` : `<div class="kv"><span>생활비</span><span class="down">-${won(R.live)}</span></div><div class="kv"><span>현재 현금</span><span>${won(S.cash)}</span></div>`}
    ${R.broke ? `<div class="big down">생활비가 없어요. 게임오버</div>` : ''}
  </div>
  <div class="box news"><h2 style="margin-top:0">뉴스 결과</h2><ul>${d[1].map((n, i) => `<li>${esc(n)} ${R.sec.f[i] ? '<span class="fake">[헛소문]</span>' : '<span class="dim">[진짜]</span>'}</li>`).join('')}</ul></div>
  <div class="box res-list"><h2 style="margin-top:0">12종목 결과</h2>
    ${rows.map((x) => `<div class="r ${x.i === mine ? 'me' : ''}"><span>${x.i === mine ? '내 픽 · ' : ''}${esc(x.s[0])}${tag(x.l)}</span><span class="${cls(x.r)}">${pct(x.r)}</span></div>`).join('')}
  </div>
  <button class="btn" id="next">${S.over ? '결과 보기' : S.turn + 1 >= TURNS ? '최종 결과 보기' : '다음 날로'}</button>`);
  drawAnt(mood);
  if (mine !== null && R.ret >= 29) sparkle();
  if (mine !== null && (R.ret <= -29 || R.wiped)) shake();
  $('#next').onclick = () => { S.turn++; if (S.over || S.turn >= TURNS) endScreen(); else turnScreen(); };
}

function endScreen() {
  const survived = !S.over, finalCash = S.cash;
  let isBest = false;
  if (survived && finalCash > best()) { localStorage.setItem('dantaking_best', String(Math.round(finalCash))); isBest = true; }
  const h = S.hist, first = h[0].sec, last = h[h.length - 1].sec;
  S.over = true;
  const rate = (finalCash / START_CASH - 1) * 100;
  const title = !survived ? '파산한 개미' : rate >= 300 ? '단타왕' : rate >= 100 ? '큰손' : rate >= 0 ? '살아남은 개미' : '눈물의 개미';
  render(`
  <h1>${survived ? '30일 완주!' : '게임오버'}</h1>
  <canvas id="ant" width="16" height="16" class="${survived && rate > 0 ? 'bounce' : ''}"></canvas>
  <div class="box">
    <div class="big">${title}</div>
    <div class="kv"><span>최종 현금</span><span>${won(finalCash)}</span></div>
    <div class="kv"><span>수익률</span><span class="${cls(rate)}">${pct(rate)}</span></div>
    <div class="kv"><span>버틴 날</span><span>${h.length}일</span></div>
    <div class="kv"><span>최고 기록</span><span>${best() ? won(best()) : '없음'}${isBest ? ' <span class="tag up">신기록</span>' : ''}</span></div>
    ${survived ? '' : '<p class="dim">기록은 30일을 완주해야 남아요.</p>'}
  </div>
  <div class="box"><h2 style="margin-top:0">진짜 날짜 공개</h2>
    <p>${first.b} ~ ${last.s} 실제 장이었어요.</p>
    <table class="hist"><tr><th>매수일</th><th>종목</th><th class="n">수익률</th></tr>
    ${h.map((x) => `<tr><td>${x.sec.b.slice(2)}</td><td>${x.name ? esc(x.name) + (x.lev > 1 ? ` (${x.lev}배)` : '') : '<span class="dim">쉼</span>'}</td><td class="n ${x.ret === null ? 'dim' : cls(x.ret)}">${x.ret === null ? '-' : pct(x.ret)}</td></tr>`).join('')}
    </table>
  </div>
  <button class="btn" id="again">다시 하기</button>`);
  drawAnt(survived && rate > 0 ? 'happy' : survived ? 'normal' : 'broke');
  $('#again').onclick = titleScreen;
}

titleScreen();
loadData().then((d) => { DATA = d; if (!S) titleScreen(); })
  .catch((e) => { console.error(e); $('#screen').insertAdjacentHTML('beforeend', '<p class="down">데이터를 못 불러왔어요. 서버로 열어주세요.</p>'); });
