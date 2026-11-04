/* =========================================================
   Bench UI: stockroom, drag & drop, apparatus, inspector,
   notebook, scenarios runtime
   ========================================================= */
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const rgba=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a==null?(c[3]==null?1:c[3]):a})`;
const f2=x=>(Math.round(x*100)/100).toFixed(2);
const GL=Object.fromEntries(GLASS.map(g=>[g.id,g]));
const TL=Object.fromEntries(TOOLS.map(t=>[t.id,t]));
const VCAP={tube:15,btube:30,beaker:250,flask:160,cup:200};
const SIZE={tube:[56,200],btube:[66,212],beaker:[130,150],flask:[130,165],cup:[110,140],burner:[90,150],bath:[150,120],burette:[150,470],crosspaper:[150,40],stopwatch:[80,90]};
const BW=1000,BH=600;

const L={items:[],sel:null,selStock:null,scen:null,rows:[],events:[],runs:[],penalties:[],revealed:false,speed:1,wire:null,stock:[],tab:'chem',answers:{},qdone:false,counters:{}};
let IID=0;

/* ---------- helpers ---------- */
function seeded(seed){let s=0;for(const ch of String(seed))s=(s*31+ch.charCodeAt(0))>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function chemById(id){return L.stock.find(c=>c.id===id)||CHEM[id];}
function shortName(c){if(c.short)return c.short;if(c.f&&(/[\/]/.test(c.f)||c.f.length>14||c.f==='indicator'))return c.n;return (c.f&&c.f!=='indicator'&&c.f!=='?'&&!/^[\(]/.test(c.f)?`${c.f}${c.st==='sol'&&!/\(aq\)/.test(c.f)?'(aq)':''}`:c.n);}
function nextLabel(type){const p={tube:'T',btube:'BT',beaker:'B',flask:'F',cup:'Cup '}[type]||'X';L.counters[p]=(L.counters[p]||0)+1;return p+L.counters[p];}
function itemById(id){return L.items.find(i=>i.id===id);}
function vessels(){return L.items.filter(i=>i.kind==='vessel');}
function attachedTo(id){return L.items.filter(i=>i.on===id);}
function isLit(id){const b=itemById(id);return b&&b.kind==='burner'&&b.lit;}

/* ---------- items ---------- */
function addItem(kind,type,x,y,opts={}){
  const it={id:'i'+(++IID),kind,type,x,y,...opts};
  if(kind==='vessel'){it.v=newVessel(type);it.label=opts.label||nextLabel(type);it.v.label=it.label;equilibrate(it.v);it.lastSnap=snap(it.v);}
  if(kind==='burner')it.lit=opts.lit||false;
  if(kind==='bath'){it.on=opts.on!==false;it.T=opts.T||(it.on?80:AMB);}
  if(kind==='burette'){it.chem=null;it.reading=0;it.run=null;}
  if(kind==='stopwatch'){it.t=0;it.running=false;}
  if(kind==='mp'){it.T=AMB;it.rate=1;it.hist=[];it.heating=false;}
  const [w,h]=SIZE[type];it.w=w;it.h=h;
  L.items.push(it);renderItem(it,true);return it;
}
function removeItem(it){
  for(const a of attachedTo(it.id)){a.on=null;}
  L.items=L.items.filter(i=>i!==it);const el=$(`[data-id="${it.id}"]`);if(el)el.remove();
  if(L.sel===it.id){L.sel=null;renderInsp();}
}
function placeOn(v,host){
  v.on=host.id;
  if(host.kind==='burner'){v.x=host.x+host.w/2-v.w/2;v.y=host.y-v.h+(v.type==='beaker'||v.type==='flask'?18:42);}
  if(host.kind==='bath'){const others=attachedTo(host.id).filter(o=>o!==v);const slot=others.length;v.x=host.x+14+slot*38;v.y=host.y-v.h+84;}
  if(host.kind==='burette'){v.x=host.x+77-v.w/2;v.y=host.y+host.h-v.h-4;}
  if(host.type==='crosspaper'){v.x=host.x+host.w/2-v.w/2;v.y=host.y-v.h+26;}
  renderItem(v);
}
function zOf(it){if(it.kind==='burner')return 2;if(it.kind==='bath')return 3;if(it.kind==='burette')return 2;if(it.type==='crosspaper')return 1;if(it.kind==='vessel')return it.on?(itemById(it.on)&&itemById(it.on).kind==='bath'?4:6):5;return 7;}

/* ---------- drawing ---------- */
const GEO={
  tube:{W:56,H:200,path:'M12 8 L12 176 A16 16 0 0 0 44 176 L44 8',bot:192,top:8,L:12,R:44},
  btube:{W:66,H:212,path:'M12 8 L12 182 A21 21 0 0 0 54 182 L54 8',bot:203,top:8,L:12,R:54},
  beaker:{W:130,H:150,path:'M16 14 L16 140 Q16 146 22 146 L108 146 Q114 146 114 140 L114 14',bot:146,top:26,L:16,R:114},
  flask:{W:130,H:165,path:'M54 6 L54 52 L14 150 Q12 158 22 158 L108 158 Q118 158 116 150 L76 52 L76 6',bot:158,top:60,L:12,R:118},
  cup:{W:110,H:140,path:'M12 12 L22 132 L88 132 L98 12',bot:132,top:22,L:12,R:98},
};
function liqY(g,type,vol){const f=Math.min(1,vol/VCAP[type]);if(type==='flask'){const k=(1-Math.sqrt(1-0.85*f))/(1-Math.sqrt(0.15));return g.bot-(g.bot-g.top)*k;}return g.bot-(g.bot-g.top)*f;}
function drawVessel(it){
  const v=it.v,a=appearance(v),g=GEO[it.type],R=seeded(it.id);const cid='c'+it.id;
  let s=`<defs><clipPath id="${cid}"><path d="${g.path} Z"/></clipPath></defs>`;
  s+=`<path d="${g.path} Z" fill="rgba(250,253,255,.62)"/>`;
  s+=`<g clip-path="url(#${cid})">`;
  const yAq=liqY(g,it.type,v.vol),yOrg=liqY(g,it.type,v.vol+v.org);
  if(v.vol>0.02){
    const col=a.name==='colourless'?[200,226,240]:a.liq;const al=a.name==='colourless'?0.42:a.alpha;
    s+=`<rect x="0" y="${yAq}" width="${g.W}" height="${g.bot-yAq+4}" fill="${rgba(col,al)}"/>`;
    if(a.ring){const yr=yAq+(g.bot-yAq)*0.5;s+=`<rect x="0" y="${yr-3}" width="${g.W}" height="6" fill="rgba(110,55,20,.95)"/><rect x="0" y="${yr+3}" width="${g.W}" height="${g.bot-yr}" fill="rgba(235,225,190,.35)"/>`;}
    let hazeA=0,hazeC=null;
    for(const p of a.ppts){if(p.colloid){hazeA+=Math.min(.95,p.amt/Math.max(v.vol,1)*240);hazeC=p.rgb;continue;}hazeA+=p.vis*.35;hazeC=hazeC||p.rgb;}
    if(hazeC)s+=`<rect x="0" y="${yAq}" width="${g.W}" height="${g.bot-yAq+4}" fill="${rgba(hazeC,Math.min(.9,hazeA))}"/>`;
    let yb=g.bot;
    for(const p of a.ppts){if(p.colloid)continue;const ph=Math.min((g.bot-yAq)*0.55,3+p.vis*14);
      s+=`<rect x="0" y="${yb-ph}" width="${g.W}" height="${ph+4}" fill="${rgba(p.rgb,.96)}"/>`;
      for(let i=0;i<10;i++){const x=g.L+4+R()*(g.R-g.L-8),y=yAq+4+R()*Math.max(2,yb-ph-yAq-6);s+=`<circle cx="${x}" cy="${y}" r="${p.gel?2:1.2}" fill="${rgba(p.rgb,.8)}"/>`;}
      yb-=ph;}
  }
  if(v.org>0.02){const lc=a.layer&&a.layer.name!=='colourless'?a.layer.rgb:[240,238,222];const la=a.layer&&a.layer.name!=='colourless'?a.layer.a:0.32;
    s+=`<rect x="0" y="${yOrg}" width="${g.W}" height="${yAq-yOrg}" fill="${rgba(lc,la)}"/><line x1="0" x2="${g.W}" y1="${yAq}" y2="${yAq}" stroke="rgba(0,0,0,.18)"/>`;}
  // metals & dry solids
  for(const m of a.metals){for(let i=0;i<5;i++){const x=g.L+6+R()*(g.R-g.L-12);s+=`<ellipse cx="${x}" cy="${g.bot-4-R()*5}" rx="${4+R()*2}" ry="3" fill="${rgba(m.rgb,1)}" stroke="rgba(0,0,0,.25)"/>`;}}
  for(const d of a.dry){const w=g.R-g.L;s+=`<path d="M${g.L} ${g.bot} Q${g.L+w/2} ${g.bot-16-Math.min(10,d.amt*5)} ${g.R} ${g.bot} Z" fill="${rgba(d.rgb,1)}" stroke="rgba(0,0,0,.12)"/>`;}
  if(a.sublimate)s+=`<rect x="0" y="${g.top+6}" width="${g.W}" height="8" fill="rgba(255,255,255,.95)"/>`;
  if(a.bubbles&&v.vol>0.05){for(let i=0;i<8;i++){const x=g.L+5+R()*(g.R-g.L-10),y=g.bot-6-R()*Math.min(30,g.bot-yAq);s+=`<circle class="bub" style="animation-delay:${(i*.17).toFixed(2)}s" cx="${x}" cy="${y}" r="${1.3+R()*1.6}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.1"/>`;}}
  if(a.gasesActive.includes('H2O')&&v.vol<0.3){for(let i=0;i<5;i++)s+=`<circle cx="${g.L+4+R()*(g.R-g.L-8)}" cy="${g.top+20+R()*30}" r="1.6" fill="rgba(210,230,245,.9)"/>`;}
  s+=`</g>`;
  // glass
  s+=`<path d="${g.path}" fill="none" stroke="#8399a2" stroke-width="2"/>`;
  s+=`<path d="M${g.L+5} ${g.top+6} L${g.L+5} ${g.bot-26}" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>`;
  if(it.type==='tube'||it.type==='btube')s+=`<path d="M${g.L-4} 8 L${g.R+4} 8" stroke="#8399a2" stroke-width="3" stroke-linecap="round"/>`;
  if(it.type==='beaker'){s+=`<path d="M16 14 Q10 10 8 8" stroke="#8399a2" stroke-width="2" fill="none"/>`;for(let k=1;k<=4;k++){const y=liqY(g,'beaker',k*50);s+=`<line x1="96" x2="112" y1="${y}" y2="${y}" stroke="#8399a2" stroke-width="1"/>`;}}
  if(it.type==='cup')s+=`<path d="${g.path}" fill="none" stroke="#e9e3d4" stroke-width="5" opacity=".7"/>`;
  // fumes / steam / fire above mouth
  const mx=g.W/2,my=it.type==='flask'?6:(it.type==='beaker'?14:8);
  for(const fc of a.fumes){for(let i=0;i<5;i++)s+=`<circle class="fm" style="animation-delay:${(i*.4).toFixed(2)}s" cx="${mx-8+R()*16}" cy="${my-4}" r="${6+R()*4}" fill="${rgba(fc,.65)}"/>`;}
  if(a.steam){for(let i=0;i<4;i++)s+=`<circle class="fm" style="animation-delay:${(i*.5).toFixed(2)}s" cx="${mx-6+R()*12}" cy="${my-4}" r="6" fill="rgba(235,240,245,.7)"/>`;}
  if(a.fire){s+=`<path class="flame" d="M${mx-12} ${my} Q${mx-14} ${my-22} ${mx} ${my-44} Q${mx+14} ${my-22} ${mx+12} ${my} Z" fill="#ff9b1f" opacity=".9"/><path class="flame" d="M${mx-5} ${my} Q${mx-6} ${my-10} ${mx} ${my-22} Q${mx+6} ${my-10} ${mx+5} ${my} Z" fill="#ffe27a"/>`;}
  // thermometer
  if(it.thermo){const tx=g.R-12;s+=`<rect x="${tx-2.5}" y="${my-46}" width="5" height="${g.bot-my+36}" rx="2.5" fill="#fff" stroke="#9aa"/><circle cx="${tx}" cy="${g.bot-10}" r="4.5" fill="#d33"/>`;const tf=Math.min(1,Math.max(0,(v.T-0)/110));s+=`<rect x="${tx-1}" y="${g.bot-10-(g.bot-my+26)*tf}" width="2" height="${(g.bot-my+26)*tf}" fill="#d33"/>`;
    s+=`<g transform="translate(${tx+6},${my-50})"><rect width="54" height="18" rx="5" fill="#fff" stroke="#c9d3d0"/><text x="27" y="13" font-size="11" text-anchor="middle" font-family="IBM Plex Mono" fill="#222">${v.T.toFixed(1)}°C</text></g>`;}
  // tool fx
  if(it.fx&&performance.now()<it.fx.until){const fx=it.fx.vis;let t='';
    if(fx.paper)t+=`<rect x="${mx-6}" y="${my-48}" width="12" height="38" rx="2" fill="${rgba(fx.paper,1)}" stroke="rgba(0,0,0,.25)"/>`;
    if(fx.rod)t+=`<line x1="${mx+22}" y1="${my-56}" x2="${mx+2}" y2="${my-6}" stroke="#a9bcc2" stroke-width="4" stroke-linecap="round"/>`;
    if(fx.fumes)for(let i=0;i<5;i++)t+=`<circle class="fm" style="animation-delay:${(i*.3).toFixed(2)}s" cx="${mx-6+R()*14}" cy="${my-10}" r="8" fill="rgba(255,255,255,.95)" stroke="rgba(0,0,0,.06)"/>`;
    if(fx.flame){t+=`<line x1="${mx+34}" y1="${my-60}" x2="${mx+2}" y2="${my+4}" stroke="#c49a5a" stroke-width="5" stroke-linecap="round"/>`;const fx0=mx+2,fy=my+2;
      if(fx.flame==='bright'||fx.flame==='relight')t+=`<path class="flame" d="M${fx0-8} ${fy} Q${fx0-9} ${fy-16} ${fx0} ${fy-30} Q${fx0+9} ${fy-16} ${fx0+8} ${fy} Z" fill="#ffae1f"/><path class="flame" d="M${fx0-3} ${fy} Q${fx0-4} ${fy-8} ${fx0} ${fy-16} Q${fx0+4} ${fy-8} ${fx0+3} ${fy} Z" fill="#fff1a8"/>`;
      if(fx.flame==='pop')t+=`<circle class="popfx" cx="${fx0}" cy="${fy-6}" r="10" fill="none" stroke="#ff8c00" stroke-width="3"/><text x="${fx0+12}" y="${fy-22}" font-size="15" font-weight="700" fill="#c2410c">POP!</text>`;
      if(fx.flame==='glow')t+=`<circle cx="${fx0}" cy="${fy}" r="4" fill="#ff5a1f"/>`;
      if(fx.flame==='out')for(let i=0;i<3;i++)t+=`<circle class="fm" style="animation-delay:${i*.4}s" cx="${fx0}" cy="${fy-5}" r="5" fill="rgba(110,110,110,.55)"/>`;}
    if(fx.wave)t+=`<path d="M${mx+20} ${my-30} q10 -8 20 0 q10 8 20 0" stroke="#8a7c64" stroke-width="2.5" fill="none"/><text x="${mx+18}" y="${my-40}" font-size="18">✋</text>`;
    s+=`<g class="toolfx">${t}</g>`;}
  return `<svg width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}">${s}</svg>`;
}
function drawBurner(it){
  let s='';
  if(it.lit){s+=`<path class="flame" d="M33 62 Q30 30 45 0 Q60 30 57 62 Z" fill="rgba(80,130,255,.55)"/><path class="flame" d="M39 62 Q38 40 45 22 Q52 40 51 62 Z" fill="rgba(170,205,255,.9)"/>`;}
  if(it.flameFx&&performance.now()<it.flameFx.until){const c=it.flameFx.col;s+=`<path class="flame" d="M30 62 Q26 26 45 -6 Q64 26 60 62 Z" fill="${rgba(c,.85)}"/>`;}
  s+=`<rect x="37" y="62" width="16" height="64" rx="3" fill="#7d868c"/><rect x="34" y="96" width="22" height="10" rx="2" fill="#5b646a"/><circle cx="45" cy="101" r="3" fill="#2f3539"/>`;
  s+=`<path d="M14 148 L22 126 L68 126 L76 148 Z" fill="#4b5359"/><path d="M0 140 Q10 138 22 136" stroke="#c0392b" stroke-width="5" fill="none"/>`;
  s+=`<circle cx="70" cy="140" r="5" fill="${it.lit?'#16a34a':'#9aa'}"/>`;
  return `<svg width="90" height="150" viewBox="0 0 90 150">${s}</svg>`;
}
function drawBath(it){
  const wt=it.on?'rgba(150,200,235,.55)':'rgba(170,205,230,.45)';
  let s=`<path d="M8 6 L8 86 Q8 92 14 92 L136 92 Q142 92 142 86 L142 6" fill="${wt}" stroke="#8399a2" stroke-width="2"/><rect x="8" y="20" width="134" height="2" fill="rgba(255,255,255,.5)"/>`;
  if(it.on&&it.T>60)for(let i=0;i<3;i++)s+=`<circle class="fm" style="animation-delay:${i*.6}s" cx="${40+i*35}" cy="10" r="7" fill="rgba(240,245,250,.6)"/>`;
  s+=`<rect x="0" y="92" width="150" height="26" rx="5" fill="#3e474d"/><circle cx="22" cy="105" r="6" fill="#ccd"/><circle cx="128" cy="105" r="4" fill="${it.on?'#ef4444':'#555'}"/><text x="75" y="109" font-size="11" fill="#e5ecef" text-anchor="middle" font-family="IBM Plex Mono">${it.T.toFixed(0)} °C</text>`;
  return `<svg width="150" height="120" viewBox="0 0 150 120">${s}</svg>`;
}
function drawBurette(it){
  const y0=40,k=6.4;let s=`<rect x="0" y="456" width="150" height="12" rx="3" fill="#59626a"/><rect x="18" y="8" width="6" height="452" fill="#8f989e"/><rect x="18" y="58" width="58" height="6" fill="#8f989e"/><rect x="64" y="52" width="26" height="18" rx="3" fill="#6b747a"/>`;
  if(it.chem){const c=it.chem.bot;const dark=it.chem.id==='kmno4'||(it.chem.real==='kmno4');s+=`<rect x="71" y="${y0+it.reading*k}" width="12" height="${360-(y0+it.reading*k)}" fill="${rgba(c,dark?.95:.45)}"/><path d="M71 360 L83 360 L79 380 L75 380 Z" fill="${rgba(c,dark?.95:.45)}"/>`;}
  for(let v=0;v<=50;v++){const y=y0+v*k;s+=`<line x1="71" x2="${v%5?74:77}" y1="${y}" y2="${y}" stroke="#4b5560" stroke-width=".6"/>`;if(v%10===0)s+=`<text x="86" y="${y+3}" font-size="7" fill="#4b5560">${v}</text>`;}
  s+=`<rect x="71" y="16" width="12" height="344" fill="none" stroke="#8399a2" stroke-width="1.4"/><path d="M71 360 L83 360 L79 380 L75 380 Z" fill="none" stroke="#8399a2"/>`;
  s+=`<rect x="64" y="382" width="26" height="7" rx="2" fill="#2f3539"/><line x1="77" y1="389" x2="77" y2="404" stroke="#8399a2" stroke-width="3"/>`;
  if(it.drip&&performance.now()<it.drip)s+=`<circle class="drip" cx="77" cy="406" r="2.4" fill="${rgba(it.chem?it.chem.bot:[200,220,230],.9)}"/>`;
  return `<svg width="150" height="470" viewBox="0 0 150 470">${s}</svg>`;
}
function drawCross(){return `<svg width="150" height="40" viewBox="0 0 150 40"><rect x="2" y="4" width="146" height="34" rx="3" fill="#fff" stroke="#ccc"/><g stroke="#111" stroke-width="5" stroke-linecap="round"><line x1="60" y1="10" x2="90" y2="32"/><line x1="90" y1="10" x2="60" y2="32"/></g></svg>`;}
function drawStopwatch(it){const t=it.t,m=Math.floor(t/60),sec=(t%60).toFixed(1).padStart(4,'0');
  return `<svg width="80" height="90" viewBox="0 0 80 90"><rect x="34" y="0" width="12" height="10" rx="2" fill="#555"/><circle cx="40" cy="50" r="36" fill="#f3f4f2" stroke="#3f474c" stroke-width="5"/><rect x="12" y="38" width="56" height="24" rx="4" fill="#cfe3d2"/><text x="40" y="56" font-family="IBM Plex Mono" font-size="15" text-anchor="middle" fill="#123">${m}:${sec}</text><circle cx="40" cy="74" r="4" fill="${it.running?'#16a34a':'#999'}"/></svg>`;}
