/**
 * 前端 HTML - 紧凑表格布局
 */

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0d1117">
<title>LOF溢价监控</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
:root {
  --bg: #0d1117; --bg2: #161b22; --bg3: #21262d; --fg: #e6edf3; --fg2: #8b949e; --fg3: #6e7681;
  --border: #30363d; --green: #3fb950; --red: #f85149; --blue: #58a6ff; --yellow: #d29922; --purple: #a371f7;
  --hover: #1f2937;
}
html { font-size: 12px; }
body {
  font-family: -apple-system, system-ui, 'SF Pro Text', 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.3;
}

/* 头部统计区 */
.header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo h1 { font-size: 1.2rem; font-weight: 600; }
.header-actions {
  display: flex;
  gap: 8px;
}
.btn-sm {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--fg2);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:hover { border-color: var(--blue); color: var(--fg); }
.btn-sm.active { background: var(--blue); border-color: var(--blue); color: #fff; }

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.stat-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 14px;
  min-width: 100px;
}
.stat-card .label { font-size: 0.85rem; color: var(--fg3); margin-bottom: 2px; }
.stat-card .value { font-size: 1.3rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-card .value.hl { color: var(--blue); }
.stat-card .sub { font-size: 0.8rem; color: var(--fg3); margin-top: 1px; }

/* 表格容器 */
.table-wrap {
  max-width: 1400px;
  margin: 0 auto;
  padding: 8px 12px;
  overflow-x: auto;
}

/* 表格 */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  min-width: 900px;
}
.tbl th, .tbl td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.tbl th {
  background: var(--bg2);
  color: var(--fg2);
  font-weight: 500;
  font-size: 0.85rem;
  position: sticky;
  top: 76px;
  z-index: 10;
  cursor: pointer;
  user-select: none;
}
.tbl th:hover { color: var(--fg); }
.tbl th.sorted { color: var(--blue); }
.tbl th .arr { margin-left: 3px; font-size: 0.7rem; }
.tbl tbody tr { transition: background 0.1s; }
.tbl tbody tr:hover { background: var(--hover); }
.tbl tbody tr.hl { background: rgba(63,185,80,0.08); }
.tbl tbody tr.hl:hover { background: rgba(63,185,80,0.12); }

/* 列对齐 */
.r { text-align: right; }
.c { text-align: center; }
.mono { font-family: 'SF Mono', Monaco, Consolas, monospace; }

/* 排名 */
.rank {
  color: var(--fg3);
  font-weight: 500;
  width: 32px;
}
.rank.top { color: var(--yellow); font-weight: 700; }

/* 代码链接 */
.code-link { color: var(--blue); text-decoration: none; }
.code-link:hover { text-decoration: underline; }

/* 基金名 */
.fund-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--fg2);
}

/* 标签 */
.tag {
  display: inline-block;
  font-size: 0.7rem;
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 500;
  margin-left: 4px;
  vertical-align: middle;
}
.tag.q { background: rgba(163,113,247,0.2); color: var(--purple); }
.tag.c { background: rgba(210,153,34,0.2); color: var(--yellow); }
.tag.delay { background: rgba(139,148,158,0.15); color: var(--fg3); font-size: 0.65rem; }

/* 数值颜色 */
.pos { color: var(--green); }
.neg { color: var(--red); }
.zero { color: var(--fg3); }

/* 溢价率突出 */
.prem-cell {
  font-weight: 700;
  font-size: 1.05rem;
}

/* 净收益 */
.profit-cell {
  font-weight: 600;
}

/* 迷你趋势图 */
.spark {
  width: 60px;
  height: 20px;
  vertical-align: middle;
}

/* 展开按钮 */
.more-row td {
  text-align: center;
  padding: 12px;
}
.btn-more {
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--fg2);
  padding: 6px 20px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-more:hover { border-color: var(--blue); color: var(--fg); }

/* 加载 */
.loading {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  z-index: 200;
}
.loading.hide { display: none; }
.spin {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: sp 0.6s linear infinite;
}
@keyframes sp { to { transform: rotate(360deg); } }
.loading-t { color: var(--fg2); font-size: 0.9rem; }
.err { padding: 40px; text-align: center; color: var(--red); }

