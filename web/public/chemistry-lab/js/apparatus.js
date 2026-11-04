/* =========================================================
   Extra apparatus: balance, volumetric flask, filter funnel,
   evaporating dish, melting-point apparatus, pH chart
   ========================================================= */
"use strict";
Object.assign(VCAP,{volflask:250,dish:60});
Object.assign(SIZE,{volflask:[110,210],dish:[120,60],balance:[140,90],funnel:[90,90],mpapp:[150,210]});
Object.assign(GEO,{
  volflask:{W:110,H:210,path:'M47 6 L47 112 C14 122 6 160 14 186 Q20 202 40 202 L70 202 Q90 202 96 186 C104 160 96 122 63 112 L63 6',bot:202,top:60,L:12,R:98},
  dish:{W:120,H:60,path:'M4 10 Q60 76 116 10',bot:43,top:12,L:22,R:98},
});
const _liqY=liqY;
liqY=function(g,type,vol){
  if(type==='volflask'){if(vol<=230)return 202-90*Math.pow(vol/230,0.85);return 112-(Math.min(vol,262)-230)/20*52;}
  if(type==='dish'){const f=Math.min(1,vol/60);return 43-31*Math.sqrt(f);}
  return _liqY(g,type,vol);
};

/* ---------- drawings ---------- */
function drawBalance(it){
  const ld=it.load;const m=ld?ld.mass:0;const disp=(m-(it.tare||0)).toFixed(2);
  let s=`<rect x="6" y="52" width="128" height="34" rx="6" fill="#e9ecee" stroke="#9aa6ab"/><rect x="18" y="60" width="62" height="18" rx="3" fill="#1f2a2e"/><text x="74" y="74" font-family="IBM Plex Mono" font-size="13" text-anchor="end" fill="#7cf0c8">${disp} g</text>`;
  s+=`<rect x="94" y="62" width="10" height="12" rx="2" fill="#c7cdd0"/><rect x="110" y="62" width="10" height="12" rx="2" fill="#c7cdd0"/>`;
  s+=`<rect x="64" y="40" width="12" height="12" fill="#b9c1c5"/><ellipse cx="70" cy="40" rx="52" ry="7" fill="#dfe4e6" stroke="#9aa6ab"/>`;
  s+=`<path d="M44 37 L50 26 L90 26 L96 37 Z" fill="#fff" stroke="#b8c0c4"/>`;
  if(ld&&ld.mass>0){const c=(chemById(ld.chem)||{}).solid||[250,250,250];const h=Math.min(12,3+ld.mass*3);s+=`<path d="M52 33 Q70 ${33-h} 88 33 Z" fill="${rgba(c,1)}" stroke="rgba(0,0,0,.15)"/>`;}
  return `<svg width="140" height="90" viewBox="0 0 140 90">${s}</svg>`;
}
function drawFunnel(it){
  let s=`<path d="M4 6 L86 6 L50 52 L50 88 L40 88 L40 52 Z" fill="rgba(235,245,250,.55)" stroke="#8399a2" stroke-width="2"/>`;
  s+=`<path d="M12 9 L78 9 L45 50 Z" fill="#fbfaf6" stroke="#d8d2c4"/>`;
  if(it.residue&&it.residue.length){let y=44;for(const r of it.residue){const c=PPT[r.key]?PPT[r.key].c:[200,200,200];const h=Math.min(12,3+r.amt*4);s+=`<path d="M${45-h} ${y-h*0.6} Q45 ${y+2} ${45+h} ${y-h*0.6} Z" fill="${rgba(c,1)}"/>`;y-=h*0.6;}}
  if(it.wet&&performance.now()<it.wet)s+=`<circle class="drip" cx="45" cy="90" r="2.4" fill="rgba(160,200,230,.9)"/>`;
  return `<svg width="90" height="90" viewBox="0 0 90 90" style="overflow:visible">${s}</svg>`;
}
function drawMP(it){
  const c=it.sample&&chemById(it.sample);const f=c&&c.mp?Math.max(0,Math.min(1,(it.T-c.mp[0])/(c.mp[1]-c.mp[0]))):0;
  let s=`<path d="M40 30 L40 150 Q40 172 75 172 Q110 172 110 150 L110 30" fill="rgba(240,225,160,.45)" stroke="#8399a2" stroke-width="2"/><rect x="40" y="60" width="70" height="110" fill="rgba(235,205,110,.35)"/>`;
  s+=`<rect x="70" y="0" width="7" height="160" rx="3.5" fill="#fff" stroke="#9aa"/><circle cx="73.5" cy="160" r="6" fill="#d33"/><rect x="72" y="${160-140*Math.min(1,(it.T-0)/250)}" width="3" height="${140*Math.min(1,(it.T)/250)}" fill="#d33"/>`;
  s+=`<rect x="82" y="40" width="4" height="122" fill="rgba(255,255,255,.8)" stroke="#9aa" stroke-width=".8"/>`;
  if(c)s+=`<rect x="82.5" y="148" width="3" height="12" fill="${f>=1?'rgba(250,250,240,.25)':`rgba(250,250,248,${(1-f*0.85).toFixed(2)})`}" stroke="${f>0&&f<1?'#c89a3a':'none'}" stroke-width=".6"/>`;
  s+=`<rect x="18" y="182" width="114" height="10" rx="3" fill="#59626a"/>`;
  if(it.heating)s+=`<path class="flame" d="M66 182 Q64 172 75 160 Q86 172 84 182 Z" fill="rgba(80,130,255,.6)"/>`;
  s+=`<g transform="translate(96,6)"><rect width="52" height="18" rx="5" fill="#fff" stroke="#c9d3d0"/><text x="26" y="13" font-size="11" text-anchor="middle" font-family="IBM Plex Mono">${it.T.toFixed(1)}°C</text></g>`;
  return `<svg width="150" height="210" viewBox="0 0 150 210">${s}</svg>`;
}
const _drawItem=drawItem;
drawItem=function(it){if(it.kind==='balance')return drawBalance(it);if(it.kind==='funnel')return drawFunnel(it);if(it.kind==='mp')return drawMP(it);return _drawItem(it);};
const _itemLabel=itemLabel;
itemLabel=function(it){if(it.kind==='balance')return 'Balance';if(it.kind==='funnel')return '';if(it.kind==='mp')return it.sample?`M.p.: ${chemById(it.sample).short||chemById(it.sample).n}`:'Melting point';return _itemLabel(it);};
const _zOf=zOf;zOf=function(it){if(it.kind==='funnel')return 9;if(it.kind==='balance'||it.kind==='mp')return 4;return _zOf(it);};