function drawItem(it){
  if(it.kind==='vessel')return drawVessel(it);
  if(it.kind==='burner')return drawBurner(it);
  if(it.kind==='bath')return drawBath(it);
  if(it.kind==='burette')return drawBurette(it);
  if(it.type==='crosspaper')return drawCross(it);
  if(it.kind==='stopwatch')return drawStopwatch(it);
  return '';
}
function itemLabel(it){if(it.kind==='vessel')return it.label;if(it.kind==='burner')return it.lit?'Bunsen (lit)':'Bunsen (off)';if(it.kind==='bath')return 'Water bath';if(it.kind==='burette')return it.chem?`Burette: ${shortName(it.chem)}`:'Burette (empty)';if(it.kind==='stopwatch')return '';return '';}
function renderItem(it,force){
  if(!L.items.includes(it))return;
  let el=$(`[data-id="${it.id}"]`,$('#bench'));
  if(!el){el=document.createElement('div');el.className='item';el.dataset.id=it.id;$('#bench').appendChild(el);el.addEventListener('pointerdown',e=>onDown(e,{type:'item',it}));}
  el.style.left=it.x+'px';el.style.top=it.y+'px';el.style.zIndex=zOf(it);
  el.classList.toggle('sel',L.sel===it.id);
  const html=drawItem(it)+(itemLabel(it)?`<div class="lbl"${it.kind==='burette'?' style="bottom:auto;top:-22px"':''}>${esc(itemLabel(it))}</div>`:'');
  if(force||el._h!==html){el.innerHTML=html;el._h=html;}
}
function renderAll(){for(const it of L.items)renderItem(it);$('#bench .hint').style.display=L.items.length?'none':'';}