/* tooltip */
.tip {
  position: fixed;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  max-width: 280px;
}
.tip.hide { display: none; }
.tip-row { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
.tip-row .lb { color: var(--fg3); }
.tip-row .vl { font-weight: 500; font-variant-numeric: tabular-nums; }

/* 移动端 */
@media (max-width: 768px) {
  html { font-size: 11px; }
  .header { padding: 8px 10px; }
  .header-top { flex-direction: column; align-items: flex-start; gap: 8px; }
  .stats-row { gap: 8px; }
  .stat-card { padding: 6px 10px; min-width: 80px; }
  .stat-card .value { font-size: 1.1rem; }
  .table-wrap { padding: 4px 6px; }
  .tbl { font-size: 0.9rem; }
  .tbl th { top: 100px; }
  .fund-name { max-width: 120px; }
}

/* 亮色模式 */
@media (prefers-color-scheme: light) {
  :root {
    --bg: #fff; --bg2: #f6f8fa; --bg3: #eaeef2; --fg: #1f2328; --fg2: #656d76; --fg3: #8b949e;
    --border: #d0d7de; --green: #1a7f37; --red: #cf222e; --blue: #0969da; --yellow: #9a6700; --purple: #8250df;
    --hover: #f3f4f6;
  }
  .tip { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
}
</style>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <div class="header-top">
      <div class="logo">
        <h1>LOF溢价监控</h1>
      </div>
      <div class="header-actions">
        <button class="btn-sm" id="btnAll">全部</button>
        <button class="btn-sm active" id="btnPrem">仅溢价</button>
        <button class="btn-sm" id="btnRefresh">刷新</button>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">净值日期</div>
        <div class="value hl" id="navDate">-</div>
        <div class="sub">T-1交易日</div>
      </div>
      <div class="stat-card">
        <div class="label">溢价基金</div>
        <div class="value" id="premCnt">-</div>
        <div class="sub" id="totalCnt">共 - 只</div>
      </div>
      <div class="stat-card">
        <div class="label">最高溢价</div>
        <div class="value pos" id="maxPrem">-</div>
      </div>
      <div class="stat-card">
        <div class="label">套利成本</div>
        <div class="value" id="arbCost">-</div>
        <div class="sub">溢价/折价</div>
      </div>
      <div class="stat-card">
        <div class="label">数据更新</div>
        <div class="value" id="updateTime">-</div>
      </div>
    </div>
  </div>
</header>

<div class="table-wrap">
  <table class="tbl">
    <thead>
      <tr>
        <th class="c" data-key="rank">#</th>
        <th data-key="code">代码</th>
        <th data-key="name">名称</th>
        <th class="r" data-key="marketPrice">市价</th>
        <th class="r" data-key="nav">净值</th>
        <th class="r" data-key="premiumRate">溢价率<span class="arr">▼</span></th>
        <th class="r" data-key="netProfit">净收益</th>
        <th class="r" data-key="changePercent">涨跌</th>
        <th class="c">趋势</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
</div>

<div class="tip hide" id="tip"></div>
<div class="loading" id="ld"><div class="spin"></div><span class="loading-t">加载数据中...</span></div>

<script>
const $=id=>document.getElementById(id);
const N=30;
let allData=[],filtered=[],expanded=false,sortKey='premiumRate',sortAsc=false,showAll=false;

// 迷你趋势图
function spark(d,code){
  if(!d||d.length<2)return'<span style="color:var(--fg3)">-</span>';
  const W=60,H=20,vals=d.map(x=>x.premiumRate);
  let mn=Math.min(0,...vals),mx=Math.max(0,...vals);
  const mg=(mx-mn)*0.1||0.2;mn-=mg;mx+=mg;
  const rg=mx-mn;
  const pts=vals.map((v,i)=>[2+(i/(vals.length-1))*(W-4),2+(1-(v-mn)/rg)*(H-4)]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const last=vals[vals.length-1];
  const col=last>=0?'var(--green)':'var(--red)';
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" data-code="'+code+'">'+
    '<path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="1.5" stroke-linecap="round"/>'+
    '<circle cx="'+pts[pts.length-1][0]+'" cy="'+pts[pts.length-1][1]+'" r="2" fill="'+col+'"/>'+
  '</svg>';
}

// 格式化
const fmtPct=(v,sign)=>{
  if(v==null||isNaN(v))return'-';
  const s=(sign!==false)&&v>0?'+':'';
  return s+v.toFixed(2)+'%';
};
const fmtPrice=v=>v==null||isNaN(v)?'-':v.toFixed(4);
const cls=v=>v>0?'pos':(v<0?'neg':'zero');

// 转义HTML
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// 渲染表格
function render(){
  const list=expanded?filtered:filtered.slice(0,N);
  if(!filtered.length){
    $('tbody').innerHTML='<tr><td colspan="9" class="err">暂无数据</td></tr>';
    return;
  }

  const rows=list.map((f,i)=>{
    const url='https://fund.eastmoney.com/'+esc(f.code)+'.html';
    const rkCls=i<3?'top':'';
    const hlCls=f.premiumRate>=1?'hl':'';

    let tags='';
    if(f.fundType==='qdii')tags='<span class="tag q">QDII</span>';
    else if(f.fundType==='commodity')tags='<span class="tag c">商品</span>';
    if(f.navDelayDays>0)tags+='<span class="tag delay">T-'+(f.navDelayDays+1)+'</span>';

    return '<tr class="'+hlCls+'" data-code="'+esc(f.code)+'">'+
      '<td class="c rank '+rkCls+'">'+(i+1)+'</td>'+
      '<td class="mono"><a class="code-link" href="'+url+'" target="_blank">'+esc(f.code)+'</a></td>'+
      '<td><span class="fund-name">'+esc(f.name)+'</span>'+tags+'</td>'+
      '<td class="r mono">'+fmtPrice(f.marketPrice)+'</td>'+
      '<td class="r mono">'+fmtPrice(f.nav)+'</td>'+
      '<td class="r mono prem-cell '+cls(f.premiumRate)+'">'+fmtPct(f.premiumRate)+'</td>'+
      '<td class="r mono profit-cell '+cls(f.netProfit)+'">'+fmtPct(f.netProfit)+'</td>'+
      '<td class="r mono '+cls(f.changePercent)+'">'+fmtPct(f.changePercent)+'</td>'+
      '<td class="c">'+spark(f.premiumHistory,f.code)+'</td>'+
    '</tr>';
  });

  // 展开按钮
  if(filtered.length>N){
    rows.push('<tr class="more-row"><td colspan="9"><button class="btn-more" id="btnMore">'+(expanded?'收起':'展开全部 ('+filtered.length+'只)')+'</button></td></tr>');
  }

  $('tbody').innerHTML=rows.join('');

  if($('btnMore')){
    $('btnMore').onclick=()=>{expanded=!expanded;render();if(!expanded)window.scrollTo({top:0,behavior:'smooth'});};
  }

  bindSparkTip();
}

// 趋势图tooltip
function bindSparkTip(){
  const tip=$('tip');
  document.querySelectorAll('.spark').forEach(svg=>{
    svg.onmouseenter=e=>{
      const code=svg.dataset.code;
      const fund=allData.find(f=>f.code===code);
      if(!fund||!fund.premiumHistory||fund.premiumHistory.length<2)return;
      const h=fund.premiumHistory;
      const first=h[0],last=h[h.length-1];
      const change=last.premiumRate-first.premiumRate;
      const max=Math.max(...h.map(x=>x.premiumRate));
      const min=Math.min(...h.map(x=>x.premiumRate));
      tip.innerHTML=
        '<div class="tip-row"><span class="lb">期间</span><span class="vl">'+esc(first.date)+' ~ '+esc(last.date)+'</span></div>'+
        '<div class="tip-row"><span class="lb">起始</span><span class="vl">'+fmtPct(first.premiumRate,false)+'</span></div>'+
        '<div class="tip-row"><span class="lb">当前</span><span class="vl '+cls(last.premiumRate)+'">'+fmtPct(last.premiumRate)+'</span></div>'+
        '<div class="tip-row"><span class="lb">变化</span><span class="vl '+cls(change)+'">'+fmtPct(change)+'</span></div>'+
        '<div class="tip-row"><span class="lb">最高</span><span class="vl">'+fmtPct(max,false)+'</span></div>'+
        '<div class="tip-row"><span class="lb">最低</span><span class="vl">'+fmtPct(min,false)+'</span></div>';
      tip.classList.remove('hide');
      const r=svg.getBoundingClientRect();
      tip.style.left=(r.right+8)+'px';
      tip.style.top=(r.top-20)+'px';
    };
    svg.onmouseleave=()=>tip.classList.add('hide');
  });
}

// 排序
function sortData(){
  filtered.sort((a,b)=>{
    let va=a[sortKey],vb=b[sortKey];
    if(typeof va==='string')va=va.toLowerCase();
    if(typeof vb==='string')vb=vb.toLowerCase();
    if(va==null)return 1;
    if(vb==null)return -1;
    return sortAsc?(va>vb?1:-1):(va<vb?1:-1);
  });
}

// 筛选
function filterData(){
  filtered=showAll?[...allData]:allData.filter(f=>f.premiumRate>0);
  sortData();
  expanded=false;
  render();
}

// 表头点击排序
document.querySelectorAll('.tbl th[data-key]').forEach(th=>{
  th.onclick=()=>{
    const key=th.dataset.key;
    if(key==='rank')return;
    if(sortKey===key)sortAsc=!sortAsc;
    else{sortKey=key;sortAsc=false;}
    document.querySelectorAll('.tbl th').forEach(t=>{t.classList.remove('sorted');const a=t.querySelector('.arr');if(a)a.remove();});
    th.classList.add('sorted');
    const span=document.createElement('span');
    span.className='arr';
    span.textContent=sortAsc?'▲':'▼';
    th.appendChild(span);
    sortData();
    render();
  };
});

// 按钮事件
$('btnAll').onclick=()=>{showAll=true;$('btnAll').classList.add('active');$('btnPrem').classList.remove('active');filterData();};
$('btnPrem').onclick=()=>{showAll=false;$('btnPrem').classList.add('active');$('btnAll').classList.remove('active');filterData();};
$('btnRefresh').onclick=()=>load();

// 加载数据
async function load(){
  $('ld').classList.remove('hide');
  try{
    const r=await fetch('/data?top=200');
    if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json();
    allData=j.topPremiumFunds||[];

    // 更新统计
    $('navDate').textContent=j.mostCommonNavDate||'-';
    $('premCnt').textContent=j.premiumFundCount+'只';
    $('totalCnt').textContent='共 '+j.successCount+' 只';
    const maxP=allData.length?Math.max(...allData.map(f=>f.premiumRate)):0;
    $('maxPrem').textContent=fmtPct(maxP);
    if(j.arbitrageCosts){
      $('arbCost').textContent=j.arbitrageCosts.premium+'% / '+j.arbitrageCosts.discount+'%';
    }
    const t=j._cache&&j._cache.cachedAt?new Date(j._cache.cachedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'-';
    $('updateTime').textContent=t;

    filterData();
  }catch(e){
    $('tbody').innerHTML='<tr><td colspan="9" class="err">加载失败: '+e.message+'</td></tr>';
  }finally{
    $('ld').classList.add('hide');
  }
}

load();
</script>
</body>
</html>`;

/**
 * 管理页面
 */
export const ADMIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LOF数据更新</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0d1117;--bg2:#161b22;--fg:#e6edf3;--fg2:#8b949e;--border:#30363d;--blue:#58a6ff;--green:#3fb950;--red:#f85149}
body{font-family:-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--fg);min-height:100vh;display:flex;justify-content:center;align-items:center}
.c{max-width:360px;width:100%;padding:16px}
h1{font-size:1.1rem;margin-bottom:16px;text-align:center}
.p{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px}
.btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:5px;padding:10px;font-size:0.9rem;cursor:pointer;font-weight:500}
.btn:hover{opacity:0.9}.btn:disabled{background:#6e7681;cursor:not-allowed}
.pg{margin-top:14px;display:none}.pg.show{display:block}
.bar{height:5px;background:var(--border);border-radius:3px;overflow:hidden}
.fill{height:100%;background:var(--green);transition:width 0.3s;width:0%}
.txt{font-size:0.75rem;color:var(--fg2);margin-top:8px;text-align:center}
.st{margin-top:12px;padding:8px;border-radius:5px;font-size:0.75rem;display:none}
.st.ok{display:block;background:rgba(63,185,80,0.15);color:var(--green)}
.st.er{display:block;background:rgba(248,81,73,0.15);color:var(--red)}
.bk{display:block;text-align:center;margin-top:14px;color:var(--blue);text-decoration:none;font-size:0.8rem}
.bk:hover{text-decoration:underline}
@media(prefers-color-scheme:light){:root{--bg:#f6f8fa;--bg2:#fff;--fg:#1f2328;--fg2:#656d76;--border:#d0d7de;--green:#1a7f37;--red:#cf222e}}
</style>
</head>
<body>
<div class="c">
<h1>LOF数据更新</h1>
<div class="p">
<button class="btn" id="btn">开始更新</button>
<div class="pg" id="pg"><div class="bar"><div class="fill" id="fl"></div></div><div class="txt" id="tx">准备中...</div></div>
<div class="st" id="st"></div>
</div>
<a href="/" class="bk">← 返回</a>
</div>
<script>
const $=id=>document.getElementById(id);
let run=false;
$('btn').onclick=async()=>{
if(run)return;run=true;
const btn=$('btn'),pg=$('pg'),fl=$('fl'),tx=$('tx'),st=$('st');
btn.disabled=true;btn.textContent='更新中...';pg.classList.add('show');st.className='st';fl.style.width='0%';tx.textContent='初始化...';
try{
await fetch('/batch/start');
let go=true;
while(go){
const r=await fetch('/batch/next');const p=await r.json();
const pct=p.totalFunds>0?Math.round(p.processedFunds/p.totalFunds*100):0;
fl.style.width=pct+'%';tx.textContent=p.processedFunds+'/'+p.totalFunds+' ('+pct+'%)';
if(p.status==='completed'){fl.style.width='100%';tx.textContent='完成';st.className='st ok';st.textContent='✓ 成功 '+p.successCount+' 只';go=false;}
else if(p.status==='error'){st.className='st er';st.textContent='✗ '+(p.error||'错误');go=false;}
else if(p.status!=='running'){go=false;}
if(go)await new Promise(r=>setTimeout(r,100));
}
}catch(e){st.className='st er';st.textContent='✗ '+e.message;}
finally{btn.disabled=false;btn.textContent='重新更新';run=false;}
};
</script>
</body>
</html>`;