/* ---------- placement ---------- */
const _placeOn=placeOn;
placeOn=function(v,host){if(v.kind==='funnel'){v.on=host.id;v.x=host.x+host.w/2-45;v.y=host.y+(host.type==='flask'||host.type==='volflask'?-62:host.type==='beaker'?-40:-60);renderItem(v);return;}_placeOn(v,host);};
const _attachTry=attachTry;
attachTry=function(it,t){
  if(it.kind==='funnel'){if(t.kind==='vessel'&&['beaker','flask','volflask','tube','btube','dish'].includes(t.type)){placeOn(it,t);emit({type:'funnel',vessel:t.id});return true;}return false;}
  if(it.kind==='vessel'&&it.type==='volflask'&&t.kind==='burner'){mentor('Never heat a volumetric flask: it would lose its accuracy.','warn');return false;}
  return _attachTry(it,t);
};

/* ---------- drop handling extensions ---------- */
const _drop=drop;
drop=function(src,t,e){
  if(src.type==='stock'&&src.kind==='glass'&&['balance','funnel','mpapp'].includes(src.id)){
    if(!overBench(e))return;const p=benchPt(e);const [w,h]=SIZE[src.id];const kind={balance:'balance',funnel:'funnel',mpapp:'mp'}[src.id];
    const it=addItem(kind,src.id,Math.max(0,Math.min(BW-w,p.x-w/2)),Math.max(0,Math.min(BH-h,p.y-h/2)));
    if(kind==='funnel'&&t&&t.kind==='vessel')attachTry(it,t);
    L.sel=it.id;renderAll();renderInsp();emit({type:'place',glass:src.id});return;}
  if(src.type==='stock'&&src.kind==='chem'){const chem=chemById(src.id);
    if(t&&t.kind==='balance'){if(chem.st!=='solid')return mentor('Only solids are weighed on the balance.','warn');return weighMenu(t,chem,e);}
    if(t&&t.kind==='mp'){if(!chem.mp)return mentor('Load a solid with a measurable melting point (naphthalene, benzoic acid…).','warn');t.sample=chem.id;t.T=AMB;t.heating=false;t.rec=[];renderItem(t);L.sel=t.id;renderInsp();logRow(null,`Capillary tube loaded with ${chem.n}`,'A small amount of the dry solid is packed into a sealed capillary tube.','');emit({type:'mpload',chem:chem.id});return;}
    if(t&&t.kind==='funnel'){return mentor('Pour mixtures into the funnel from a beaker or test tube (drag the container onto the funnel).','warn');}
    if(t&&t.kind==='vessel'&&t.type==='volflask'&&chem.id==='water')return volMenu(t,chem,e);}
  if(src.type==='tool'&&false){}
  if(src.type==='item'){const it=src.it;
    if(it.kind==='balance'&&t&&t.kind==='vessel')return tipBalance(it,t);
    if(it.kind==='funnel'){if(t&&t.kind==='vessel'&&attachTry(it,t))return;it.on=null;renderItem(it);return;}
    if(it.kind==='vessel'&&t&&t.kind==='funnel'){restoreDrag(it);return filterMenu(it,t,e);}
  }
  return _drop(src,t,e);
};
function weighMenu(b,chem,e){
  if(b.load&&b.load.chem!==chem.id&&b.load.mass>0)return mentor('Empty the balance (tip out the solid or clear it) before weighing a different solid.','warn');
  const opts=[0.01,0.05,0.10,0.50,1.00].map(m=>({label:`Add ${m.toFixed(2)} g`,fn:()=>{b.load={chem:chem.id,mass:Math.round(((b.load?b.load.mass:0)+m)*100)/100};renderItem(b);liveInsp();}}));
  if(b.load&&b.load.mass>0)opts.push({label:'Remove 0.05 g',fn:()=>{b.load.mass=Math.max(0,Math.round((b.load.mass-0.05)*100)/100);renderItem(b);liveInsp();}});
  showMenu(e,`Weigh ${esc(chem.n)}${chem.M?` (M = ${chem.M} g mol⁻¹)`:''}`,opts);
  L.sel=b.id;renderInsp();
}
function tipBalance(b,it){
  if(!b.load||b.load.mass<=0)return mentor('Nothing on the balance. Drop a solid bottle onto the balance first.','warn');
  const chem=chemById(b.load.chem);const m=b.load.mass;const per=chem.per||chem.comp[Object.keys(chem.comp)[0]]||1;const M=chem.M||100;
  const factor=(m/M*1000)/per;const v=it.v;const before=snap(v),ev=[],T0=v.T;
  addSolid(v,chem,factor,ev);equilibrate(v,ev);settle(it,ev);
  if(it.type==='cup'){it.mixT0=T0;it.maxT=v.T;it.minT=v.T;}
  const d=describe(before,snap(v),ev,{reagent:chem.n});
  logRow(it,`${m.toFixed(2)} g of ${chem.n} (weighed) added to ${it.label}`,d.obs,d.inf);it.lastSnap=snap(v);
  it.hist=[...(it.hist||[]),chem.id];emit({type:'add',chem:chem.real||chem.id,stock:chem.id,vessel:it.id,amt:m,weighed:true,mass:m,contents:[...it.hist]});
  emit({type:'weigh',chem:chem.id,mass:m,vessel:it.id});
  b.load=null;renderItem(b);renderItem(it);handleSafety(ev);if(L.sel===b.id)renderInsp();
}
function volMenu(it,chem,e){
  const left=250-it.v.vol;
  const opts=[];if(left>60)opts.push({label:'50 cm³ (rough fill)',fn:()=>addChem(it,chem,50,'50 cm³')});
  if(left>5)opts.push({label:'Fill to just below the mark',fn:()=>addChem(it,chem,Math.max(0,left-1.5),`${(left-1.5).toFixed(1)} cm³`)});
  if(left>0.01)opts.push({label:'Add dropwise to the mark (250.0 cm³)',sub:'bottom of meniscus on the line',fn:()=>{addChem(it,chem,left,'dropwise to the mark');it.v.flags.toMark=true;it.v.flags.mixed=false;logRow(it,`${it.label}: made up to the 250.0 cm³ mark`,'The bottom of the meniscus sits on the graduation mark.','');emit({type:'tomark',vessel:it.id});}});
  if(left<=0.01)return mentor('The flask is already at (or above) the mark.','warn');
  showMenu(e,`Distilled water → ${esc(it.label)} (${it.v.vol.toFixed(1)} cm³ now)`,opts);
}
function filterMenu(src,f,e){
  const host=f.on&&itemById(f.on);if(!host)return mentor('Put the filter funnel into a beaker or flask first (drag the funnel onto it).','warn');
  if(src.v.vol+src.v.org<0.05)return mentor(`${src.label} is empty.`,'warn');
  showMenu(e,`Filter ${esc(src.label)} through the funnel into ${esc(host.label)}`,[{label:'Pour everything through the filter paper',fn:()=>filterInto(src,f,host)}]);
}
function filterInto(src,f,host){
  const v=src.v;equilibrate(v);const d=v.d;const res=[];
  for(const k in d.ppt){const amt=d.ppt[k];if(amt>1e-7){removeSolid(v,k,amt);res.push({key:k,amt});}}
  for(const k in d.metals){const amt=d.metals[k];removeSolid(v,k,amt);}
  f.residue=f.residue||[];for(const r of res){const ex=f.residue.find(x=>x.key===r.key);if(ex)ex.amt+=r.amt;else f.residue.push({...r});}
  f.wet=performance.now()+1500;
  const before=snap(host.v),ev=[];transfer(v,host.v,v.vol+v.org,ev);equilibrate(v);equilibrate(host.v,ev);
  const after=snap(host.v);
  const resTxt=res.length?res.map(r=>`${colName(PPT[r.key]?PPT[r.key].c:[200,200,200])} ${PPT[r.key]&&PPT[r.key].cryst?'crystals':'solid'}`).join(' and '):'nothing';
  logRow(host,`${src.label} filtered into ${host.label}`,`Residue on the filter paper: ${resTxt}. Filtrate: ${after.name==='colourless'?'a colourless':(/^[aeiou]/.test(after.name)?'an ':'a ')+after.name} solution.`,res.length?`Insoluble ${res.map(r=>PPT[r.key]?PPT[r.key].n:r.key).join(', ')} separated from the solution`:'');
  host.hist=[...(host.hist||[]),...(src.hist||[])];host.lastSnap=after;src.lastSnap=snap(v);
  renderItem(src);renderItem(host);renderItem(f);emit({type:'filter',from:src.id,to:host.id,residue:res.map(r=>r.key),fromType:src.type,hot:v.T>50||src.T>50});
}
function residueTo(f,target){
  if(!f.residue||!f.residue.length)return mentor('There is no residue on the filter paper.','warn');
  const before=snap(target.v),ev=[];for(const r of f.residue)restoreSolid(target.v,r.key,r.amt);
  equilibrate(target.v,ev);const d=describe(before,snap(target.v),ev,{});
  logRow(target,`Residue scraped from the filter paper into ${target.label}`,d.obs,d.inf);emit({type:'residue',to:target.id,keys:f.residue.map(r=>r.key),washed:!!f.washed,dried:!!f.dried});
  f.residue=[];f.washed=false;f.dried=false;target.lastSnap=snap(target.v);renderItem(f);renderItem(target);renderInsp();
}