/* ---------- stockroom ---------- */
function stockIcon(kind,o){
  if(kind==='chem'){const c=o.bot||[230,240,245];if(o.st==='solid')return `<svg width="28" height="30" viewBox="0 0 28 30"><rect x="4" y="6" width="20" height="22" rx="4" fill="#fff" stroke="#9aa"/><rect x="6" y="2" width="16" height="6" rx="2" fill="#555"/><path d="M7 26 Q14 14 21 26 Z" fill="${rgba(c,1)}" stroke="rgba(0,0,0,.15)"/></svg>`;
    return `<svg width="26" height="32" viewBox="0 0 26 32"><rect x="9" y="1" width="8" height="6" rx="1.5" fill="#6b5b45"/><path d="M8 7 L18 7 L18 11 Q23 13 23 18 L23 28 Q23 31 20 31 L6 31 Q3 31 3 28 L3 18 Q3 13 8 11 Z" fill="rgba(255,255,255,.7)" stroke="#8a9aa0"/><path d="M4 18 L22 18 L22 28 Q22 30 20 30 L6 30 Q4 30 4 28 Z" fill="${rgba(c,o.st==='org'?.5:.8)}"/></svg>`;}
  if(kind==='glass'){const m={tube:'<path d="M11 3 L11 26 A4 4 0 0 0 19 26 L19 3" fill="#e6f1f5" stroke="#7d939b" stroke-width="1.5"/>',btube:'<path d="M9 3 L9 25 A6 6 0 0 0 21 25 L21 3" fill="#e6f1f5" stroke="#7d939b" stroke-width="1.5"/>',beaker:'<path d="M5 6 L5 27 L25 27 L25 6" fill="#e6f1f5" stroke="#7d939b" stroke-width="1.5"/>',flask:'<path d="M12 3 L12 12 L4 27 L26 27 L18 12 L18 3" fill="#e6f1f5" stroke="#7d939b" stroke-width="1.5"/>',cup:'<path d="M5 5 L9 28 L21 28 L25 5" fill="#f4f0e6" stroke="#b8ab8f" stroke-width="1.5"/>',burette:'<rect x="13" y="1" width="4" height="24" fill="#e6f1f5" stroke="#7d939b"/><rect x="10" y="24" width="10" height="3" fill="#333"/>',burner:'<rect x="12" y="10" width="6" height="14" fill="#7d868c"/><path d="M15 2 Q11 6 13 10 L17 10 Q19 6 15 2" fill="#5b8def"/><rect x="7" y="24" width="16" height="4" fill="#4b5359"/>',bath:'<rect x="4" y="6" width="22" height="16" fill="#b5d6ec" stroke="#7d939b"/><rect x="2" y="22" width="26" height="6" fill="#3e474d"/>',crosspaper:'<rect x="2" y="8" width="26" height="14" fill="#fff" stroke="#bbb"/><path d="M10 11 L20 19 M20 11 L10 19" stroke="#111" stroke-width="2"/>'}[o.id]||'';return `<svg width="30" height="30" viewBox="0 0 30 30">${m}</svg>`;}
  const t={paper:`<rect x="11" y="3" width="8" height="24" rx="1" fill="${rgba(o.col||[200,200,200],1)}"/>`,splint:`<line x1="6" y1="27" x2="22" y2="6" stroke="#c49a5a" stroke-width="3"/>${o.id==='burn'?'<path d="M22 6 Q19 1 24 -1 Q27 3 22 6" fill="#ff9b1f"/>':'<circle cx="22" cy="6" r="2.5" fill="#ff5a1f"/>'}`,rod:`<line x1="8" y1="27" x2="22" y2="3" stroke="#a9bcc2" stroke-width="3"/>`,hand:`<text x="4" y="22" font-size="18">✋</text>`,thermo:`<rect x="13" y="2" width="4" height="22" rx="2" fill="#fff" stroke="#999"/><circle cx="15" cy="25" r="3.5" fill="#d33"/>`,wire:`<line x1="6" y1="27" x2="20" y2="8" stroke="#888" stroke-width="2"/><circle cx="21" cy="6" r="3" fill="none" stroke="#888" stroke-width="2"/>`,clock:`<circle cx="15" cy="16" r="10" fill="#f3f4f2" stroke="#3f474c" stroke-width="2"/><line x1="15" y1="16" x2="15" y2="9" stroke="#333" stroke-width="2"/>`}[o.ic]||'';
  return `<svg width="30" height="30" viewBox="0 0 30 30">${t}</svg>`;
}
function renderStock(){
  const q=($('#ssearch').value||'').toLowerCase();const box=$('#slist');let h='';
  if(L.tab==='chem'){const groups={};for(const c of L.stock){if(q&&!(c.n+' '+(c.f||'')+' '+(c.cat||'')).toLowerCase().includes(q))continue;(groups[c.cat]=groups[c.cat]||[]).push(c);}
    for(const g in groups){h+=`<div class="sgroup">${esc(g)}</div>`;for(const c of groups[g])h+=`<div class="sitem ${L.selStock===c.id?'sel':''}" data-k="chem" data-id="${c.id}"><div class="ic">${stockIcon('chem',c)}</div><div class="nm">${esc(c.n)}${(c.hz||[]).filter(z=>z!=='N').map(z=>`<span class="hzdot" title="${HZ[z][0]}" style="background:${HZ[z][1]}"></span>`).join('')}<small>${esc(c.f||'')}${c.conc?' · '+esc(c.conc):''}</small></div></div>`;}}
  if(L.tab==='glass'){for(const g of L.glass.map(id=>GL[id]).filter(Boolean)){if(q&&!g.n.toLowerCase().includes(q))continue;h+=`<div class="sitem ${L.selStock===g.id?'sel':''}" data-k="glass" data-id="${g.id}"><div class="ic">${stockIcon('glass',g)}</div><div class="nm">${esc(g.n)}<small>${esc(g.use.split('.')[0])}</small></div></div>`;}}
  if(L.tab==='tools'){for(const t of L.tools.map(id=>TL[id]).filter(Boolean)){if(q&&!t.n.toLowerCase().includes(q))continue;h+=`<div class="sitem ${L.selStock===t.id?'sel':''}" data-k="tool" data-id="${t.id}"><div class="ic">${stockIcon('tool',t)}</div><div class="nm">${esc(t.n)}<small>${esc(t.use)}</small></div></div>`;}}
  box.innerHTML=h||'<div class="sgroup">Nothing found</div>';
  $$('.sitem',box).forEach(el=>el.addEventListener('pointerdown',e=>onDown(e,{type:'stock',kind:el.dataset.k,id:el.dataset.id})));
}

