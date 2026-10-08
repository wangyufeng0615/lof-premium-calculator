/**
 * 前端页面。整页放在模板字符串里，页面脚本里不要出现反引号、美元符加花括号和反斜杠转义。
 */

const TOKENS = `
:root {
  --bg: #ffffff; --bg-2: #f4f5f7; --bg-3: #eceef1;
  --ink: #101318; --ink-2: #4a5160; --ink-3: #858c98;
  --line: #e8eaee; --line-2: #d6dae0;
  --prem: #d33a2c; --disc: #0e8a76; --flat: #a3aab4; --series: #33425c;
  --focus: #2c6cc0; --radius: 6px;
  --sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115; --bg-2: #161920; --bg-3: #1d212a;
    --ink: #eceef2; --ink-2: #aab1bd; --ink-3: #737b88;
    --line: #232731; --line-2: #303542;
    --prem: #ee5d4c; --disc: #23a08f; --flat: #5f6772; --series: #c6cdd9;
    --focus: #5a93e0;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 15px/1.6 var(--sans); -webkit-font-smoothing: antialiased; font-synthesis: none; }
a { color: inherit; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
a:hover { text-decoration-color: currentColor; }
button, input { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 3px; }
.btn { height: 32px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: var(--radius); background: var(--bg); font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.btn:hover { border-color: var(--ink-3); }
.btn:disabled { opacity: .45; cursor: default; }
`;

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)">
<title>LOF 溢价</title>
<meta name="description" content="场内 LOF 基金的溢价率、折价率与扣除成本后的价差。">
<style>
${TOKENS}
.wrap { max-width: 1160px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 40px); }
.bar { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px); border-bottom: 1px solid var(--line); }
.bar .wrap { height: 56px; display: flex; align-items: center; gap: 20px; }
.brand { font-weight: 650; font-size: 16px; letter-spacing: .04em; white-space: nowrap; display: flex; align-items: center; gap: 10px; }
.brand-mark { width: 14px; height: 14px; border-radius: 3px; background: linear-gradient(90deg, var(--disc) 0 45%, var(--line-2) 45% 55%, var(--prem) 55%); }
.meta { flex: 1; min-width: 0; font-size: 13px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }

.hero { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: clamp(28px, 5vw, 64px); padding: clamp(36px, 6vw, 72px) 0 clamp(28px, 4vw, 48px); border-bottom: 1px solid var(--line); }
.eyebrow { margin: 0 0 14px; font-size: 13px; color: var(--ink-3); letter-spacing: .04em; }
.big { margin: 0; font-size: clamp(64px, 10vw, 104px); line-height: 1; font-weight: 650; letter-spacing: -.02em; }
.big-label { margin: 12px 0 0; font-size: 16px; }
.split { display: flex; height: 8px; gap: 2px; margin: 22px 0 10px; max-width: 280px; }
.split span { border-radius: 2px; }
.split-legend { display: flex; gap: 18px; font-size: 13.5px; color: var(--ink-2); flex-wrap: wrap; }
.key { display: inline-flex; align-items: center; gap: 7px; }
.key::before { content: ""; width: 8px; height: 8px; border-radius: 2px; background: var(--k); }
.facts { display: grid; grid-template-columns: auto auto; justify-content: start; gap: 12px 32px; margin: 28px 0 0; padding-top: 20px; border-top: 1px solid var(--line); }
.facts dt { font-size: 12.5px; color: var(--ink-3); }
.facts dd { margin: 2px 0 0; font-size: 15px; }
.facts dd button { border: 0; background: none; padding: 0; cursor: pointer; text-align: left; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.facts dd button:hover { text-decoration-color: currentColor; }
.sub { color: var(--ink-3); }

.dist { margin: 0; min-width: 0; }
.dist figcaption { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 10px; }
.dist figcaption b { font-weight: 600; font-size: 14.5px; }
.dist figcaption span { font-size: 12.5px; color: var(--ink-3); }
.hist { position: relative; }
.hist svg { display: block; width: 100%; overflow: visible; }
.hist:focus-visible { outline-offset: 6px; }
.axis text, .lbl { fill: var(--ink-3); font-size: 11.5px; font-family: var(--sans); font-variant-numeric: tabular-nums; }
.lbl { fill: var(--ink-2); }
.gridl { stroke: var(--line); stroke-width: 1; shape-rendering: crispEdges; }
.base { stroke: var(--line-2); stroke-width: 1; shape-rendering: crispEdges; }
.cost { stroke: var(--ink-3); stroke-width: 1; shape-rendering: crispEdges; }
.bin { cursor: pointer; }
.bin .b { transition: opacity .12s; }
.hist.hovering .bin .b, .hist.picked .bin .b { opacity: .4; }
.hist.hovering .bin.on .b, .hist.picked .bin.sel .b { opacity: 1; }
.bin rect.hitb { fill: transparent; }
.dist-note { margin: 10px 0 0; font-size: 12.5px; color: var(--ink-3); }

.controls { position: sticky; top: 56px; z-index: 15; background: var(--bg); border-bottom: 1px solid var(--line); }
.controls .wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding-top: 14px; padding-bottom: 14px; }
.seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: var(--radius); padding: 2px; gap: 2px; }
.seg button { border: 0; background: none; height: 28px; padding: 0 11px; border-radius: 4px; font-size: 13px; color: var(--ink-2); cursor: pointer; white-space: nowrap; }
.seg button:hover { color: var(--ink); background: var(--bg-2); }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
.seg button small { margin-left: 4px; opacity: .7; font-variant-numeric: tabular-nums; }
.search { flex: 1; min-width: 160px; max-width: 260px; height: 34px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: var(--radius); background: var(--bg); font-size: 13.5px; }
.search::placeholder { color: var(--ink-3); }
.chip { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 6px 0 10px; border-radius: var(--radius); background: var(--bg-2); font-size: 13px; color: var(--ink-2); }
.chip button { border: 0; background: none; cursor: pointer; color: var(--ink-3); height: 24px; padding: 0 6px; border-radius: 4px; }
.chip button:hover { color: var(--ink); background: var(--bg-3); }
.count { margin-left: auto; font-size: 12.5px; color: var(--ink-3); white-space: nowrap; font-variant-numeric: tabular-nums; }