/* ---------- melting point apparatus tick ---------- */
function mpTick(dt){
  for(const it of L.items){if(it.kind!=='mp')continue;
    if(it.heating){it.T=Math.min(250,it.T+(it.rate||1)*dt);}else if(it.T>AMB){it.T+=(AMB-it.T)*Math.min(1,dt/120);}
    const c=it.sample&&chemById(it.sample);if(c&&c.mp){const f=(it.T-c.mp[0])/(c.mp[1]-c.mp[0]);const st=f<=0?0:f>=1?2:1;if(it._st!==st){if(it._st!=null&&it.heating)logRow(null,`Melting point: ${c.short||c.n}`,st===1?'The solid in the capillary begins to soften and liquid appears.':st===2?'The solid has melted completely to a clear liquid.':'The liquid solidifies again.','');it._st=st;}}
    it.hist=(it.hist||[]);if(it.heating&&(!it.hist.length||SIMT-it.hist[it.hist.length-1][0]>=2))it.hist.push([SIMT,it.T]);if(it.hist.length>400)it.hist.shift();
  }
}
const _loop=loop;
loop=function(){mpTick(0.2*L.speed);for(const it of vessels()){if(it.type==='cup'&&it.minT!=null)it.minT=Math.min(it.minT,it.v.T);if(it.v.T>=99&&it.v.vol>0.3&&!(it.hist||[]).includes('boiled'))it.hist=[...(it.hist||[]),'boiled'];if(it.type==='dish'&&it.v.flags.dried&&!it._dw&&(it.hist||[]).includes('s_cuso4imp')){it._dw=1;mentor('You evaporated the solution to dryness! The crystals lose their water of crystallisation and impurities are left in them. Stop heating at the crystallisation point next time.','warn');}}_loop();};