/* ---------- drag & drop ---------- */
let D=null;
function benchPt(e){const r=$('#bench').getBoundingClientRect();const s=L.scale||1;return {x:(e.clientX-r.left)/s,y:(e.clientY-r.top)/s};}
function onDown(e,src){
  if(e.button>0)return;e.preventDefault();closeMenu();
  D={src,sx:e.clientX,sy:e.clientY,moved:false,target:null};
  if(src.type==='item'){const p=benchPt(e);D.offX=p.x-src.it.x;D.offY=p.y-src.it.y;}
  window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp,{once:true});window.addEventListener('pointercancel',onUp,{once:true});
}
function onMove(e){
  if(!D)return;
  if(!D.moved){if(Math.hypot(e.clientX-D.sx,e.clientY-D.sy)<6)return;D.moved=true;
    if(D.src.type==='stock'){const g=document.createElement('div');g.className='ghost';const o=D.src.kind==='chem'?chemById(D.src.id):D.src.kind==='glass'?GL[D.src.id]:TL[D.src.id];g.innerHTML=stockIcon(D.src.kind,o)+esc(o.n);document.body.appendChild(g);D.ghost=g;}
    else{$(`[data-id="${D.src.it.id}"]`).classList.add('dragging');}
  }
  if(D.ghost){D.ghost.style.left=e.clientX+'px';D.ghost.style.top=e.clientY+'px';}
  if(D.src.type==='item'){const it=D.src.it,p=benchPt(e);const ox=it.x,oy=it.y;it.x=Math.max(-10,Math.min(BW-it.w+10,p.x-D.offX));it.y=Math.max(-40,Math.min(BH-it.h+10,p.y-D.offY));renderItem(it);
    for(const a of attachedTo(it.id)){a.x+=it.x-ox;a.y+=it.y-oy;renderItem(a);}}
  const t=hitTarget(e);if(D.target!==t){$$('.drop-ok').forEach(x=>x.classList.remove('drop-ok'));D.target=t;if(t){const el=t==='bin'?$('#bin'):$(`[data-id="${t.id}"]`);if(el)el.classList.add('drop-ok');}}
}
function hitTarget(e){
  const els=document.elementsFromPoint(e.clientX,e.clientY);
  for(const el of els){if(el.id==='bin')return D.src.type==='item'?'bin':null;const itEl=el.closest&&el.closest('.item');if(itEl){const it=itemById(itEl.dataset.id);if(!it)continue;if(D.src.type==='item'&&(it===D.src.it||it.on===D.src.it.id))continue;return it;}}
  return null;
}
function overBench(e){const r=$('#benchscale').getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function onUp(e){
  window.removeEventListener('pointermove',onMove);
  if(!D)return;const d=D;D=null;
  $$('.drop-ok').forEach(x=>x.classList.remove('drop-ok'));if(d.ghost)d.ghost.remove();
  if(d.src.type==='item')$(`[data-id="${d.src.it.id}"]`)?.classList.remove('dragging');
  if(!d.moved){clickSrc(d.src);return;}
  drop(d.src,d.target,e);
}
function fakeEv(it){const r=$(`[data-id="${it.id}"]`).getBoundingClientRect();return {clientX:r.left+r.width/2,clientY:r.top+Math.min(r.height/2,60)};}
function clickSrc(src){
  if(src.type==='stock'){if(L.selStock===src.id){L.selStock=null;L.selKind=null;}else{L.selStock=src.id;L.selKind=src.kind;}L.sel=null;renderStock();renderInsp();renderAll();
    if(L.selStock){const o=src.kind==='chem'?chemById(src.id):src.kind==='glass'?GL[src.id]:TL[src.id];mentor(src.kind==='glass'?`Tap an empty spot on the bench to place the ${esc(o.n)} (or drag it).`:`Tap a container on the bench to use <b>${esc(o.n)}</b> (or drag it there). Tap the item again to cancel.`);}return;}
  const it=src.it;
  if(L.selStock&&L.selKind!=='glass'){const k=L.selKind,id=L.selStock;drop({type:'stock',kind:k,id},it,fakeEv(it));return;}
  if(L.selStock&&L.selKind==='glass'){const g=GL[L.selStock];if(it.kind!=='vessel'||['burner','bath','burette','crosspaper'].includes(it.type)||true){const e=fakeEv(it);drop({type:'stock',kind:'glass',id:L.selStock},it,e);L.selStock=null;renderStock();return;}}
  if(it.kind==='burner'){it.lit=!it.lit;logSimple(it.lit?'Bunsen burner lit (blue, non-luminous flame).':'Bunsen burner turned off.');emit({type:'burner',lit:it.lit});}
  if(it.kind==='bath'){it.on=!it.on;}
  if(it.kind==='stopwatch'){it.running=!it.running;}
  L.sel=it.id;L.selStock=null;renderStock();renderAll();renderInsp();
}
function drop(src,t,e){
  const p=benchPt(e);const inBench=overBench(e);
  if(src.type==='stock'){
    if(src.kind==='chem'){const chem=chemById(src.id);
      if(t&&t.kind==='vessel')return chemMenu(t,chem,e);
      if(t&&t.kind==='burette')return fillBurette(t,chem);
      return mentor('Drop chemicals onto a container on the bench: a test tube, beaker, flask or burette.','warn');}
    if(src.kind==='glass'){if(!inBench)return;const g=GL[src.id];const [w,h]=SIZE[g.id];
      const kind=['burner','bath','burette'].includes(g.id)?g.id:g.id==='crosspaper'?'cross':'vessel';
      const it=addItem(kind,g.id,Math.max(0,Math.min(BW-w,p.x-w/2)),Math.max(0,Math.min(BH-h,p.y-h/2)));
      if(kind==='vessel'&&t)attachTry(it,t);
      L.sel=it.id;renderAll();renderInsp();emit({type:'place',glass:g.id});return;}
    if(src.kind==='tool'){
      if(src.id==='stopwatch'){if(inBench){const it=addItem('stopwatch','stopwatch',p.x-40,p.y-45);L.sel=it.id;renderInsp();}return;}
      if(src.id==='wire'){if(t&&t.kind==='vessel')return loadWire(t);if(t&&t.kind==='burner')return flameTest(t);return mentor('Dip the wire into a sample first, then drag it into a lit Bunsen flame.','warn');}
      if(src.id==='thermo'){if(t&&t.kind==='vessel'){t.thermo=!t.thermo;renderItem(t);renderInsp();if(t.thermo){logRow(t,`${t.label}: thermometer inserted`,`The thermometer reads ${t.v.T.toFixed(1)} °C.`,'');emit({type:'thermo',vessel:t.id});}return;}return mentor('Drop the thermometer into a container.','warn');}
      if(t&&t.kind==='vessel')return useTool(t,src.id);
      return mentor('Drag the tool onto a container (to the mouth of the tube).','warn');}
    return;
  }
  const it=src.it;
  if(t==='bin'){removeItem(it);return;}
  if(it.kind==='vessel'){
    if(t&&t.kind==='vessel'){restoreDrag(it);return pourMenu(it,t,e);}
    if(t&&attachTry(it,t))return;
    it.on=null;renderItem(it);return;
  }
}
function restoreDrag(it){if(it.on){const h=itemById(it.on);if(h)placeOn(it,h);}else{it.x=Math.max(0,it.x);renderItem(it);}}
function attachTry(it,t){
  if(t.kind==='burner'){if(it.type==='cup'){mentor('Never heat a polystyrene cup. It will melt!','warn');return false;}placeOn(it,t);emit({type:'onburner',vessel:it.id});if(!t.lit)mentor('Vessel placed over the burner. Click the burner to light it.');return true;}
  if(t.kind==='bath'){if(!['tube','btube'].includes(it.type)){mentor('Only test tubes and boiling tubes fit in the water bath.','warn');return false;}placeOn(it,t);emit({type:'inbath',vessel:it.id});return true;}
  if(t.kind==='burette'){if(!['flask','beaker'].includes(it.type)){mentor('Place a conical flask under the burette.','warn');return false;}for(const o of attachedTo(t.id))if(o!==it){o.on=null;o.y+=40;o.x+=150;renderItem(o);}placeOn(it,t);it.v.flags.underBurette=t.id;emit({type:'underburette',vessel:it.id});return true;}
  if(t.type==='crosspaper'){if(!['flask','beaker'].includes(it.type))return false;placeOn(it,t);emit({type:'oncross',vessel:it.id});return true;}
  return false;
}

/* ---------- menus ---------- */
function closeMenu(){$('#menu')?.remove();}
function showMenu(e,title,opts){
  closeMenu();const m=document.createElement('div');m.className='menu';m.id='menu';
  m.innerHTML=`<h4>${title}</h4>`+opts.map((o,i)=>`<button data-i="${i}">${o.label}${o.sub?` <small>${o.sub}</small>`:''}</button>`).join('')+`<button data-i="x"><small>Cancel</small></button>`;
  document.body.appendChild(m);
  const W=m.offsetWidth,H=m.offsetHeight;m.style.left=Math.min(window.innerWidth-W-8,Math.max(8,e.clientX+8))+'px';m.style.top=Math.min(window.innerHeight-H-8,Math.max(8,e.clientY-20))+'px';
  m.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();if(b.dataset.i!=='x')opts[+b.dataset.i].fn();});
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#menu'))closeMenu();});
function chemMenu(it,chem,e){
  const small=['tube','btube'].includes(it.type);const ind=chem.cat==='Indicators';const conc=/conc/i.test(chem.n)||chem.conc_;
  let o=[];
  if(chem.st==='solid')o=small?[['A little (tip of spatula)',0.3],['1 spatula',1]]:[['1 spatula',1],['2 spatulas',2],['5 spatulas',5]];
  else if(ind)o=[['2 drops',0.1],['5 drops',0.25]];
  else if(conc)o=small?[['A few drops',0.2],['1 cm³',1],['2 cm³ (carefully down the side)',2]]:[['1 cm³',1],['5 cm³',5]];
  else if(small)o=[['A few drops (dropwise)',0.1,'drops'],['1 cm³',1],['2 cm³',2],['5 cm³ (in excess)',5,'excess']];
  else o=[['A few drops',0.1],['5 cm³',5],['10 cm³',10],['25.0 cm³ (pipette)',25,'pipette'],['50 cm³ (measuring cylinder)',50]];
  showMenu(e,`Add ${esc(chem.n)} to ${esc(it.label)}`,o.map(([lab,amt,tag])=>({label:lab,fn:()=>addChem(it,chem,amt,lab,tag)})));
}
function pourMenu(src,dst,e){
  const opts=[];const g=appearance(src.v).gasesActive.filter(x=>x!=='H2O');
  if(g.length&&dst.v.vol>0.2)opts.push({label:`Pass the gas from ${src.label} into ${dst.label}`,sub:'(delivery tube)',fn:()=>passGasInto(src,dst,g)});
  const tot=src.v.vol+src.v.org;
  if(tot>0.05){for(const a of [1,2,5,25])if(a<tot)opts.push({label:`Pour ${a} cm³`,fn:()=>pour(src,dst,a)});opts.push({label:`Pour all (${tot.toFixed(1)} cm³)`,fn:()=>pour(src,dst,tot)});}
  else if(Object.keys(src.v.dry).length)opts.push({label:'Tip the solid in',fn:()=>pourDry(src,dst)});
  if(!opts.length)return mentor(`${src.label} is empty.`,'warn');
  showMenu(e,`${esc(src.label)} → ${esc(dst.label)}`,opts);
}