.list { padding: 8px 0 40px; transition: opacity .15s; }
.list.busy { opacity: .5; }
table.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: right; font-weight: 500; font-size: 12.5px; color: var(--ink-3); padding: 14px 10px 10px; border-bottom: 1px solid var(--ink); white-space: nowrap; }
.tbl th:first-child { text-align: left; padding-left: 0; }
.tbl th button { border: 0; background: none; padding: 0; color: inherit; font: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.tbl th button:hover { color: var(--ink); }
.tbl th[aria-sort] button { color: var(--ink); }
.tbl th .arr { font-size: 10px; }
.tbl td { padding: 13px 10px; border-bottom: 1px solid var(--line); text-align: right; font-variant-numeric: tabular-nums; vertical-align: middle; white-space: nowrap; }
.tbl td:first-child { text-align: left; padding-left: 0; white-space: normal; }
.tbl tr.has-h { cursor: pointer; }
.tbl tr.has-h:hover td, .tbl tr.open td { background: var(--bg-2); }
.tbl tr.flash td { animation: flash 1.6s ease; }
@keyframes flash { 0%, 40% { background: color-mix(in srgb, var(--focus) 16%, transparent); } 100% { background: transparent; } }
.fund { display: grid; gap: 2px; }
.fund-name { font-size: 15px; display: flex; align-items: center; gap: 8px; }
.fund-name a { text-decoration: none; }
.fund-name a:hover { text-decoration: underline; }
.fund-sub { font-size: 12.5px; color: var(--ink-3); display: flex; gap: 10px; flex-wrap: wrap; }
.tag { font-size: 11.5px; color: var(--ink-2); border: 1px solid var(--line-2); border-radius: 4px; padding: 0 5px; line-height: 18px; }
.pr { display: inline-flex; align-items: center; gap: 14px; justify-content: flex-end; }
.pr-v { font-size: 15.5px; font-weight: 600; min-width: 68px; text-align: right; }
.mbar { position: relative; height: 10px; width: 64px; }
.mbar::before { content: ""; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: var(--line-2); }
.mbar i { position: absolute; top: 2px; height: 6px; }
.mbar i.p { left: 50%; background: var(--prem); border-radius: 0 3px 3px 0; }
.mbar i.d { right: 50%; background: var(--disc); border-radius: 3px 0 0 3px; }
.net-pos { font-weight: 600; }
.net-neg { color: var(--ink-3); }
.pn { font-size: 13.5px; color: var(--ink-2); }
.c-spark .sp { display: inline-flex; align-items: center; justify-content: flex-end; gap: 0; }
.spark svg { display: block; }
.spark-line { fill: none; stroke: var(--ink-3); stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
.spark-end { fill: var(--ink); stroke: var(--bg); stroke-width: 2; }
.chev { display: inline-block; width: 8px; height: 8px; border-right: 1.5px solid var(--ink-3); border-bottom: 1.5px solid var(--ink-3); transform: rotate(45deg) translate(-2px, -2px); margin-left: 10px; transition: transform .18s; }
tr.open .chev { transform: rotate(-135deg) translate(-2px, -2px); }
tr.detail td { background: var(--bg-2); padding: 4px 16px 20px; text-align: left; white-space: normal; }
tr.detail td:first-child { padding-left: 16px; }
.dh { display: flex; flex-wrap: wrap; gap: 6px 28px; font-size: 13px; color: var(--ink-2); padding: 8px 0 6px; }
.hchart { position: relative; }
.hchart svg { display: block; width: 100%; overflow: visible; }
.band { fill: var(--bg-3); }
.line { fill: none; stroke: var(--series); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dot { fill: var(--series); stroke: var(--bg-2); stroke-width: 2; }
.cross { stroke: var(--ink-3); stroke-width: 1; shape-rendering: crispEdges; }
.more { display: flex; justify-content: center; padding: 20px 0 0; }
.empty { padding: 48px 0; text-align: center; color: var(--ink-3); font-size: 14px; }

.state { padding: clamp(48px, 10vw, 120px) 0; display: grid; justify-items: start; gap: 14px; max-width: 520px; }
.state h2 { margin: 0; font-size: 22px; font-weight: 650; }
.state p { margin: 0; color: var(--ink-2); font-size: 14.5px; }
.progress { width: 100%; height: 6px; border-radius: 3px; background: var(--bg-3); overflow: hidden; }
.progress i { display: block; height: 100%; background: var(--series); border-radius: 3px; transition: width .4s; }

.foot { padding: 32px 0 calc(48px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12.5px; line-height: 1.8; }
.foot p { margin: 0; }

.tip { position: fixed; z-index: 50; pointer-events: none; min-width: 140px; max-width: 280px; padding: 9px 11px; background: var(--ink); color: var(--bg); border-radius: var(--radius); font-size: 12.5px; line-height: 1.55; box-shadow: 0 6px 24px rgb(0 0 0 / .16); }
.tip b { display: block; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.tip span { display: block; opacity: .75; }
.tip[hidden] { display: none; }

@media (max-width: 960px) {
  .hero { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  body { font-size: 14.5px; }
  .bar .wrap { height: 52px; gap: 12px; }
  .controls { position: static; }
  .controls .wrap { gap: 8px; padding-top: 10px; padding-bottom: 10px; }
  .search { max-width: none; order: 3; flex-basis: 100%; }
  .count { order: 4; margin-left: 0; }
  .hide-sm { display: none; }
  table.tbl, .tbl tbody { display: block; }
  .tbl thead { display: none; }
  .tbl tr.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "fund prem" "sub net"; gap: 4px 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .tbl tr.row td { display: block; padding: 0; border: 0; background: none !important; }
  .tbl tr.row td.c-fund { grid-area: fund; }
  .tbl tr.row td.c-prem { grid-area: prem; }
  .tbl tr.row td.c-net { grid-area: net; font-size: 12.5px; color: var(--ink-3); }
  .tbl tr.row td.c-net::before { content: "扣费后 "; }
  .tbl tr.row td.c-pn { grid-area: sub; text-align: left; font-size: 12.5px; }
  .tbl tr.row td.c-date, .tbl tr.row td.c-chg, .tbl tr.row td.c-spark { display: none; }
  .tbl tr.detail { display: block; }
  .tbl tr.detail td { display: block; padding: 4px 12px 16px; }
  .pr { gap: 0; }
  .mbar { display: none; }
  .facts { grid-template-columns: 1fr 1fr; gap: 12px 16px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>
</head>
<body>
<header class="bar"><div class="wrap">
  <div class="brand"><span class="brand-mark" aria-hidden="true"></span>LOF 溢价</div>
  <div class="meta" id="meta">正在读取数据</div>
  <button class="btn" id="refresh" type="button">刷新</button>
</div></header>
<main id="main">
  <div class="wrap"><div class="state" id="boot"><p>正在读取数据…</p></div></div>
</main>
<footer class="foot"><div class="wrap">
  <p>市价与列表来自新浪行情，基金净值来自东方财富；每个交易日北京时间 14:00 起重新计算一轮，约 1 小时算完。</p>
  <p>溢价率 = (净值日收盘价 − 单位净值) / 单位净值。扣费后按溢价套利成本 0.16%、折价套利成本 0.51% 估算，未检查申购赎回状态、限额与成交量。仅供研究，不构成投资建议。</p>
</div></footer>
<div class="tip" id="tip" role="tooltip" hidden></div>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var S = { d: null, view: 'arb', type: 'all', q: '', range: null, sort: null, limit: 50, open: {}, busy: false, poll: 0 };
  var VIEWS = [['arb', '可套利'], ['prem', '溢价'], ['disc', '折价'], ['all', '全部']];
  var TYPES = [['all', '全部类型'], ['normal', '普通'], ['qdii', 'QDII'], ['commodity', '商品']];
  var DEFAULT_SORT = { arb: ['net', -1], prem: ['prem', -1], disc: ['prem', 1], all: ['prem', -1] };
  var COLS = [
    ['fund', '基金', null], ['prem', '溢价率', 'premiumRate'], ['net', '扣费后', 'netProfit'],
    ['pn', '收盘价 / 净值', null], ['date', '净值日期', 'navDate'], ['chg', '当日涨跌', 'changePercent'], ['spark', '近 10 日溢价', null]
  ];
  var LO = -3.5, HI = 9, STEP = 0.25;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sgn(v) { return v > 0 ? '+' : v < 0 ? '−' : ''; }
  function pct(v, d) { if (v == null || isNaN(v)) return '—'; return sgn(v) + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; }
  function num(v, d) { return v == null || isNaN(v) ? '—' : Number(v).toFixed(d); }
  function bj(iso) {
    var t = new Date(iso); if (isNaN(t.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(t).replace('/', '-');
  }
  function costs() { var c = (S.d && S.d.arbitrageCosts) || {}; return { p: c.premium != null ? c.premium : 0.16, d: c.discount != null ? c.discount : 0.51 }; }
  function funds() { return (S.d && (S.d.allFunds || S.d.topPremiumFunds)) || []; }
  function isArb(f) { return f.netProfit > 0; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var tip = $('tip');
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.hidden = false;
    var r = tip.getBoundingClientRect(), left = x + 14, top = y - r.height - 12;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 18;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.hidden = true; }
  addEventListener('scroll', hideTip, { passive: true });

  /* ---------- 数据读取 ---------- */
  function load(manual) {
    if (S.busy) return;
    S.busy = true;
    $('refresh').disabled = true;
    var list = document.querySelector('.list');
    if (list) list.classList.add('busy');
    fetch('/data?top=500', { cache: 'no-store' }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, j: j }; });
    }).then(function (res) {
      if (res.status === 200 && res.j && (res.j.allFunds || res.j.topPremiumFunds)) {
        S.d = res.j; clearTimeout(S.poll); renderAll();
      } else if (res.status === 503 && res.j && res.j.progress) {
        if (S.d) { renderAll(); } else { renderComputing(res.j.progress); }
        clearTimeout(S.poll); S.poll = setTimeout(load, 60000);
      } else {
        throw new Error('HTTP ' + res.status);
      }
      if (manual && S.d) flashMeta();
    }).catch(function (e) {
      if (!S.d) renderError(e.message);
    }).then(function () {
      S.busy = false; $('refresh').disabled = false;
      var l = document.querySelector('.list'); if (l) l.classList.remove('busy');
    });
  }
  function flashMeta() { var m = $('meta'); m.style.color = 'var(--ink)'; setTimeout(function () { m.style.color = ''; }, 900); }

  function renderComputing(p) {
    var pctDone = p.totalBatches ? Math.round(p.currentBatch / p.totalBatches * 100) : 0;
    var left = Math.max(0, (p.totalBatches - p.currentBatch) * 2);
    $('meta').textContent = '数据计算中';
    $('main').innerHTML = '<div class="wrap"><div class="state"><h2>数据正在计算</h2><p>一轮计算分 ' + esc(p.totalBatches) + ' 批，每 2 分钟完成一批。现在是第 ' + esc(p.currentBatch) + ' 批，大约还要 ' + left + ' 分钟。</p><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pctDone + '"><i style="width:' + pctDone + '%"></i></div><p class="sub">这个页面会每分钟自动再试一次。</p></div></div>';
  }
  function renderError(msg) {
    $('meta').textContent = '读取失败';
    $('main').innerHTML = '<div class="wrap"><div class="state"><h2>数据暂时读不到</h2><p>' + esc(msg) + '。可以稍后再刷新一次。</p><button class="btn" type="button" id="retry">重新读取</button></div></div>';
    $('retry').onclick = function () { load(true); };
  }

  /* ---------- 整页 ---------- */
  function renderAll() {
    var d = S.d, all = funds(), c = costs();
    if (!S.sort) S.sort = DEFAULT_SORT[S.view].slice();
    $('meta').textContent = '净值 ' + (d.mostCommonNavDate || '—') + ' · 计算于 ' + (d._cache && d._cache.cachedAt ? bj(d._cache.cachedAt) : bj(d.executionTime)) + ' · ' + all.length + ' 只';
    var first = !document.querySelector('.hero');
    if (first) {
      $('main').innerHTML = '<div class="wrap"><section class="hero" id="hero"></section></div>' +
        '<div class="controls" id="controls"></div><div class="wrap"><section class="list" id="list" aria-live="polite"></section></div>';
    }
    renderHero(all, c);
    renderControls();
    renderList();
  }

  function renderHero(all, c) {
    var arbP = all.filter(function (f) { return f.premiumRate > 0 && f.netProfit > 0; }).length;
    var arbD = all.filter(function (f) { return f.premiumRate < 0 && f.netProfit > 0; }).length;
    var rest = all.length - arbP - arbD;
    var top = all.slice().sort(function (a, b) { return b.premiumRate - a.premiumRate; })[0];
    var low = all.slice().sort(function (a, b) { return a.premiumRate - b.premiumRate; })[0];
    var delayed = all.filter(function (f) { return f.navDelayDays > 1; }).length;
    var h = '<div>' +
      '<p class="eyebrow">场内 LOF · 净值日期 ' + esc(S.d.mostCommonNavDate || '—') + '</p>' +
      '<p class="big">' + (arbP + arbD) + '</p>' +
      '<p class="big-label">只基金扣除成本后仍有价差</p>' +
      '<div class="split" aria-hidden="true"><span style="flex:' + arbP + ';background:var(--prem)"></span><span style="flex:' + rest + ';background:var(--flat)"></span><span style="flex:' + arbD + ';background:var(--disc)"></span></div>' +
      '<div class="split-legend"><span class="key" style="--k:var(--prem)">溢价 ' + arbP + '</span><span class="key" style="--k:var(--flat)">成本以内 ' + rest + '</span><span class="key" style="--k:var(--disc)">折价 ' + arbD + '</span></div>' +
      '<dl class="facts">' +
      (top ? '<div><dt>最高溢价</dt><dd><button type="button" data-find="' + esc(top.code) + '">' + esc(top.name) + '</button> ' + pct(top.premiumRate) + '</dd></div>' : '') +
      (low ? '<div><dt>最深折价</dt><dd><button type="button" data-find="' + esc(low.code) + '">' + esc(low.name) + '</button> ' + pct(low.premiumRate) + '</dd></div>' : '') +
      '<div><dt>套利成本</dt><dd>溢价 ' + c.p + '% · 折价 ' + c.d + '%</dd></div>' +
      '<div><dt>净值晚一天以上</dt><dd>' + delayed + ' 只<span class="sub"> · 多为 QDII</span></dd></div>' +
      '</dl></div>' +
      '<figure class="dist"><figcaption><b>全部 ' + all.length + ' 只的溢价率分布</b><span>每格 0.25%，点击一格筛选下方列表</span></figcaption>' +
      '<div class="hist" id="hist" tabindex="0" aria-label="溢价率分布直方图，可用左右方向键逐格查看，回车筛选"></div>' +
      '<p class="dist-note" id="dist-note"></p></figure>';
    $('hero').innerHTML = h;
    drawHist(all, c);
  }

  /* ---------- 分布直方图 ---------- */
  function bins(all) {
    var n = Math.round((HI - LO) / STEP), out = [], k;
    for (k = 0; k < n; k++) out.push({ lo: LO + k * STEP, hi: LO + (k + 1) * STEP, f: [] });
    var over = [], under = [];
    all.forEach(function (f) {
      var v = f.premiumRate;
      if (v >= HI) over.push(f); else if (v < LO) under.push(f);
      else out[Math.min(n - 1, Math.floor((v - LO) / STEP + 1e-9))].f.push(f);
    });
    return { b: out, over: over, under: under };
  }
  function binColor(b, c) {
    if (b.lo >= c.p) return 'var(--prem)';
    if (b.hi <= -c.d) return 'var(--disc)';
    return 'var(--flat)';
  }
  function drawHist(all, c) {
    var box = $('hist'), w = Math.max(280, box.clientWidth), h = w < 520 ? 190 : 230;
    var m = { t: 26, r: 8, b: 26, l: 30 };
    var B = bins(all), maxN = Math.max.apply(null, B.b.map(function (b) { return b.f.length; }).concat([1]));
    var yStep = maxN > 60 ? 20 : maxN > 30 ? 10 : 5, yMax = Math.ceil(maxN / yStep) * yStep;
    var X = function (v) { return m.l + (v - LO) / (HI - LO) * (w - m.l - m.r); };
    var Y = function (n) { return m.t + (1 - n / yMax) * (h - m.t - m.b); };
    var bw = (w - m.l - m.r) / B.b.length, barW = Math.min(24, bw - 2);
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="溢价率分布">';
    for (var t = 0; t <= yMax; t += yStep) s += '<line class="gridl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="axis" x="' + (m.l - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end" fill="var(--ink-3)" font-size="11.5">' + t + '</text>';
    var xs = w < 520 ? [-3, 0, 3, 6, 9] : [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    s += '<g class="axis">' + xs.map(function (v) { return '<text x="' + X(v) + '" y="' + (h - 6) + '" text-anchor="middle">' + (v === 0 ? '0' : sgn(v) + Math.abs(v) + '%') + '</text>'; }).join('') + '</g>';
    s += '<line class="base" x1="' + X(0) + '" x2="' + X(0) + '" y1="' + (m.t - 4) + '" y2="' + (h - m.b) + '"/>';
    B.b.forEach(function (b, k) {
      var n = b.f.length, x = m.l + k * bw + (bw - barW) / 2, y = Y(n), hh = h - m.b - y;
      var path = n ? 'M' + x + ' ' + (h - m.b) + 'V' + (y + Math.min(4, hh)) + 'Q' + x + ' ' + y + ' ' + (x + Math.min(4, barW / 2)) + ' ' + y + 'H' + (x + barW - Math.min(4, barW / 2)) + 'Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + Math.min(4, hh)) + 'V' + (h - m.b) + 'Z' : '';
      s += '<g class="bin" data-k="' + k + '">' + (n ? '<path class="b" d="' + path + '" fill="' + binColor(b, c) + '"/>' : '') + '<rect class="hitb" x="' + (m.l + k * bw) + '" y="' + m.t + '" width="' + bw + '" height="' + (h - m.t - m.b) + '"/></g>';
    });
    s += '<line class="cost" x1="' + X(-c.d) + '" x2="' + X(-c.d) + '" y1="' + (m.t - 8) + '" y2="' + (h - m.b) + '"/><line class="cost" x1="' + X(c.p) + '" x2="' + X(c.p) + '" y1="' + (m.t - 8) + '" y2="' + (h - m.b) + '"/>';
    s += '<text class="lbl" x="' + (X(-c.d) - 5) + '" y="' + (m.t - 12) + '" text-anchor="end">折价成本 ' + c.d + '%</text><text class="lbl" x="' + (X(c.p) + 5) + '" y="' + (m.t - 12) + '" text-anchor="start">溢价成本 ' + c.p + '%</text>';
    s += '</svg>';
    box.innerHTML = s;
    var note = [];
    if (B.over.length) note.push('超出右边界：' + B.over.map(function (f) { return f.name + ' ' + pct(f.premiumRate); }).join('、'));
    if (B.under.length) note.push('超出左边界：' + B.under.map(function (f) { return f.name + ' ' + pct(f.premiumRate); }).join('、'));
    $('dist-note').textContent = note.join('；');
    var groups = box.querySelectorAll('.bin'), cur = -1;
    function focusBin(k, x, y) {
      cur = k;
      box.classList.add('hovering');
      groups.forEach(function (g) { g.classList.toggle('on', +g.dataset.k === k); });
      var b = B.b[k], names = b.f.slice().sort(function (a, z) { return Math.abs(z.premiumRate) - Math.abs(a.premiumRate); }).slice(0, 3).map(function (f) { return esc(f.name); });
      var r = groups[k].getBoundingClientRect();
      showTip('<b>' + b.f.length + ' 只</b><span>溢价率 ' + pct(b.lo) + ' 至 ' + pct(b.hi) + '</span>' + (names.length ? '<span>' + names.join('、') + (b.f.length > 3 ? ' 等' : '') + '</span>' : ''), x == null ? r.left + r.width / 2 : x, y == null ? r.top + 20 : y);
    }
    function clear() { cur = -1; box.classList.remove('hovering'); groups.forEach(function (g) { g.classList.remove('on'); }); hideTip(); }
    groups.forEach(function (g) {
      var k = +g.dataset.k;
      g.addEventListener('pointermove', function (e) { focusBin(k, e.clientX, e.clientY); });
      g.addEventListener('click', function () { if (B.b[k].f.length) pickRange(B.b[k]); });
    });
    box.addEventListener('pointerleave', clear);
    box.onkeydown = function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        var k = cur < 0 ? B.b.findIndex(function (b) { return b.lo >= 0; }) : cur + (e.key === 'ArrowLeft' ? -1 : 1);
        focusBin(Math.max(0, Math.min(B.b.length - 1, k)));
      } else if (e.key === 'Enter' && cur >= 0 && B.b[cur].f.length) { pickRange(B.b[cur]); }
      else if (e.key === 'Escape') clear();
    };
    box.onblur = clear;
    markRange();
  }
  function markRange() {
    var hist = $('hist'); if (!hist) return;
    hist.classList.toggle('picked', !!S.range);
    hist.querySelectorAll('.bin').forEach(function (g) {
      var lo = LO + (+g.dataset.k) * STEP;
      g.classList.toggle('sel', !!(S.range && Math.abs(S.range[0] - lo) < 1e-9));
    });
  }
  function pickRange(b) {
    S.range = [b.lo, b.hi]; S.view = 'all'; S.q = ''; S.sort = ['prem', -1]; S.limit = 50;
    hideTip(); renderControls(); renderList();
    $('controls').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /* ---------- 筛选与排序 ---------- */
  function filtered() {
    var q = S.q.trim().toLowerCase();
    return funds().filter(function (f) {
      if (S.view === 'arb' && !isArb(f)) return false;
      if (S.view === 'prem' && !(f.premiumRate > 0)) return false;
      if (S.view === 'disc' && !(f.premiumRate < 0)) return false;
      if (S.type !== 'all' && f.fundType !== S.type) return false;
      if (S.range && !(f.premiumRate >= S.range[0] && f.premiumRate < S.range[1])) return false;
      if (q && f.code.indexOf(q) < 0 && f.name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function sorted(list) {
    var key = S.sort[0], dir = S.sort[1];
    var get = { prem: function (f) { return f.premiumRate; }, net: function (f) { return f.netProfit; }, date: function (f) { return f.navDate; }, chg: function (f) { return f.changePercent; } }[key];
    return list.slice().sort(function (a, b) { var x = get(a), y = get(b); return x < y ? -dir : x > y ? dir : 0; });
  }
  function countFor(view) { var keep = S.view; S.view = view; var n = filtered().length; S.view = keep; return n; }

  function renderControls() {
    var box = $('controls');
    var views = VIEWS.map(function (v) { return '<button type="button" data-view="' + v[0] + '" aria-pressed="' + (S.view === v[0]) + '">' + v[1] + '<small>' + countFor(v[0]) + '</small></button>'; }).join('');
    var types = TYPES.map(function (t) { return '<button type="button" data-type="' + t[0] + '" aria-pressed="' + (S.type === t[0]) + '">' + t[1] + '</button>'; }).join('');
    var chip = S.range ? '<span class="chip">溢价率 ' + pct(S.range[0]) + ' 至 ' + pct(S.range[1]) + '<button type="button" id="clear-range" aria-label="清除区间筛选">清除</button></span>' : '';
    var had = document.activeElement && document.activeElement.id === 'q';
    box.innerHTML = '<div class="wrap"><div class="seg" role="group" aria-label="范围">' + views + '</div><div class="seg" role="group" aria-label="类型">' + types + '</div>' +
      chip + '<input class="search" id="q" type="search" placeholder="代码或名称" autocomplete="off" value="' + esc(S.q) + '" aria-label="搜索基金"><span class="count" id="count"></span></div>';
    if (had) { var q = $('q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    box.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { S.view = b.dataset.view; S.sort = DEFAULT_SORT[S.view].slice(); S.range = null; S.limit = 50; renderControls(); renderList(); }; });
    box.querySelectorAll('[data-type]').forEach(function (b) { b.onclick = function () { S.type = b.dataset.type; S.limit = 50; renderControls(); renderList(); }; });
    $('q').oninput = function (e) { S.q = e.target.value; S.limit = 50; renderList(); refreshCounts(); };
    if ($('clear-range')) $('clear-range').onclick = function () { S.range = null; renderControls(); renderList(); };
    markRange();
  }
  function refreshCounts() { document.querySelectorAll('[data-view]').forEach(function (b) { b.querySelector('small').textContent = countFor(b.dataset.view); }); }

  /* ---------- 列表 ---------- */
  function mbar(v) {
    var w = Math.min(Math.abs(v), 3) / 3 * 32;
    return '<span class="mbar" aria-hidden="true">' + (v ? '<i class="' + (v > 0 ? 'p' : 'd') + '" style="width:' + Math.max(1.5, w).toFixed(1) + 'px"></i>' : '') + '</span>';
  }
  function spark(h) {
    if (!h || h.length < 2) return '<span class="sub">—</span>';
    var W = 96, H = 26, v = h.map(function (x) { return x.premiumRate; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    var X = function (i) { return 3 + i / (v.length - 1) * (W - 6); }, Y = function (x) { return hi === lo ? H / 2 : 3 + (hi - x) / (hi - lo) * (H - 6); };
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path class="spark-line" d="' + v.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); }).join('') + '"/><circle class="spark-end" cx="' + X(v.length - 1).toFixed(1) + '" cy="' + Y(v[v.length - 1]).toFixed(1) + '" r="3"/></svg>';
  }
  function tags(f) {
    var t = '';
    if (f.fundType === 'qdii') t += '<span class="tag">QDII</span>';
    if (f.fundType === 'commodity') t += '<span class="tag">商品</span>';
    return t;
  }
  function rowHtml(f) {
    var has = f.premiumHistory && f.premiumHistory.length > 1;
    var delay = f.navDelayDays > 1 ? ' · 净值晚 ' + f.navDelayDays + ' 天' : '';
    return '<tr class="row' + (has ? ' has-h' : '') + (S.open[f.code] ? ' open' : '') + '" data-code="' + esc(f.code) + '"' + (has ? ' tabindex="0" aria-expanded="' + !!S.open[f.code] + '"' : '') + '>' +
      '<td class="c-fund"><div class="fund"><span class="fund-name"><a href="https://fund.eastmoney.com/' + esc(f.code) + '.html" target="_blank" rel="noopener noreferrer">' + esc(f.name) + '</a>' + tags(f) + '</span><span class="fund-sub"><span>' + esc(f.code) + '</span><span>' + esc(f.navDate) + delay + '</span></span></div></td>' +
      '<td class="c-prem"><span class="pr">' + mbar(f.premiumRate) + '<span class="pr-v">' + pct(f.premiumRate) + '</span></span></td>' +
      '<td class="c-net ' + (f.netProfit > 0 ? 'net-pos' : 'net-neg') + '">' + pct(f.netProfit) + '</td>' +
      '<td class="c-pn pn">' + num(f.marketPrice, 3) + ' / ' + num(f.nav, 4) + '</td>' +
      '<td class="c-date pn hide-sm">' + esc(String(f.navDate).slice(5)) + '</td>' +
      '<td class="c-chg pn">' + pct(f.changePercent) + '</td>' +
      '<td class="c-spark spark"><span class="sp">' + spark(f.premiumHistory) + '<span class="chev" aria-hidden="true"' + (has ? '' : ' style="visibility:hidden"') + '></span></span></td></tr>' +
      (has && S.open[f.code] ? '<tr class="detail" data-for="' + esc(f.code) + '"><td colspan="7"></td></tr>' : '');
  }
  function renderList() {
    var list = sorted(filtered()), shown = list.slice(0, S.limit), box = $('list');
    var head = '<thead><tr>' + COLS.map(function (c) {
      var sortable = { prem: 1, net: 1, date: 1, chg: 1 }[c[0]];
      var active = S.sort[0] === c[0];
      var aria = active ? ' aria-sort="' + (S.sort[1] > 0 ? 'ascending' : 'descending') + '"' : '';
      var cls = c[0] === 'date' ? ' class="hide-sm"' : '';
      return '<th scope="col"' + aria + cls + '>' + (sortable ? '<button type="button" data-sort="' + c[0] + '">' + c[1] + (active ? '<span class="arr">' + (S.sort[1] > 0 ? '▲' : '▼') + '</span>' : '') + '</button>' : c[1]) + '</th>';
    }).join('') + '</tr></thead>';
    box.innerHTML = list.length
      ? '<table class="tbl">' + head + '<tbody>' + shown.map(rowHtml).join('') + '</tbody></table>' + (list.length > S.limit ? '<div class="more"><button class="btn" type="button" id="more">显示全部 ' + list.length + ' 只</button></div>' : '')
      : '<p class="empty">没有符合条件的基金。</p>';
    $('count').textContent = '共 ' + list.length + ' 只' + (list.length > S.limit ? '，先显示 ' + S.limit + ' 只' : '');
    box.querySelectorAll('[data-sort]').forEach(function (b) {
      b.onclick = function () { var k = b.dataset.sort; S.sort = S.sort[0] === k ? [k, -S.sort[1]] : [k, k === 'date' ? -1 : -1]; renderList(); };
    });
    if ($('more')) $('more').onclick = function () { S.limit = 1e9; renderList(); };
    box.querySelectorAll('tr.detail').forEach(function (tr) { drawHistory(tr.firstChild, byCode(tr.dataset.for)); });
    box.querySelectorAll('tr.has-h').forEach(function (tr) {
      tr.onclick = function (e) { if (e.target.closest('a')) return; toggle(tr.dataset.code); };
      tr.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(tr.dataset.code); } };
    });
  }
  function byCode(code) { return funds().filter(function (f) { return f.code === code; })[0]; }
  function toggle(code) {
    S.open[code] = !S.open[code]; renderList();
    var tr = document.querySelector('tr.row[data-code="' + code + '"]'); if (tr) tr.focus({ preventScroll: true });
  }

  function niceTicks(lo, hi, count) {
    var raw = (hi - lo) / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    var step = (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1.5 ? 2 : 1) * mag, out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + step / 1e6; v += step) out.push(+v.toPrecision(10));
    return { ticks: out, step: step };
  }

  /* ---------- 近 10 日溢价走势 ---------- */
  function drawHistory(td, f) {
    var h = f.premiumHistory, c = costs();
    td.innerHTML = '<div class="dh"><span>近 ' + h.length + ' 个交易日溢价率</span><span>灰色带是成本区间（' + pct(-c.d) + ' 至 ' + pct(c.p) + '）</span></div><div class="hchart"></div>';
    var box = td.querySelector('.hchart'), w = Math.max(260, box.clientWidth), H = 180, m = { t: 10, r: 12, b: 26, l: 48 };
    var v = h.map(function (x) { return x.premiumRate; });
    var lo = Math.min.apply(null, v.concat([-c.d, 0])), hi = Math.max.apply(null, v.concat([c.p, 0]));
    var pad = (hi - lo) * 0.12 || 0.5; lo -= pad; hi += pad;
    var X = function (i) { return m.l + i / (v.length - 1) * (w - m.l - m.r); }, Y = function (x) { return m.t + (hi - x) / (hi - lo) * (H - m.t - m.b); };
    var nt = niceTicks(lo, hi, 4), step = nt.step, s = '<svg viewBox="0 0 ' + w + ' ' + H + '" height="' + H + '" role="img" aria-label="' + esc(f.name) + ' 近 ' + h.length + ' 日溢价率">';
    s += '<rect class="band" x="' + m.l + '" width="' + (w - m.l - m.r) + '" y="' + Y(c.p) + '" height="' + (Y(-c.d) - Y(c.p)) + '"/>';
    nt.ticks.forEach(function (t) { s += '<line class="gridl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="axis" x="' + (m.l - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end" fill="var(--ink-3)" font-size="11.5">' + (Math.abs(t) < 1e-9 ? '0' : pct(t, step < 0.1 ? 2 : step < 1 ? 1 : 0)) + '</text>'; });
    s += '<line class="base" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    s += '<g class="axis"><text x="' + X(0) + '" y="' + (H - 6) + '">' + esc(h[0].date) + '</text><text x="' + X(v.length - 1) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(h[h.length - 1].date) + '</text></g>';
    s += '<path class="line" d="' + v.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); }).join('') + '"/>';
    s += v.map(function (x, i) { return '<circle class="dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(x).toFixed(1) + '" r="' + (i === v.length - 1 ? 4.5 : 3) + '"/>'; }).join('');
    s += '<line class="cross" y1="' + m.t + '" y2="' + (H - m.b) + '" style="display:none"/><rect x="' + (m.l - 6) + '" y="0" width="' + (w - m.l - m.r + 12) + '" height="' + (H - m.b) + '" fill="transparent" class="hit"/></svg>';
    box.innerHTML = s;
    var svg = box.firstChild, cross = svg.querySelector('.cross'), hit = svg.querySelector('.hit');
    hit.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (w / r.width), k = 0;
      v.forEach(function (x, i) { if (Math.abs(X(i) - px) < Math.abs(X(k) - px)) k = i; });
      cross.setAttribute('x1', X(k)); cross.setAttribute('x2', X(k)); cross.style.display = '';
      var p = h[k];
      showTip('<b>' + pct(p.premiumRate) + '</b><span>' + esc(p.date) + '</span><span>收盘 ' + num(p.price, 3) + ' · 净值 ' + num(p.nav, 4) + '</span>', e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', function () { cross.style.display = 'none'; hideTip(); });
  }

  /* ---------- 其它交互 ---------- */
  document.addEventListener('click', function (e) {
    var find = e.target.closest('[data-find]');
    if (!find) return;
    var f = byCode(find.dataset.find);
    S.view = 'all'; S.type = 'all'; S.range = null; S.q = f.code; S.sort = ['prem', -1];
    if (f.premiumHistory && f.premiumHistory.length > 1) S.open[f.code] = true;
    renderControls(); renderList();
    var tr = document.querySelector('tr.row[data-code="' + f.code + '"]');
    if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); tr.classList.add('flash'); }
  });
  $('refresh').onclick = function () { load(true); };
  var lastW = innerWidth, rt = 0;
  addEventListener('resize', function () {
    if (innerWidth === lastW || !S.d) return; lastW = innerWidth; clearTimeout(rt);
    rt = setTimeout(function () { drawHist(funds(), costs()); document.querySelectorAll('tr.detail').forEach(function (tr) { drawHistory(tr.firstChild, byCode(tr.dataset.for)); }); }, 120);
  });
  load(false);
})();
</script>
</body>
</html>`;

/**
 * 管理页面：手动推进一轮分批计算
 */
export const ADMIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>LOF 数据更新</title>
<style>
${TOKENS}
main { max-width: 420px; margin: 0 auto; padding: clamp(48px, 12vh, 120px) 20px; }
h1 { margin: 0 0 6px; font-size: 22px; font-weight: 650; }
p { margin: 0; color: var(--ink-2); font-size: 14px; }
.panel { margin-top: 28px; display: grid; gap: 14px; }
.btn.primary { height: 40px; background: var(--ink); color: var(--bg); border-color: var(--ink); font-size: 14.5px; }
.progress { height: 6px; border-radius: 3px; background: var(--bg-3); overflow: hidden; }
.progress i { display: block; height: 100%; width: 0; background: var(--series); border-radius: 3px; transition: width .3s; }
.status { font-size: 13.5px; color: var(--ink-2); font-variant-numeric: tabular-nums; min-height: 1.6em; }
.status.err { color: var(--prem); }
.back { font-size: 13.5px; color: var(--ink-2); }
</style>
</head>
<body>
<main>
<h1>LOF 数据更新</h1>
<p>手动把一轮分批计算跑完。平时由定时任务每 2 分钟推进一批，不需要手动操作。</p>
<div class="panel">
  <button class="btn primary" id="btn" type="button">开始更新</button>
  <div class="progress" aria-hidden="true"><i id="fill"></i></div>
  <div class="status" id="status" role="status" aria-live="polite"></div>
  <a class="back" href="/">返回首页</a>
</div>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var running = false;
  $('btn').onclick = function () {
    if (running) return;
    running = true;
    var btn = $('btn'), fill = $('fill'), st = $('status');
    btn.disabled = true; btn.textContent = '更新中'; st.className = 'status'; st.textContent = '开始一轮新的计算'; fill.style.width = '0%';
    fetch('/batch/start').then(function () {
      function step() {
        return fetch('/batch/next').then(function (r) { return r.json(); }).then(function (p) {
          var pct = p.totalFunds > 0 ? Math.round(p.processedFunds / p.totalFunds * 100) : 0;
          fill.style.width = pct + '%';
          st.textContent = p.processedFunds + ' / ' + p.totalFunds + ' 只 · ' + pct + '%';
          if (p.status === 'completed') { fill.style.width = '100%'; st.textContent = '完成，成功 ' + p.successCount + ' 只'; return; }
          if (p.status === 'error') { throw new Error(p.error || '计算出错'); }
          if (p.status !== 'running') return;
          return new Promise(function (r) { setTimeout(r, 100); }).then(step);
        });
      }
      return step();
    }).catch(function (e) { st.className = 'status err'; st.textContent = e.message; })
      .then(function () { running = false; btn.disabled = false; btn.textContent = '重新更新'; });
  };
})();
</script>
</body>
</html>`;
