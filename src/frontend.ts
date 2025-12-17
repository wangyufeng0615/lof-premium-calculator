/**
 * 前端 HTML - 嵌入式单页应用
 */

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LOF溢价率</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #fff; --bg2: #f6f8fa; --fg: #1f2328; --fg2: #656d76; --fg3: #8b949e;
  --border: #d0d7de; --green: #1a7f37; --red: #cf222e; --blue: #0969da; --yellow: #9a6700; --purple: #8250df;
}
body { font: 13px/1.4 -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
.container { max-width: 800px; margin: 0 auto; padding: 12px; }
header { padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
.title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
h1 { font-size: 16px; font-weight: 600; }
.update-time { font-size: 11px; color: var(--fg3); }
.info-row { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 11px; color: var(--fg2); }
.info-row .label { color: var(--fg3); }
.info-row .value { font-weight: 500; }
.info-row .value.hl { color: var(--blue); font-weight: 600; }
.info-row .sep { color: var(--border); }
.tag-t1 { font-size: 10px; padding: 1px 4px; border-radius: 3px; background: #ddf4ff; color: var(--blue); margin-left: 2px; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 500; color: var(--fg2); background: var(--bg2); border-bottom: 1px solid var(--border); white-space: nowrap; }
td { padding: 5px 8px; border-bottom: 1px solid var(--border); }
tr:hover { background: var(--bg2); }
.r { text-align: right; }
.code { font: 12px 'SF Mono', Consolas, monospace; color: var(--blue); }
.name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { font-size: 10px; padding: 1px 4px; border-radius: 3px; margin-left: 4px; }
.tag-q { background: #f3e8ff; color: var(--purple); }
.tag-c { background: #fff8e6; color: var(--yellow); }
.pos { color: var(--green); font-weight: 500; }
.neg { color: var(--red); font-weight: 500; }
.mute { color: var(--fg3); }
.highlight { background: rgba(26,127,55,0.06); }
.expand-row { text-align: center; padding: 8px; }
.expand-btn { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; padding: 4px 12px; font-size: 12px; color: var(--fg2); cursor: pointer; }
.expand-btn:hover { background: var(--border); color: var(--fg); }
.loading { position: fixed; inset: 0; background: rgba(255,255,255,0.9); display: flex; justify-content: center; align-items: center; }
.loading.hide { display: none; }
.spin { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err { padding: 40px; text-align: center; color: var(--red); }
@media (max-width: 600px) {
  .container { padding: 8px; }
  .info-row { gap: 2px 10px; font-size: 10px; }
  table { font-size: 12px; }
  th, td { padding: 4px 6px; }
  .hide-m { display: none; }
  .name { max-width: 120px; }
}
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="title-row">
      <h1>LOF溢价率</h1>
      <span class="update-time" id="time">-</span>
    </div>
    <div class="info-row">
      <span><span class="label">溢价日期:</span> <span class="value hl" id="navDate">-</span> <span class="tag-t1">T-1</span></span>
      <span class="sep">|</span>
      <span><span class="label">统计:</span> <span class="value" id="stats">-</span></span>
      <span class="sep">|</span>
      <span><span class="label">数据:</span> 东方财富</span>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>代码</th>
        <th>名称</th>
        <th class="r hide-m">市价</th>
        <th class="r hide-m">净值</th>
        <th class="r">溢价</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
  <div class="expand-row" id="expandRow" style="display:none">
    <button class="expand-btn" id="expandBtn">展开全部</button>
  </div>
</div>
<div class="loading" id="loading"><div class="spin"></div></div>
<script>
const $ = id => document.getElementById(id);
const DEFAULT_SHOW = 5;
let allData = [];
let expanded = false;

async function load() {
  try {
    const res = await fetch('/data?top=50');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    allData = d.topPremiumFunds || [];
    renderMeta(d);
    renderTable();
  } catch (e) {
    $('tbody').innerHTML = '<tr><td colspan="6" class="err">加载失败: ' + e.message + '</td></tr>';
  } finally {
    $('loading').classList.add('hide');
  }
}

function renderMeta(d) {
  const t = d._cache?.cachedAt ? new Date(d._cache.cachedAt).toLocaleString('zh-CN', {hour12:false}) : '-';
  $('time').textContent = '更新: ' + t;
  $('stats').textContent = d.successCount + '只基金, ' + d.premiumFundCount + '只溢价';
  $('navDate').textContent = d.mostCommonNavDate || '-';
}

function renderTable() {
  const list = expanded ? allData : allData.slice(0, DEFAULT_SHOW);

  if (!allData.length) {
    $('tbody').innerHTML = '<tr><td colspan="6" class="mute" style="text-align:center;padding:40px">暂无数据</td></tr>';
    $('expandRow').style.display = 'none';
    return;
  }

  $('tbody').innerHTML = list.map((f, i) => {
    const tag = f.fundType === 'qdii' ? '<span class="tag tag-q">QDII</span>'
              : f.fundType === 'commodity' ? '<span class="tag tag-c">商品</span>' : '';
    const hl = f.premiumRate >= 1 ? ' class="highlight"' : '';
    return \`<tr\${hl}>
      <td class="mute">\${i+1}</td>
      <td class="code">\${f.code}</td>
      <td class="name">\${f.name}\${tag}</td>
      <td class="r hide-m">\${f.marketPrice.toFixed(3)}</td>
      <td class="r hide-m">\${f.nav.toFixed(4)}</td>
      <td class="r pos">+\${f.premiumRate.toFixed(2)}%</td>
    </tr>\`;
  }).join('');

  if (allData.length > DEFAULT_SHOW) {
    $('expandRow').style.display = 'block';
    $('expandBtn').textContent = expanded ? '收起' : \`展开全部 (\${allData.length})\`;
  } else {
    $('expandRow').style.display = 'none';
  }
}

$('expandBtn').addEventListener('click', () => {
  expanded = !expanded;
  renderTable();
});

load();
</script>
</body>
</html>`;