/* ---------- actions ---------- */
function vesselCapOK(it,amt){const cap=GL[it.type].cap;if(it.v.vol+it.v.org+amt>cap){mentor(`${it.label} would overflow (capacity about ${cap} cm³).`,'warn');return false;}return true;}
function settle(it,ev,secs=1){for(let i=0;i<secs*5;i++){SIMT+=0.2;tick(it.v,0.2,heatingOf(it),ev);}}
function heatingOf(it){return !!(it.on&&isLit(it.on));}
function activeG(v){return appearance(v).gasesActive;}
function filterGas(ev,before){return ev.filter(e=>!(e.k==='gas'&&before.includes(e.g)));}
function addChem(it,chem,amt,lab,tag){
  if(!vesselCapOK(it,chem.st==='solid'?0:amt))return;
  const v=it.v,before=snap(v),bg=activeG(v),ev=[];const T0=v.T,vol0=v.vol;
  if(chem.st==='solid')addSolid(v,chem,amt,ev);else addLiquid(v,chem,amt,ev);
  equilibrate(v,ev);settle(it,ev);
  it.hist=[...(it.hist||[]),chem.id];
  if(it.type==='cup'){it.mixT0=chem.st==='solid'?T0:(T0*vol0+AMB*amt)/(vol0+amt||1);it.maxT=v.T;it.minT=v.T;}
  L.scen?.onAdd?.(it,chem,amt,before);
  const excess=tag==='excess'||(it.lastChem===chem.id&&amt>=1);
  const after=snap(v);const d=describe(before,after,filterGas(ev,bg),{reagent:shortName(chem),excess});
  const first=before.vol<0.05&&!before.dry;
  const test=first?`${it.label}: ${lab.toLowerCase().replace(/ \(.*\)/,'')} of ${chem.n}`:`${it.label} + ${shortName(chem)}, ${lab.toLowerCase()}`;
  logRow(it,test,d.obs,d.inf);it.lastChem=chem.id;it.lastSnap=after;
  handleSafety(ev);if(it.type==='flask'||it.type==='beaker'){const el=$(`[data-id="${it.id}"]`);el.classList.add('swirl');setTimeout(()=>el.classList.remove('swirl'),900);}
  renderItem(it);if(L.sel===it.id)renderInsp();
  emit({type:'add',chem:chem.real||chem.id,stock:chem.id,vessel:it.id,amt,excess,tag,contents:contentsOf(it)});
}
function contentsOf(it){const s=new Set();for(const r of (it.hist||[]))s.add(r);return [...s];}
function pour(src,dst,amt){
  if(!vesselCapOK(dst,amt))return;
  const before=snap(dst.v),bg=activeG(dst.v),ev=[];
  transfer(src.v,dst.v,amt,ev);equilibrate(src.v);equilibrate(dst.v,ev);settle(dst,ev);
  const after=snap(dst.v);const d=describe(before,after,filterGas(ev,bg),{reagent:`contents of ${src.label}`});
  logRow(dst,`${src.label} (${amt.toFixed(1)} cm³) poured into ${dst.label}`,d.obs,d.inf);
  dst.hist=[...(dst.hist||[]),...(src.hist||[])];dst.lastSnap=after;src.lastSnap=snap(src.v);
  handleSafety(ev);renderItem(src);renderItem(dst);renderInsp();emit({type:'pour',from:src.id,to:dst.id});
}
function pourDry(src,dst){const ev=[];const before=snap(dst.v);for(const id in src.v.dry){const c=chemOf(id);if(dst.v.vol>0.3)dissolveOne(dst.v,c,src.v.dry[id],ev);else dst.v.dry[id]=(dst.v.dry[id]||0)+src.v.dry[id];}src.v.dry={};equilibrate(src.v);equilibrate(dst.v,ev);settle(dst,ev);const d=describe(before,snap(dst.v),ev,{});logRow(dst,`Solid from ${src.label} added to ${dst.label}`,d.obs,d.inf);renderItem(src);renderItem(dst);}
function passGasInto(src,dst,gases){
  const before=snap(dst.v),ev=[];
  for(let i=0;i<3;i++)for(const g of gases)passGas(dst.v,g,ev);
  equilibrate(dst.v,ev);const after=snap(dst.v);
  const d=describe(before,after,ev,{reagent:'gas'});
  const names=[...new Set(dst.hist||[])];
  logRow(dst,`Gas from ${src.label} bubbled into ${dst.label}`,d.obs,d.inf);dst.lastSnap=after;renderItem(dst);
  emit({type:'passgas',gases,to:dst.id,toContents:Object.keys(dst.v.c)});
}
function useTool(it,tool){
  const r=toolTest(it.v,tool);it.fx={vis:{...r.vis,wave:tool==='waft'},until:performance.now()+3200};renderItem(it);
  setTimeout(()=>renderItem(it),3300);
  logRow(it,`${it.label}: ${TL[tool].n}`,r.obs,r.inf,{tool:true});
  emit({type:'tool',tool,vessel:it.id,gases:appearance(it.v).gasesActive,result:r.obs});
  if(tool==='waft'&&appearance(it.v).gasesActive.some(g=>['SO2','NO2','HCl','NH3'].includes(g)))mentor('Good technique: you wafted the gas instead of sniffing it directly.');
}
function loadWire(it){
  const f=it.v.d?it.v.d.free:{};const cats=Object.keys(f).filter(k=>/\+$/.test(k)&&f[k]>0.004);
  for(const p of (it.v.d?Object.keys(it.v.d.ppt):[])){const c=PPT[p]&&PPT[p].cat;if(c)cats.push(c);}
  for(const id in it.v.dry){const c=chemOf(id);if(c)for(const k in c.comp)if(/\+$/.test(k))cats.push(k);}
  L.wire={from:it.label,cats};mentor(`Nichrome wire cleaned in conc. HCl and dipped into ${it.label}. Now drag the wire into a lit Bunsen flame.`);
}
function flameTest(b){
  if(!b.lit)return mentor('Light the Bunsen burner first (click it).','warn');
  if(!L.wire)return mentor('Dip the wire into a sample first.','warn');
  const [col,inf,rgb]=flameColour(L.wire.cats);b.flameFx={col:rgb,until:performance.now()+3500};renderItem(b);setTimeout(()=>renderItem(b),3600);
  logRow(null,`Flame test on ${L.wire.from}`,`The flame is ${col}.`,inf);emit({type:'flame',cats:L.wire.cats});L.wire=null;
}
function fillBurette(b,chem){
  if(chem.st!=='sol'){return mentor('Only solutions can go in a burette.','warn');}
  b.chem=chem;b.reading=[0,0,0.5,1,1.5,0.2,0.4,0.8,1.2][Math.floor(Math.random()*9)];b.run=null;
  logRow(null,`Burette rinsed and filled with ${chem.n}`,'Burette filled; air bubble removed from the tip.','',{burette:true});
  renderItem(b);renderInsp();emit({type:'fillburette',chem:chem.real||chem.id});
}
function flaskUnder(b){return L.items.find(i=>i.on===b.id&&i.kind==='vessel');}
function tap(b,vol){
  if(!b.chem)return mentor('Fill the burette first: drag a solution bottle onto the burette.','warn');
  if(b.reading+vol>50.001){mentor('The burette is empty. Refill it and record a new initial reading.','warn');return false;}
  const f=flaskUnder(b);
  b.reading=Math.round((b.reading+vol)*100)/100;b.drip=performance.now()+400;
  if(!f){renderItem(b);mentor('No flask under the burette! The solution ran onto the bench.','warn');return true;}
  if(!b.run||b.run.flask!==f.id||b.run.done){b.run={flask:f.id,initial:Math.round((b.reading-vol)*100)/100,done:false};}
  const v=f.v,before=f.lastSnap||snap(v),ev=[];addLiquid(v,b.chem,vol,ev);equilibrate(v,ev);
  const after=snap(v);
  if(after.name!==before.name||Object.keys(after.pp).join()!==Object.keys(before.pp).join()){const d=describe(before,after,ev,{reagent:shortName(b.chem)});appendObs(f,d.obs,d.inf,`${f.label}: titrated with ${shortName(b.chem)} from the burette`);f.lastSnap=after;}
  const el=$(`[data-id="${f.id}"]`);if(el&&!el.classList.contains('swirl')){el.classList.add('swirl');setTimeout(()=>el.classList.remove('swirl'),900);}
  renderItem(b);renderItem(f);liveInsp();return true;
}
function recordEndpoint(b){
  if(!b.run||b.run.done)return mentor('Titrate first, then record the end point.','warn');
  b.run.final=b.reading;b.run.done=true;const f=itemById(b.run.flask);
  const run={initial:b.run.initial,final:b.run.final,titre:Math.round((b.run.final-b.run.initial)*100)/100,colour:f?appearance(f.v).name:'',flask:f?f.label:'',flaskId:f?f.id:null,hist:f?[...(f.hist||[])]:[]};
  L.runs.push(run);logRow(f,`${f?f.label:'Flask'}: end point recorded`,`Colour at end point: ${run.colour}.`,'',{});
  mentor(`End point recorded for ${run.flask}. Read the burette carefully and enter your readings in the Titration table.`);
  emit({type:'run',run});renderNB();renderInsp();
}
function shake(it){const v=it.v;const before=snap(v);if(v.flags.ring){v.flags.ring=false;}const ev=[];equilibrate(v,ev);settle(it,ev);const d=describe(before,snap(v),ev,{});logRow(it,`${it.label} shaken`,d.obs==='No visible change.'?'Contents mixed; no further change.':d.obs,d.inf);it.lastSnap=snap(v);renderItem(it);emit({type:'shake',vessel:it.id});}
function emptyVessel(it){it.v=newVessel(it.type);it.v.label=it.label;equilibrate(it.v);it.lastSnap=snap(it.v);it.lastChem=null;it.hist=[];it.row=null;renderItem(it);renderInsp();}

/* ---------- notebook rows ---------- */
let RID=0;
function logRow(it,test,obs,inf,opt={}){
  const row={id:++RID,item:it?it.id:null,test,obs,inf,mine:'',t:SIMT};L.rows.push(row);if(it)it.row=row.id;renderNB();
  $('#nbobs')?.scrollTo(0,99999);
}
function appendObs(it,obs,inf,newTest){
  const row=it.row&&L.rows.find(r=>r.id===it.row);
  if(row&&SIMT-row.t<90){if(!row.obs.includes(obs)){row.obs=(!row.obs||row.obs==='No visible change.'||row.obs==='No visible change yet.'?'':row.obs+' Then: ')+obs;}if(inf&&!row.inf.includes(inf))row.inf=(row.inf?row.inf+' ':'')+inf;row.t=SIMT;renderNB();}
  else logRow(it,newTest||`${it.label}: on standing`,obs,inf);
}
function logSimple(t){}

/* ---------- mentor, safety, events ---------- */
let mentorT=null;
function mentor(t,cls='info'){const m=$('#mentor');m.className='mentor '+(cls||'');m.innerHTML=t;clearTimeout(mentorT);if(cls!=='bad')mentorT=setTimeout(()=>{m.className='mentor';m.innerHTML=L.scen?L.scen.hint||'':'';},9000);}
function handleSafety(ev){for(const e of ev)if(e.k==='safety'){if(!L.penalties.includes(e.t)){L.penalties.push(e.t);}mentor('⚠ '+e.t,'bad');updateScore();}}
function emit(e){e.t=SIMT;L.events.push(e);checkObjectives();}
function checkObjectives(){
  if(!L.scen)return;let changed=false;
  for(const o of L.scen.objectives){if(!o.done&&o.check(L)){o.done=true;changed=true;mentor(`✓ Objective complete: ${o.t}`,'');}}
  if(changed){renderMission();updateScore();}
}
function updateScore(){
  if(L.exam){EXAM.updatePill();return;}
  const s=L.scen;if(!s)return;const ob=s.objectives.length?s.objectives.filter(o=>o.done).length/s.objectives.length:1;
  const qs=s.questions||[];const qc=qs.length?qs.filter(q=>q.correct).length/qs.length:0;
  const pen=Math.min(20,L.penalties.length*5);
  const score=Math.max(0,Math.round(ob*40+qc*60-pen));L.scoreVal=score;
  $('#score').innerHTML=`<span>Progress</span><div class="bar"><i style="width:${Math.round(ob*100)}%"></i></div><span>Score <b>${score}</b>/100</span>${pen?`<span title="${esc(L.penalties.join('\n'))}">⚠ −${pen}</span>`:''}`;
}