/* ---------- inspector extensions ---------- */
function phChart(last){let s='';for(let p=1;p<=14;p++){const c=IND_COL.UI(p);s+=`<g><rect x="${(p-1)*19}" y="0" width="18" height="22" rx="3" fill="${rgba(c,1)}"/><text x="${(p-1)*19+9}" y="34" font-size="10" text-anchor="middle" fill="#445">${p}</text></g>`;}
  return `<svg width="266" height="40" viewBox="0 0 266 40">${s}</svg>${last?`<div class="row" style="margin-top:4px"><span class="sub">Your last test paper:</span><span style="display:inline-block;width:42px;height:18px;border-radius:4px;background:${rgba(last,1)};border:1px solid #0002"></span><span class="sub">Match it to the chart.</span></div>`:''}`;}
const _renderInsp=renderInsp;
renderInsp=function(){
  const it=L.sel&&itemById(L.sel);const box=$('#insp');
  if(it&&it.kind==='balance'){const ld=it.load;const c=ld&&chemById(ld.chem);
    box.innerHTML=`<h3>Electronic balance</h3><div class="sub">Reads to 0.01 g</div><div class="look" data-live="bal"><b class="mono" style="font-size:22px">${ld?ld.mass.toFixed(2):'0.00'} g</b>${c?` of ${esc(c.n)}${c.M?` · M = ${c.M} g mol⁻¹`:''}`:''}</div>
    <div class="info"><p>Drop a <b>solid bottle</b> onto the balance to add solid to the weighing boat (choose the amount). Then drag the <b>balance</b> onto a beaker or cup to tip the weighed solid in.</p></div><div class="row"><button class="btn sm" data-a="clr">Clear (return solid)</button><button class="btn sm" data-a="del">Remove</button></div>`;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='clr'){it.load=null;renderItem(it);renderInsp();}if(b.dataset.a==='del')removeItem(it);};return;}
  if(it&&it.kind==='funnel'){const host=it.on&&itemById(it.on);const tgts=vessels().filter(v=>v.id!==(host&&host.id));
    box.innerHTML=`<h3>Filter funnel</h3><div class="sub">${host?`Sitting in ${esc(host.label)}`:'Not in a container: drag it onto a beaker or flask'}</div>
    <div class="look">Residue: ${it.residue&&it.residue.length?it.residue.map(r=>`${esc(PPT[r.key]?PPT[r.key].n:r.key)} (${colName(PPT[r.key]?PPT[r.key].c:[200,200,200])})`).join(', '):'none'}${it.washed?' · washed':''}${it.dried?' · dried':''}</div>
    <div class="row"><button class="btn sm" data-a="wash">Wash residue with distilled water</button><button class="btn sm" data-a="dry">Dry residue between filter papers</button></div>
    <div class="row" style="margin-top:8px"><select id="restgt" class="btn sm">${tgts.map(v=>`<option value="${v.id}">${esc(v.label)}</option>`).join('')}</select><button class="btn sm" data-a="tip">Scrape residue into it</button><button class="btn sm" data-a="del">Remove</button></div>
    <div class="info"><p>Drag a container onto the funnel to filter its contents. Insoluble solids and crystals stay on the paper; the solution (filtrate) runs into the container below.</p></div>`;
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const A=b.dataset.a;
      if(A==='wash'){if(it.residue&&it.residue.length){it.washed=true;logRow(null,'Residue washed with a little cold distilled water','Soluble impurities are washed through the paper.','');emit({type:'wash'});}renderInsp();}
      if(A==='dry'){if(it.residue&&it.residue.length){it.dried=true;logRow(null,'Residue pressed dry between filter papers',`Dry ${it.residue.map(r=>colName(PPT[r.key]?PPT[r.key].c:[200,200,200])+' '+(PPT[r.key]&&PPT[r.key].cryst?'crystals':'solid')).join(', ')}.`,'');emit({type:'dry',keys:it.residue.map(r=>r.key)});}renderInsp();}
      if(A==='tip'){const t=itemById($('#restgt').value);if(t)residueTo(it,t);}
      if(A==='del')removeItem(it);};return;}
  if(it&&it.kind==='mp'){const c=it.sample&&chemById(it.sample);
    box.innerHTML=`<h3>Melting-point apparatus</h3><div class="sub">${c?`Capillary: ${esc(c.n)}`:'Drop a solid bottle onto it to load a capillary tube.'}</div>
    <div class="look" data-live="mp">${mpLook(it)}</div>
    <div class="row"><button class="btn sm pri" data-a="heat">${it.heating?'Stop heating':'Start heating'}</button><select class="btn sm" id="mprate"><option value="5" ${it.rate==5?'selected':''}>Fast (5 °C/s)</option><option value="1" ${(it.rate||1)==1?'selected':''}>Slow (1 °C/s)</option><option value="0.3" ${it.rate==0.3?'selected':''}>Very slow near m.p. (0.3 °C/s)</option></select></div>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-a="s">Record: starts to melt</button><button class="btn sm" data-a="e">Record: completely melted</button><button class="btn sm" data-a="cool">Cool & reset</button></div>
    <div class="sect"><h4>Heating curve</h4><div data-live="mpg">${mpGraph(it)}</div></div>
    <div class="note info">Heat quickly to about 10 °C below the expected melting point, then slowly (1 °C per minute in a real lab). A pure substance melts sharply (range under 1 °C); an impure one melts lower and over a wider range.</div>`;
    $('#mprate').onchange=e=>{it.rate=+e.target.value;};
    box.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const A=b.dataset.a;
      if(A==='heat'){if(!c)return mentor('Load a sample first.','warn');it.heating=!it.heating;it.rate=+$('#mprate').value;renderItem(it);renderInsp();emit({type:'mpheat'});}
      if(A==='s'||A==='e'){if(!c)return;const T=Math.round(it.T*10)/10;logRow(null,`${c.short||c.n}: ${A==='s'?'melting begins':'completely melted'}`,`Thermometer reading: ${T.toFixed(1)} °C`,'');emit({type:'mp',which:A,T,chem:c.id,real:c.real||c.id});mentor(`Recorded ${A==='s'?'start':'end'} of melting at ${T.toFixed(1)} °C.`);}
      if(A==='cool'){it.heating=false;it.T=AMB;it.hist=[];it._st=null;renderItem(it);renderInsp();}};return;}
  _renderInsp();
  if(it&&it.kind==='vessel'){const sect=document.createElement('div');sect.className='sect';sect.innerHTML=`<h4>Universal indicator colour chart (pH)</h4>${phChart(it.lastPaper)}`;
    const t=$('.sect',box);if(t)box.insertBefore(sect,t.nextSibling);else box.appendChild(sect);
    if(it.type==='volflask'){const n=document.createElement('div');n.className='note info';n.innerHTML=`Volume: <b>${it.v.vol.toFixed(1)} cm³</b>${it.v.flags.toMark?' (at the mark)':''}${it.v.flags.mixed?' · mixed':''}. Fill to just below the mark, then add water dropwise until the bottom of the meniscus is on the line. Stopper and invert several times to mix (Shake / swirl).`;box.appendChild(n);}}
  if(it&&it.kind==='burette'){const f=flaskUnder(it);if(f){const r=document.createElement('div');r.className='row';r.style.marginTop='8px';r.innerHTML=`<button class="btn sm" id="bshake">Stopper & shake ${esc(f.label)} (test for lather)</button>`;box.appendChild(r);$('#bshake').onclick=()=>shake(f);}}
};
function mpLook(it){const c=it.sample&&chemById(it.sample);if(!c)return 'No sample loaded.';const f=(it.T-c.mp[0])/(c.mp[1]-c.mp[0]);
  return `Temperature: <b class="mono">${it.T.toFixed(1)} °C</b>${it.heating?` · heating at ${it.rate||1} °C/s`:''}<br>Sample: ${f<=0?'white solid':f<1?'<b>melting</b>: solid and liquid present':'clear liquid'}`;}