/* ---------- tick loop ---------- */
let lastDescribe=0;
function loop(){
  const dt=0.2*L.speed;SIMT+=dt;const now=performance.now();
  for(const it of L.items){
    if(it.kind==='bath'){const tgt=it.on?80:AMB;it.T+=(tgt-it.T)*Math.min(1,dt/45);}
    if(it.kind==='stopwatch'&&it.running){it.t+=dt;}
    if(it.kind!=='vessel')continue;
    const v=it.v;const heat=heatingOf(it);const ev=[];
    if(it.on){const h=itemById(it.on);if(h&&h.kind==='bath'){v.T+=(h.T-v.T)*Math.min(1,dt/10);}}
    tick(v,dt,heat,ev);
    if(heat&&!it._heatLogged){it._heatLogged=true;logRow(it,`${it.label}: heated over Bunsen flame`,'No visible change yet.','');it.lastSnap=it.lastSnap||snap(v);if(v.flags&&(v.c.ethanol>0.5||v.org>0.3))mentor('⚠ Flammable liquid over a naked flame. Use the water bath instead!','bad');emit({type:'heat',vessel:it.id});}
    if(!heat&&it._heatLogged&&!(it.on&&isLit(it.on))){it._heatLogged=false;const r=it.row&&L.rows.find(x=>x.id===it.row);if(r&&r.obs==='No visible change yet.'){r.obs='No visible change on heating.';renderNB();}}
    if(it.on&&itemById(it.on)?.kind==='bath'&&!it._bathLogged){it._bathLogged=true;logRow(it,`${it.label}: warmed in water bath`,'No visible change yet.','');emit({type:'heat',vessel:it.id,bath:true});}
    if(!(it.on&&itemById(it.on)?.kind==='bath'))it._bathLogged=false;
    if(ev.some(e=>e.k==='safety'))handleSafety(ev);
    it._ev=(it._ev||[]).concat(ev);
  }
  for(const it of vessels()){if(it.type==='cup')it.maxT=Math.max(it.maxT||it.v.T,it.v.T);}
  L.scen?.onLoop?.();
  if(now-lastDescribe>900){lastDescribe=now;
    for(const it of vessels()){const before=it.lastSnap||snap(it.v);const after=snap(it.v);const bgas=it._bg||[];const ev=filterGas(it._ev||[],bgas);it._ev=[];it._bg=appearance(it.v).gasesActive;
      const d=describe(before,after,ev,{heat:heatingOf(it)||(it.on&&itemById(it.on)?.kind==='bath'),wait:!heatingOf(it),reagent:'heat'});
      if(d.obs!=='No visible change.'){const row=it.row&&L.rows.find(r=>r.id===it.row);if(row&&row.obs==='No visible change yet.'){row.obs='';row.t=SIMT;}appendObs(it,d.obs,d.inf);
        emit({type:'obs',vessel:it.id,obs:d.obs,pp:Object.keys(after.pp),name:after.name,layer:after.layer,heat:heatingOf(it)});}
      it.lastSnap=after;}
    liveInsp();
  }
  renderAll();
}

/* ---------- inspector ---------- */
function renderInsp(){
  const box=$('#insp');
  if(L.selStock){const k=L.tab;const c=chemById(L.selStock);if(c&&k==='chem'){box.innerHTML=chemCard(c);return;}const g=GL[L.selStock]||TL[L.selStock];if(g){box.innerHTML=`<h3>${esc(g.n)}</h3><div class="info"><p>${esc(g.use)}</p><p class="sub">Drag it onto the bench${TL[L.selStock]?' or onto a container':''}.</p></div>`;return;}}
  const it=L.sel&&itemById(L.sel);
  if(!it){box.innerHTML=`<h3>Inspector</h3><div class="sub">Click anything on the bench or in the stockroom to see details here.</div><div class="info"><p><b>How to work:</b></p><p>• Drag glassware from <b>Apparatus</b> onto the bench.<br>• Drag a <b>chemical bottle</b> onto a container, then choose how much.<br>• Drag a container onto another to <b>pour</b>, onto a <b>Bunsen burner</b> to heat (click the burner to light it), or under the <b>burette</b>.<br>• Drag <b>tools</b> (litmus, splints, glass rods, flame-test wire) onto a container.<br>• Drag items to the bin to remove them.</p></div>`;return;}
  if(it.kind==='vessel'){
    const v=it.v,a=appearance(v);const dataOK=!L.scen||L.scen.data!==false||L.revealed;
    const look=describeLook(it,a);
    let h=`<h3>${esc(it.label)} <span class="sub">· ${GL[it.type].n}</span></h3><div class="look" data-live="look">${look}</div>
      <div class="row"><button class="btn sm" data-a="shake">Shake / swirl</button><button class="btn sm" data-a="thermo">${it.thermo?'Remove':'Insert'} thermometer</button><button class="btn sm" data-a="rename">Rename</button><button class="btn sm" data-a="empty">Empty & rinse</button><button class="btn sm" data-a="del">Remove</button></div>`;
    h+=`<div class="sect"><h4>Temperature</h4><div data-live="temp">${it.thermo?`<b class="mono">${v.T.toFixed(1)} °C</b> (thermometer)`:'Insert a thermometer to measure it.'}</div></div>`;
    if(it.on&&itemById(it.on)?.type==='crosspaper')h+=`<div class="sect"><h4>Looking down through the flask</h4><div data-live="cross">${crossView(v)}</div></div>`;
    h+=`<div class="sect"><h4>Solution data (teacher view)</h4>`;
    if(dataOK)h+=`<div data-live="data">${dataPanel(v)}</div>`;else h+=`<div class="lock">Hidden during this mission. In a real lab you only see what the chemicals do. Work it out from your observations!</div>`;
    h+=`</div>`;
    box.innerHTML=h;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const A=b.dataset.a;
      if(A==='shake')shake(it);if(A==='thermo'){it.thermo=!it.thermo;renderItem(it);renderInsp();if(it.thermo)emit({type:'thermo',vessel:it.id});}
      if(A==='rename'){const nm=promptInline(it);}
      if(A==='empty')emptyVessel(it);if(A==='del')removeItem(it);};
    return;
  }
  if(it.kind==='burette'){
    const f=flaskUnder(it);
    box.innerHTML=`<h3>Burette</h3><div class="sub">${it.chem?esc(it.chem.n)+' · '+esc(it.chem.conc||''):'Empty: drag a solution bottle onto it to rinse and fill.'}</div>
    <div class="row" style="align-items:flex-start;gap:12px"><div><div class="sub">Eye-level view</div><div data-live="zoom">${buretteZoom(it)}</div></div>
    <div style="flex:1"><div class="sub">Flask below: <b>${f?esc(f.label):'none (drag a conical flask under the tip)'}</b></div>
    <div class="stack" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
      <button class="btn sm" data-t="0.05">1 drop (0.05 cm³)</button><button class="btn sm" data-t="0.1">+0.10 cm³</button><button class="btn sm" data-t="1">+1.00 cm³</button><button class="btn sm" data-t="5">+5.00 cm³</button>
      <button class="btn sm pri" data-hold="1">Hold to open tap</button>
      <button class="btn sm" data-a="end">✓ Record end point</button></div></div></div>
    <div class="note info">Read the bottom of the meniscus at eye level, to 2 d.p. (e.g. 24.35 cm³).${it.chem&&(it.chem.real||it.chem.id)==='kmno4'?' For dark KMnO₄, read the <b>top</b> of the meniscus.':''} Add quickly at first, then drop by drop near the end point, swirling all the time.</div>`;
    box.onclick=e=>{const b=e.target.closest('[data-t]');if(b)tap(it,+b.dataset.t);if(e.target.closest('[data-a="end"]'))recordEndpoint(it);};
    const hb=$('[data-hold]',box);let iv=null;const stop=()=>{clearInterval(iv);iv=null;};
    hb.addEventListener('pointerdown',ev=>{ev.preventDefault();if(iv)return;iv=setInterval(()=>{if(tap(it,0.2)===false)stop();},120);});
    hb.addEventListener('pointerup',stop);hb.addEventListener('pointerleave',stop);
    return;
  }
  if(it.kind==='burner'){const on=attachedTo(it.id);box.innerHTML=`<h3>Bunsen burner</h3><div class="sub">${it.lit?'Lit: blue non-luminous flame (air hole open)':'Off'}</div><div class="row"><button class="btn sm pri" data-a="lit">${it.lit?'Turn off':'Light'}</button><button class="btn sm" data-a="del">Remove</button></div><div class="info"><p>Heating: ${on.map(o=>esc(o.label)).join(', ')||'nothing. Drag a container onto the burner.'}</p><p class="sub">Point the mouth of a test tube away from yourself and others. Heat gently and shake to avoid bumping.</p></div>`;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='lit'){it.lit=!it.lit;emit({type:'burner',lit:it.lit});renderItem(it);renderInsp();}if(b.dataset.a==='del')removeItem(it);};return;}
  if(it.kind==='bath'){box.innerHTML=`<h3>Water bath</h3><div class="sub" data-live="bath">${it.on?'On':'Off'} · ${it.T.toFixed(0)} °C</div><div class="row"><button class="btn sm pri" data-a="on">${it.on?'Switch off':'Switch on'}</button><button class="btn sm" data-a="del">Remove</button></div><div class="info"><p>Safe way to warm flammable liquids (ethanol, hexane) and for the iodoform, ester, Fehling's and ninhydrin tests.</p></div>`;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='on'){it.on=!it.on;renderInsp();}if(b.dataset.a==='del')removeItem(it);};return;}
  if(it.kind==='stopwatch'){box.innerHTML=`<h3>Stopwatch</h3><div class="readout mono" data-live="sw" style="font-size:26px">${it.t.toFixed(1)} s</div><div class="row"><button class="btn sm pri" data-a="go">${it.running?'Stop':'Start'}</button><button class="btn sm" data-a="reset">Reset</button><button class="btn sm" data-a="rec">Record time</button><button class="btn sm" data-a="del">Remove</button></div>`;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const A=b.dataset.a;if(A==='go')it.running=!it.running;if(A==='reset'){it.t=0;it.running=false;}if(A==='rec'){logRow(null,'Stopwatch time recorded',`t = ${it.t.toFixed(1)} s`,'');emit({type:'time',t:it.t});}if(A==='del')removeItem(it);renderItem(it);renderInsp();};return;}
  if(it.type==='crosspaper'){box.innerHTML=`<h3>White tile with a cross</h3><div class="info"><p>Stand a conical flask on the cross. Add the acid, start the stopwatch, and look down through the flask. Stop timing when you can no longer see the cross.</p></div><button class="btn sm" data-a="del">Remove</button>`;box.onclick=e=>{if(e.target.closest('[data-a="del"]'))removeItem(it);};}
}
function promptInline(it){const box=$('#insp');const h3=$('h3',box);h3.innerHTML=`<input class="cell" style="width:140px" value="${esc(it.label)}"> <button class="btn sm">OK</button>`;const inp=$('input',h3);inp.focus();inp.select();const ok=()=>{it.label=inp.value.trim().slice(0,14)||it.label;it.v.label=it.label;renderItem(it);renderInsp();};$('button',h3).onclick=ok;inp.onkeydown=e=>{if(e.key==='Enter')ok();};}
function describeLook(it,a){
  const v=it.v;const parts=[];
  if(v.vol<0.05&&!v.org&&!a.dry.length&&!a.metals.length)return 'Empty and clean.';
  if(v.vol>=0.05)parts.push(`About ${v.vol<2?v.vol.toFixed(1):Math.round(v.vol)} cm³ of ${a.name==='colourless'?'a colourless':(/^[aeiou]/.test(a.name)?'an ':'a ')+a.name} liquid`);
  for(const p of a.ppts){if(p.vis>0.08)parts.push(`${colName(p.rgb)} ${p.colloid?'cloudiness (fine suspension)':'precipitate'}`);}
  if(a.layer)parts.push(`an upper ${a.layer.name} organic layer (${v.org.toFixed(1)} cm³)`);
  for(const d of a.dry){const c=chemOf(d.id);parts.push(`${colName(d.rgb)} solid${c?` (${esc(c.n)})`:''}`);}
  for(const m of a.metals)parts.push(`${colName(m.rgb)} solid pieces`);
  if(a.ring)parts.push('a brown ring at the junction of the layers');
  if(a.gasesActive.filter(g=>g!=='H2O').length)parts.push('gas being evolved');
  if(a.steam)parts.push('boiling');
  return parts.join(', ')+'.';
}
function dataPanel(v){
  const d=v.d;if(!d)return '';const V=d.V;
  const rows=[];for(const k in d.free){const x=d.free[k];if(x<1e-6||['Hn'].includes(k)||/\(s\)$/.test(k))continue;const s=SPECIES[k];rows.push([s?s.f:k,(x/V).toPrecision(3)+' M']);}
  const pp=Object.keys(d.ppt).filter(k=>d.ppt[k]>1e-5).map(k=>[PPT[k]?PPT[k].n:k,d.ppt[k].toFixed(3)+' mmol']);
  const cp=Object.keys(d.cplx).filter(k=>d.cplx[k]>1e-6).map(k=>[k==='biuret'?'Cu²⁺–protein (biuret)':k==='Cu2+'?'[Cu(NH₃)₄]²⁺':k==='Zn2+'?'[Zn(NH₃)₄]²⁺':'[Ag(NH₃)₂]⁺',d.cplx[k].toFixed(3)+' mmol']);
  const ds=Object.keys(d.diss).filter(k=>d.diss[k]>1e-6).map(k=>[{'Al3+':'[Al(OH)₄]⁻','Zn2+':'[Zn(OH)₄]²⁻','Pb2+':'[Pb(OH)₄]²⁻','Cr3+':'[Cr(OH)₄]⁻'}[k]||k,d.diss[k].toFixed(3)+' mmol']);
  const gas=appearance(v).gasesActive.map(g=>GASES[g].f).join(', ');
  return `<dl class="kv"><dt>pH</dt><dd class="mono">${v.vol>0.05?d.pH.toFixed(2):'—'}</dd><dt>Temperature</dt><dd class="mono">${v.T.toFixed(1)} °C</dd><dt>Volume</dt><dd class="mono">${v.vol.toFixed(2)} cm³${v.org>0.01?` + ${v.org.toFixed(1)} organic`:''}</dd>${gas?`<dt>Gas evolved</dt><dd>${gas}</dd>`:''}</dl>
   ${rows.length?`<table class="sp">${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`:''}
   ${pp.length?`<div class="sub" style="margin-top:6px">Precipitates</div><table class="sp">${pp.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`:''}
   ${cp.length+ds.length?`<div class="sub" style="margin-top:6px">Complex ions</div><table class="sp">${cp.concat(ds).map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`:''}`;
}
function crossView(v){const S=(v.d&&v.d.ppt.S)||0;const turb=Math.min(1,S/Math.max(v.vol,1)/0.004);const a=appearance(v);
  return `<svg width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="#fff"/><g stroke="#111" stroke-width="9" stroke-linecap="round" opacity="${(1-0.97*turb).toFixed(2)}"><line x1="45" y1="45" x2="105" y2="105"/><line x1="105" y1="45" x2="45" y2="105"/></g><circle cx="75" cy="75" r="66" fill="rgba(240,232,170,${(turb*0.98).toFixed(3)})" stroke="#8399a2" stroke-width="3"/></svg><div class="sub">${turb>=0.99?'The cross can no longer be seen. Stop the clock!':turb>0.05?'The solution is turning cloudy (sulphur)…':'The cross is clearly visible.'}</div>`;}
function buretteZoom(b){
  const r=b.reading,K=56,cy=90;let z='';const c=b.chem?b.chem.bot:[220,230,235];const dark=b.chem&&(b.chem.real||b.chem.id)==='kmno4';
  if(b.chem){z+=`<rect x="20" y="${cy}" width="80" height="120" fill="${rgba(c,dark?.92:.4)}"/><path d="M20 ${cy-6} Q60 ${cy+5} 100 ${cy-6} L100 ${cy} L20 ${cy}Z" fill="${rgba(c,dark?.92:.4)}"/>`;}
  for(let k=Math.floor((r-1.8)*10);k<=Math.ceil((r+1.8)*10);k++){const v=k/10;if(v<0||v>50)continue;const y=cy+(v-r)*K+(b.chem?-0:0);if(y<0||y>180)continue;const len=k%10===0?34:(k%5===0?24:13);z+=`<line x1="20" x2="${20+len}" y1="${y}" y2="${y}" stroke="#222" stroke-width="${k%10===0?1.4:.9}"/>`;if(k%10===0)z+=`<text x="${24+len}" y="${y+4}" font-size="12" font-family="IBM Plex Mono" fill="#222">${v.toFixed(0)}</text>`;}
  z+=`<rect x="20" y="0" width="80" height="180" fill="none" stroke="#8399a2" stroke-width="2"/><line x1="2" x2="118" y1="${cy}" y2="${cy}" stroke="#d97706" stroke-dasharray="3 3" opacity=".55"/>`;
  return `<svg width="120" height="180" viewBox="0 0 120 180" style="background:#fbfcfc;border-radius:8px">${z}</svg>`;
}
function liveInsp(){
  const it=L.sel&&itemById(L.sel);if(!it)return;const box=$('#insp');
  const set=(k,h)=>{const el=$(`[data-live="${k}"]`,box);if(el&&el._h!==h){el.innerHTML=h;el._h=h;}};
  if(it.kind==='vessel'){const a=appearance(it.v);set('look',describeLook(it,a));set('temp',it.thermo?`<b class="mono">${it.v.T.toFixed(1)} °C</b> (thermometer)`:'Insert a thermometer to measure it.');set('data',dataPanel(it.v));set('cross',crossView(it.v));}
  if(it.kind==='burette')set('zoom',buretteZoom(it));
  if(it.kind==='stopwatch')set('sw',it.t.toFixed(1)+' s');
  if(it.kind==='bath')set('bath',`${it.on?'On':'Off'} · ${it.T.toFixed(0)} °C`);
}
function chemCard(c){
  const hz=(c.hz||[]).map(z=>`<span class="chip" style="background:${HZ[z][1]}">${HZ[z][0]}</span>`).join('');
  return `<h3>${esc(c.n)}</h3><div class="sub">${esc(c.f||'')}${c.conc?' · '+esc(c.conc):''}${c.st==='solid'?' · solid':c.st==='org'?' · organic liquid (immiscible with water)':' · solution'}</div>
  <div class="chips">${hz}</div><div class="info"><p><b>Uses:</b> ${esc(c.use||'')}</p>${c.rx?`<p><b>Key reactions:</b></p><div class="rx">${esc(c.rx)}</div>`:''}
  ${c.smell?`<p class="sub">Smell: ${esc(c.smell)}</p>`:''}<p class="sub">Drag this bottle onto a container on the bench${c.st==='sol'?' (or onto a burette to fill it)':''}.</p></div>`;
}

/* ---------- notebook ---------- */
function renderNB(){
  if(L.exam){EXAM.renderBooklet();return;}
  const t=L.nbtab||'obs';$$('#nbtabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const body=$('#nbbody');const exam=L.scen&&L.scen.data===false&&!L.revealed;
  if(t==='obs'){
    const keep=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('td.mine');if(keep&&body.contains(keep))return;
    body.innerHTML=`<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="sub">Each action is recorded as Test · Observation · Inference. Type your own inferences in the last column.</span><div class="row">${exam?`<button class="btn sm" id="reveal">Reveal model inferences</button>`:''}<button class="btn sm" id="copyobs">Copy table</button><button class="btn sm" id="clrobs">Clear</button></div></div>
    <div class="obswrap" id="nbobs"><table class="obs"><thead><tr><th style="width:24%">Test</th><th>Observation</th><th style="width:26%">Inference</th></tr></thead><tbody>${L.rows.length?L.rows.map(r=>`<tr><td>${esc(r.test)}</td><td>${esc(r.obs)}</td>${exam?`<td class="mine"><div contenteditable="true" data-r="${r.id}">${esc(r.mine)}</div></td>`:`<td class="inf">${esc(r.inf||'')}${r.mine?`<div class="sub">You: ${esc(r.mine)}</div>`:''}</td>`}</tr>`).join(''):`<tr><td colspan="3" class="sub">Your observations will appear here as you work.</td></tr>`}</tbody></table></div>`;
    $$('[contenteditable]',body).forEach(el=>el.addEventListener('input',()=>{const r=L.rows.find(x=>x.id===+el.dataset.r);if(r)r.mine=el.textContent;}));
    $('#reveal')?.addEventListener('click',()=>{L.revealed=true;renderNB();renderInsp();});
    $('#clrobs').onclick=()=>{L.rows=[];renderNB();};
    $('#copyobs').onclick=async()=>{const txt=['Test\tObservation\tInference',...L.rows.map(r=>`${r.test}\t${r.obs}\t${r.mine||r.inf||''}`)].join('\n');try{await navigator.clipboard.writeText(txt);mentor('Table copied: paste it into your practical notebook.');}catch(e){mentor('Copy not allowed here: select the table and copy it manually.','warn');}};
    const w=$('#nbobs');w.scrollTop=w.scrollHeight;
  }
  if(t==='tit'){
    body.innerHTML=`<div class="sub" style="margin-bottom:8px">Record the burette readings yourself (read the eye-level view in the Inspector). A rough titration plus at least two accurate titrations that agree within 0.20 cm³.</div>
    <div style="overflow:auto"><table class="obs" style="max-width:640px"><thead><tr><th>Burette reading (cm³)</th><th>Rough</th><th>1st</th><th>2nd</th><th>3rd</th></tr></thead><tbody>
    <tr><td>Final reading</td>${[0,1,2,3].map(i=>`<td><input class="cell" data-f="${i}" value="${esc(L.tt?.[i]?.f||'')}" inputmode="decimal"></td>`).join('')}</tr>
    <tr><td>Initial reading</td>${[0,1,2,3].map(i=>`<td><input class="cell" data-i="${i}" value="${esc(L.tt?.[i]?.i||'')}" inputmode="decimal"></td>`).join('')}</tr>
    <tr><td><b>Volume used</b></td>${[0,1,2,3].map(i=>`<td class="mono" data-v="${i}">—</td>`).join('')}</tr></tbody></table></div>
    <div class="row" style="margin-top:8px"><button class="btn sm" id="chkt">Check my readings</button><span class="sub">${L.runs.length} titration(s) recorded so far.</span></div><div class="note" id="ttfb"></div>`;
    const upd=()=>{L.tt=L.tt||[{},{},{},{}];for(let i=0;i<4;i++){const f=$(`[data-f="${i}"]`,body).value,n=$(`[data-i="${i}"]`,body).value;L.tt[i]={f,i:n};const vf=parseFloat(f),vi=parseFloat(n);$(`[data-v="${i}"]`,body).textContent=isFinite(vf)&&isFinite(vi)?f2(vf-vi):'—';}};
    $$('input',body).forEach(x=>x.addEventListener('input',upd));upd();
    $('#chkt').onclick=()=>{const fb=$('#ttfb');const out=[];let ok=true;L.runs.forEach((r,i)=>{if(i>3)return;const vf=parseFloat(L.tt[i].f),vi=parseFloat(L.tt[i].i);const a=Math.abs(vf-r.final)<0.026,b=Math.abs(vi-r.initial)<0.026;ok=ok&&a&&b;out.push(`${['Rough','1st','2nd','3rd'][i]}: initial ${b?'✓':`✗ (${f2(r.initial)})`}, final ${a?'✓':`✗ (${f2(r.final)})`}, titre ${f2(r.titre)} cm³`);});
      if(!out.length){fb.className='note warn';fb.textContent='No titrations recorded yet. Use “Record end point” in the burette Inspector.';return;}
      fb.className='note '+(ok?'good':'bad');fb.innerHTML=out.join('<br>');emit({type:'readings',ok});};
  }
  if(t==='rep')renderReport();
}
function renderReport(){
  const body=$('#nbbody');const s=L.scen;
  if(!s||!s.questions||!s.questions.length){body.innerHTML=`<div class="sub">Free lab has no questions. Pick a mission (top bar) for an assessed practical.</div>`;return;}
  body.innerHTML=`<div class="sub" style="margin-bottom:10px">Answer from your own results. Numerical answers are marked against <b>your</b> recorded data where relevant.</div>`+s.questions.map((q,i)=>{
    let inp='';if(q.type==='mcq')inp=q.opts.map((o,j)=>`<label><input type="radio" name="q${i}" value="${j}" ${L.answers[i]==j?'checked':''}> ${esc(o)}</label>`).join('');
    else inp=`<input type="number" step="any" data-q="${i}" value="${L.answers[i]??''}"> ${q.unit?`<span class="sub">${esc(q.unit)}</span>`:''}`;
    return `<div class="q"><p>${i+1}. ${q.q}</p>${inp}<div class="fb" id="fb${i}">${q.fb||''}</div></div>`;}).join('')+`<button class="btn pri" id="submitq">Submit answers</button>`;
  $$('input[type=radio]',body).forEach(r=>r.onchange=()=>{L.answers[+r.name.slice(1)]=r.value;});
  $$('input[type=number]',body).forEach(r=>r.oninput=()=>{L.answers[+r.dataset.q]=r.value;});
  $('#submitq').onclick=()=>{s.questions.forEach((q,i)=>{const a=L.answers[i];let ok=false,msg='';
      if(q.type==='mcq'){const ans=typeof q.ans==='function'?q.ans(L):q.ans;ok=a!=null&&+a===ans;msg=ok?'✓ Correct.':`✗ The answer is: ${esc(q.opts[ans])}.`;}
      else{const r=q.check(parseFloat(a),L);ok=r.ok;msg=(ok?'✓ ':'✗ ')+r.msg;}
      if(q.explain)msg+=` <span class="sub">${q.explain}</span>`;q.correct=ok;q.fb=`<span style="color:${ok?'var(--good)':'var(--bad)'}">${msg}</span>`;});
    renderReport();updateScore();emit({type:'submit'});mentor(`Report submitted. Score: ${L.scoreVal}/100.`);};
}

/* ---------- mission & scenario switching ---------- */
function catOf(t){t=(t||'').toLowerCase();return /mock|exam/.test(t)?'c-exam':/sandbox|free/.test(t)?'c-free':/qualitative/.test(t)?'c-qual':/quantitative/.test(t)?'c-quant':/organic/.test(t)?'c-org':'c-gen';}
function renderMission(){
  if(L.exam){EXAM.renderHeader();return;}
  const s=L.scen;const m=$('#mission');
  if(!s){m.innerHTML='';return;}
  m.className="mission "+catOf(s.tag);m.innerHTML=`<div><div class="tag">${esc(s.tag)}</div><h2>${esc(s.title)}</h2><div class="story">${s.story||(s.blurb?`<p>${s.blurb}</p>`:"")}</div></div><div><div class="tag">Objectives <em>${s.objectives.filter(o=>o.done).length} of ${s.objectives.length} done</em></div><div class="objs">${s.objectives.map(o=>`<div class="obj ${o.done?'done':''}"><i>${o.done?'✓':''}</i><span>${o.t}</span></div>`).join('')}</div></div>`;
}
function resetLab(){
  if(typeof EXAM!=='undefined')EXAM.stop();L.exam=null;$('#nbtabs').style.display='';delete $('#nbbody').dataset.ex;
  L.items.forEach(i=>$(`[data-id="${i.id}"]`)?.remove());
  L.items=[];L.sel=null;L.selStock=null;L.rows=[];L.events=[];L.runs=[];L.penalties=[];L.revealed=false;L.answers={};L.wire=null;L.tt=null;L.counters={};
}
function loadScenario(s){
  resetLab();VID=0;
  const ctx=s.make();L.scen={...s,...ctx,objectives:ctx.objectives.map(o=>({...o,done:false})),questions:(ctx.questions||[]).map(q=>({...q}))};
  L.stock=ctx.stock;L.glass=ctx.glass||GLASS.map(g=>g.id);L.tools=ctx.tools||TOOLS.map(t=>t.id);
  if(ctx.setup)ctx.setup();
  renderMission();renderStock();renderAll();renderInsp();L.nbtab='obs';renderNB();updateScore();
  mentor(ctx.hint||'Drag apparatus and chemicals onto the bench to begin.');L.scen.hint=ctx.hint;
  $('#scenmodal').hidden=true;try{localStorage.setItem('wassce-lab-scen',s.id);}catch(e){}
}
function openScenarios(){
  const box=$('#scenlist');box.innerHTML=SCENARIOS.map(s=>`<button class="scard ${catOf(s.tag)}" data-s="${s.id}"><span class="tag">${esc(s.tag)}</span><b>${esc(s.title)}</b><span>${esc(s.blurb)}</span><div class="pillrow">${(s.pills||[]).map(p=>`<span class="pill">${esc(p)}</span>`).join('')}</div></button>`).join('');
  $('#scenmodal').hidden=false;$$('.scard',box).forEach(b=>b.onclick=()=>loadScenario(SCENARIOS.find(s=>s.id===b.dataset.s)));
}

/* ---------- layout scale ---------- */
function fit(){const w=$('#benchscale').clientWidth;const s=Math.min(1.15,w/BW);L.scale=s;$('#bench').style.transform=`scale(${s})`;$('#benchscale').style.height=(BH*s)+'px';}

/* ---------- init ---------- */
function benchTap(e){if(e.target.closest('.item')||e.target.id==='bin')return;if(L.selStock&&(L.selKind==='glass'||L.selStock==='stopwatch')){drop({type:'stock',kind:L.selKind,id:L.selStock},null,e);L.selStock=null;renderStock();return;}if(L.sel){L.sel=null;renderAll();renderInsp();}}
function init(){
  $('#bench').addEventListener('click',benchTap);
  $$('.tabs#stabs button').forEach(b=>b.onclick=()=>{L.tab=b.dataset.t;$$('#stabs button').forEach(x=>x.classList.toggle('on',x===b));renderStock();});
  $('#ssearch').oninput=renderStock;
  $$('#nbtabs button').forEach(b=>b.onclick=()=>{L.nbtab=b.dataset.t;renderNB();});
  $('#btnscen').onclick=openScenarios;$('#closescen').onclick=()=>{$('#scenmodal').hidden=true;};
  $('#btnhelp').onclick=()=>{$('#helpmodal').hidden=false;};$('#closehelp').onclick=()=>{$('#helpmodal').hidden=true;};
  $('#speed').onchange=e=>{L.speed=+e.target.value;};
  $('#btnclear').onclick=e=>{const b=e.currentTarget;if(L.exam&&L.exam.started&&!L.exam.submitted&&!b._armed){b._armed=true;b.textContent='Abandon this paper? Click again';setTimeout(()=>{b._armed=false;b.textContent='↺ Restart mission';},3500);return;}b._armed=false;b.textContent='↺ Restart mission';const s=SCENARIOS.find(x=>x.id===L.scen.id);loadScenario(s);};
  window.addEventListener('resize',fit);fit();
  let first='free';try{first=localStorage.getItem('wassce-lab-scen')||'';}catch(e){}
  const s=SCENARIOS.find(x=>x.id===first);
  if(s)loadScenario(s);else{loadScenario(SCENARIOS.find(x=>x.id==='free'));openScenarios();}
  setInterval(loop,200);
}