function mpGraph(it){const h=it.hist||[];if(h.length<2)return '<div class="sub">Start heating to plot temperature against time.</div>';
  const t0=h[0][0],t1=h[h.length-1][0];const W=260,H=120;const px=t=>30+(t-t0)/Math.max(1,t1-t0)*(W-40),py=T=>H-18-(T-20)/(Math.max(...h.map(x=>x[1]))-20+5)*(H-30);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line x1="30" y1="${H-18}" x2="${W-8}" y2="${H-18}" stroke="#9aa"/><line x1="30" y1="6" x2="30" y2="${H-18}" stroke="#9aa"/><polyline fill="none" stroke="#0e6d64" stroke-width="2" points="${h.map(x=>`${px(x[0]).toFixed(1)},${py(x[1]).toFixed(1)}`).join(' ')}"/><text x="${W/2}" y="${H-3}" font-size="10" text-anchor="middle" fill="#556">time</text><text x="2" y="12" font-size="10" fill="#556">°C</text></svg>`;}
const _liveInsp=liveInsp;
liveInsp=function(){_liveInsp();const it=L.sel&&itemById(L.sel);if(!it)return;const box=$('#insp');const set=(k,h)=>{const el=$(`[data-live="${k}"]`,box);if(el&&el._h!==h){el.innerHTML=h;el._h=h;}};
  if(it.kind==='mp'){set('mp',mpLook(it));set('mpg',mpGraph(it));}
  if(it.kind==='balance'){const ld=it.load;const c=ld&&chemById(ld.chem);set('bal',`<b class="mono" style="font-size:22px">${ld?ld.mass.toFixed(2):'0.00'} g</b>${c?` of ${esc(c.n)}${c.M?` · M = ${c.M} g mol⁻¹`:''}`:''}`);}};

/* ---------- tool hooks ---------- */
const _useTool=useTool;
useTool=function(it,tool){
  if(tool==='uipaper'||tool==='colorimeter'){const r=toolTest(it.v,tool);it.fx={vis:r.vis,until:performance.now()+3200};renderItem(it);setTimeout(()=>renderItem(it),3300);
    if(tool==='uipaper'){it.lastPaper=r.vis.paper;if(L.sel===it.id)renderInsp();}
    let kA=null;if(tool==='colorimeter'&&r.vis.A!=null){const V=it.v.vol;const F=(it.v.c['Fe3+']||0)/V,Sc=(it.v.c['SCN-']||0)/V;const x=r.vis.A/4700;if(F>x&&Sc>x)kA=x/((F-x)*(Sc-x));}
    logRow(it,`${it.label}: ${TL[tool].n}`,r.obs,r.inf,{tool:true});emit({type:'tool',tool,vessel:it.id,gases:[],result:r.obs,A:r.vis.A,kA,T:it.v.T,pH:it.v.d?it.v.d.pH:null});return;}
  return _useTool(it,tool);
};
const _shake=shake;
shake=function(it){it.v.flags.shook=SIMT;if(it.type==='volflask'&&it.v.flags.toMark){it.v.flags.mixed=true;emit({type:'invert',vessel:it.id});}
  const v=it.v;const before=snap(v);if(v.flags.ring)v.flags.ring=false;const ev=[];equilibrate(v,ev);settle(it,ev);
  const d=describe(before,snap(v),ev,{shake:true});logRow(it,`${it.label} ${it.type==='volflask'?'stoppered and inverted':'shaken'}`,d.obs==='No visible change.'?'Contents mixed; no further change.':d.obs,d.inf);it.lastSnap=snap(v);renderItem(it);
  emit({type:'shake',vessel:it.id,lather:appearance(v).foam});};

/* ---------- pour menu: add pipette option ---------- */
const _pourMenu=pourMenu;
pourMenu=function(src,dst,e){
  const tot=src.v.vol+src.v.org;if(tot>=25&&appearance(src.v).gasesActive.filter(g=>g!=='H2O').length===0){
    const opts=[{label:'Pipette 25.0 cm³',sub:'(pipette with filler)',fn:()=>{pour(src,dst,25);emit({type:'pipette',from:src.id,to:dst.id});}}];
    for(const a of [1,5,10,50])if(a<tot)opts.push({label:`Pour about ${a} cm³`,fn:()=>pour(src,dst,a)});opts.push({label:`Pour all (${tot.toFixed(1)} cm³)`,fn:()=>pour(src,dst,tot)});
    if(dst.type==='volflask'&&dst.v.vol+tot>250.01){mentor('That would overfill the volumetric flask past the mark.','warn');}
    return showMenu(e,`${esc(src.label)} → ${esc(dst.label)}`,opts);}
  return _pourMenu(src,dst,e);
};

/* ---------- foam drawing (lather) ---------- */
const _drawVessel=drawVessel;
drawVessel=function(it){let svg=_drawVessel(it);const a=appearance(it.v);
  if(a.foam&&it.v.vol>0.3){const g=GEO[it.type];const y=liqY(g,it.type,it.v.vol+it.v.org);let f='';const R=seeded(it.id+'f');for(let i=0;i<16;i++)f+=`<circle cx="${g.L+4+R()*(g.R-g.L-8)}" cy="${y-2-R()*10}" r="${2+R()*3}" fill="rgba(255,255,255,.95)" stroke="rgba(0,0,0,.08)"/>`;svg=svg.replace('</svg>',`<g>${f}</g></svg>`);}
  if(it.type==='volflask')svg=svg.replace('</svg>','<line x1="44" x2="66" y1="60" y2="60" stroke="#334" stroke-width="1.4"/><text x="70" y="63" font-size="8" fill="#556">250 cm³</text></svg>');
  if(a.ppts.some(p=>p.cryst)){const g=GEO[it.type];const R=seeded(it.id+'c');let c='';for(const p of a.ppts.filter(p=>p.cryst)){for(let i=0;i<Math.min(18,4+p.amt*6);i++){const x=g.L+4+R()*(g.R-g.L-8),y=g.bot-4-R()*8;c+=`<path d="M${x} ${y-4} L${x+3} ${y} L${x} ${y+4} L${x-3} ${y} Z" fill="${rgba(p.rgb,1)}" stroke="rgba(255,255,255,.6)" stroke-width=".6"/>`;}}svg=svg.replace('</svg>',`<g>${c}</g></svg>`);}
  return svg;};
