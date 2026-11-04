/* =========================================================
   Reaction engine: equilibria, precipitation, complexes,
   redox, kinetics, gases, heat, appearance & observations
   ========================================================= */
"use strict";
const KC={w:1e-14,NH4:5.62e-10,HAc:1.8e-5,C1:4.47e-7,C2:4.69e-11,S1:1.4e-2,S2:6.3e-8};
const VESSEL_C={tube:8,btube:12,beaker:60,flask:70,cup:3,burette:20,volflask:80,dish:90};
const BURNER_P={tube:70,btube:90,beaker:260,flask:260,cup:0,dish:200,volflask:0};
const COOL_TAU={tube:90,btube:110,beaker:320,flask:300,cup:1600,dish:40,volflask:400};
let SIMT=0; // simulation clock (s)

/* ---------- pH solver (proton condition) ---------- */
function protonExcess(h,t){
  let s=h-KC.w/h;
  if(t.NH)s+=t.NH*h/(h+KC.NH4);
  if(t.Ac)s+=t.Ac*h/(h+KC.HAc);
  if(t.C){const D=h*h+KC.C1*h+KC.C1*KC.C2;s+=t.C*(KC.C1*h+2*h*h)/D;}
  if(t.S){const D=h*h+KC.S1*h+KC.S1*KC.S2;s+=t.S*(KC.S1*h+2*h*h)/D;}
  return s;
}
function solvePH(Hn,t){
  let lo=-1.6,hi=15.6;
  for(let i=0;i<56;i++){const m=(lo+hi)/2;const f=protonExcess(Math.pow(10,-m),t)-Hn;if(f>0)lo=m;else hi=m;}
  return (lo+hi)/2;
}
function quickPH(v){const V=Math.max(v.vol,0.05),c=v.c;return solvePH((c.Hn||0)/V,{NH:(c.NHt||0)/V,Ac:(c.Act||0)/V,C:(c.Ct||0)/V,S:(c.St||0)/V});}

/* ---------- vessels ---------- */
let VID=0;
const UNKNOWN={};
function chemOf(id){return CHEM[id]||RESIDUE[id]||UNKNOWN[id];}
function newVessel(type,label){return {id:'v'+(++VID),type,label:label||'',vol:0,org:0,T:AMB,c:{},dry:{},flags:{},gases:{},d:null,heat:0};}
const add=(v,k,n)=>{v.c[k]=(v.c[k]||0)+n;if(Math.abs(v.c[k])<1e-12)delete v.c[k];};
function addComp(v,comp,f){for(const k in comp)add(v,k,comp[k]*f);}
function heatCap(v){return v.vol*4.18+(v.org*0.66*2.3)+(VESSEL_C[v.type]||10)+Object.values(v.dry).reduce((s,x)=>s+x*0.5,0);}

/* acidity / basicity for heat of neutralisation */
function acidity(v){const c=v.c;return Math.max(0,(c.Hn||0)-(c.NHt||0)-(c.Ct||0)-(c.St||0));}
function basicity(v){const c=v.c,H=c.Hn||0;return Math.max(0,-H)+Math.max(0,(c.NHt||0)-Math.max(0,H));}
function neutHeat(a,b){ // a,b: {acid,base,weakA,weakB}
  const n1=Math.min(a.acid,b.base),n2=Math.min(a.base,b.acid);
  const dh=(acidWeak,baseWeak)=>acidWeak&&baseWeak?50.4:acidWeak?55.8:baseWeak?52.2:57.3;
  return n1*dh(a.weakA,b.weakB)+n2*dh(b.weakA,a.weakB); // J (mmol × kJ/mol)
}
function neutProfile(v){const c=v.c;return {acid:acidity(v),base:basicity(v),weakA:(c.Act||0)>1e-6&&acidity(v)<=(c.Act||0)+1e-9,weakB:(c.NHt||0)>1e-6&&Math.max(0,-(c.Hn||0))<1e-6};}
function compProfile(comp,f){const tmp={c:{}};for(const k in comp)tmp.c[k]=comp[k]*f;return neutProfile(tmp);}

/* ---------- adding things ---------- */
function addLiquid(v,chem,vol,events){
  const conc=chem.st==='org';
  const pA=neutProfile(v),pB=compProfile(chem.comp,vol);
  let q=neutHeat(pA,pB);
  if(chem.conc_==='h2so4'&&v.vol>0.3)q+=chem.comp.SO4*vol*40; // dilution heat
  if(chem.conc_==='h2so4'===false&&chem.id==='water'&&(v.c.Hn||0)/Math.max(v.vol,.1)>8&&v.vol<3)events.push({k:'safety',t:'Water was added to concentrated acid. This causes violent spattering. Always add acid to water, slowly.'});
  const C0=heatCap(v);
  if(conc)v.org+=vol;else v.vol+=vol;
  addComp(v,chem.comp,vol);
  const C1=heatCap(v);
  v.T=(C0*v.T+(C1-C0)*AMB)/C1 + q/C1*(v.type==='cup'?0.985:0.93);
  if(v.vol>0.3&&Object.keys(v.dry).length)dissolveDry(v,events);
}
function addSolid(v,chem,sp,events){
  if(v.vol<0.3){v.dry[chem.id]=(v.dry[chem.id]||0)+sp;return;}
  dissolveOne(v,chem,sp,events);
}
function dissolveOne(v,chem,sp,events){
  const first=Object.keys(chem.comp)[0];
  const pA=neutProfile(v),pB=compProfile(chem.comp,sp);
  let q=neutHeat(pA,pB);
  if(chem.enth)q+= -chem.enth*chem.comp[first]*sp;
  addComp(v,chem.comp,sp);
  v.T+=q/heatCap(v)*0.93;
  if(chem.id==='s_cuso4a')events.push({k:'obs',t:'The white solid turns blue',inf:'Water present (anhydrous CuSO₄ hydrated)',o:1});
}
function dissolveDry(v,events){
  for(const id in v.dry){const ch=chemOf(id);if(ch)dissolveOne(v,ch,v.dry[id],events);}
  v.dry={};v.flags.hotRes=null;
}
const RESIDUE={
  r_pbo:{id:'r_pbo',n:'Lead(II) oxide (residue)',comp:{'Pb2+':1.5,Hn:-3},solid:[240,205,60],hot:[160,65,30]},
  r_nano2:{id:'r_nano2',n:'Sodium dioxonitrate(III) (residue)',comp:{'Na+':6,'NO3-':6},solid:[250,248,235]},
};
/* transfer volume from src vessel to dst */
function transfer(src,dst,vol,events){
  const tot=src.vol+src.org; if(tot<=0)return 0;
  vol=Math.min(vol,tot);const f=vol/tot;
  const part={};for(const k in src.c){part[k]=src.c[k]*f;}
  const pA=neutProfile(dst);const pB=neutProfile({c:part});
  const q=neutHeat(pA,pB);
  const Cd=heatCap(dst),Cs=(src.vol*f)*4.18+src.org*f*1.5;
  for(const k in part){add(dst,k,part[k]);add(src,k,-part[k]);}
  dst.vol+=src.vol*f;dst.org+=src.org*f;src.vol-=src.vol*f;src.org-=src.org*f;
  if(src.vol<1e-6)src.vol=0;if(src.org<1e-6)src.org=0;
  dst.T=(Cd*dst.T+Cs*src.T)/(Cd+Cs)+q/heatCap(dst)*(dst.type==='cup'?0.985:0.93);
  if(src.flags.ring){dst.flags.ring=false;}
  if(dst.vol>0.3&&Object.keys(dst.dry).length)dissolveDry(dst,events);
  return vol;
}
function passGas(dst,gas,events){const g=GASES[gas];if(!g||!g.comp)return;addComp(dst,g.comp,gas==='SO2'?0.05:0.012);}

/* ---------- irreversible reactions ---------- */
function X(v){const V=Math.max(v.vol,0.05);const pH=quickPH(v);return {V,pH,has:k=>(v.c[k]||0)>1e-7,conc:k=>(v.c[k]||0)/V,Hc:(v.c.Hn||0)/V,T:v.T};}
const ch=(v,o)=>{for(const k in o)add(v,k,o[k]);};
const RULES=[
 {id:'mno4_fe',t:(v,x)=>x.has('MnO4-')&&x.has('Fe2+')&&x.pH<3.6,f:v=>{const n=Math.min(v.c['MnO4-'],v.c['Fe2+']/5);ch(v,{'MnO4-':-n,'Fe2+':-5*n,'Fe3+':5*n,'Mn2+':n,Hn:-8*n});}},
 {id:'mno4_ox',t:(v,x)=>x.has('MnO4-')&&x.has('C2O4')&&x.pH<3.6&&v.T>=55,f:v=>{const n=Math.min(v.c['MnO4-']/2,v.c.C2O4/5);ch(v,{'MnO4-':-2*n,C2O4:-5*n,'Mn2+':2*n,Hn:-16*n});}},
 {id:'mno4_so3',t:(v,x)=>x.has('MnO4-')&&x.has('St'),f:v=>{const n=Math.min(v.c['MnO4-']/2,v.c.St/5);ch(v,{'MnO4-':-2*n,St:-5*n,SO4:5*n,'Mn2+':2*n,Hn:-6*n});},inf:'Purple KMnO₄ decolourised: reducing agent (SO₃²⁻/SO₂) present'},
 {id:'mno4_alk',t:(v,x)=>x.has('MnO4-')&&x.has('hexene'),f:v=>{const n=Math.min(v.c['MnO4-']/2,v.c.hexene/3);ch(v,{'MnO4-':-2*n,hexene:-3*n,'Mn2+':2*n});},inf:'C=C present (alkene oxidised)',obs:'The purple colour of KMnO₄ is discharged'},
 {id:'mno4_eth',t:(v,x)=>x.has('MnO4-')&&x.has('ethanol')&&x.pH<3.6&&v.T>=50,f:v=>{const n=Math.min(v.c['MnO4-']/4,v.c.ethanol/5);ch(v,{'MnO4-':-4*n,ethanol:-5*n,Act:5*n,Hn:5*n-12*n,'Mn2+':4*n});},inf:'Alkanol oxidised by KMnO₄'},
 {id:'cr_so3',t:(v,x)=>x.has('Cr2O7')&&x.has('St')&&x.pH<4,f:v=>{const n=Math.min(v.c.Cr2O7,v.c.St/3);ch(v,{Cr2O7:-n,St:-3*n,SO4:3*n,'Cr3+':2*n,Hn:-8*n});},inf:'Orange Cr₂O₇²⁻ reduced to green Cr³⁺: SO₂/SO₃²⁻ present'},
 {id:'cr_eth',t:(v,x)=>x.has('Cr2O7')&&x.has('ethanol')&&x.pH<3&&v.T>=45,f:v=>{const n=Math.min(v.c.Cr2O7/2,v.c.ethanol/3);ch(v,{Cr2O7:-2*n,ethanol:-3*n,'Cr3+':4*n,Act:3*n,Hn:3*n-16*n});},inf:'Orange → green: alkanol (–OH) oxidised; ethanol present'},
 {id:'br_alk',t:(v,x)=>x.has('Br2')&&x.has('hexene'),f:v=>{const n=Math.min(v.c.Br2,v.c.hexene);ch(v,{Br2:-n,hexene:-n,dibromo:n});},inf:'Bromine decolourised: C=C (unsaturation) present',obs:'The orange colour of bromine water is discharged (decolourised)'},
 {id:'cl_br',t:(v,x)=>x.has('Cl2')&&x.has('Br-'),f:v=>{const n=Math.min(v.c.Cl2,v.c['Br-']/2);ch(v,{Cl2:-n,'Br-':-2*n,Br2:n,'Cl-':2*n});},inf:'Cl₂ displaces Br₂ from bromide (Cl₂ more reactive)'},
 {id:'cl_i',t:(v,x)=>x.has('Cl2')&&x.has('I-'),f:v=>{const n=Math.min(v.c.Cl2,v.c['I-']/2);ch(v,{Cl2:-n,'I-':-2*n,I2:n,'Cl-':2*n});},inf:'Cl₂ displaces I₂ from iodide'},
 {id:'br_i',t:(v,x)=>x.has('Br2')&&x.has('I-')&&!x.has('hexene'),f:v=>{const n=Math.min(v.c.Br2,v.c['I-']/2);ch(v,{Br2:-n,'I-':-2*n,I2:n,'Br-':2*n});},inf:'Br₂ displaces I₂ from iodide (Br₂ more reactive than I₂)'},
 {id:'i2_s2o3',t:(v,x)=>x.has('I2')&&x.has('S2O3'),f:v=>{const n=Math.min(v.c.I2,v.c.S2O3/2);ch(v,{I2:-n,S2O3:-2*n,S4O6:n,'I-':2*n});}},
 {id:'cu_i',t:(v,x)=>x.has('Cu2+')&&x.conc('I-')>0.02,f:v=>{const n=Math.min(v.c['Cu2+']/2,v.c['I-']/4);ch(v,{'Cu2+':-2*n,'I-':-4*n,CuI:2*n,I2:n});},inf:'Cu²⁺ oxidises I⁻ to I₂ (white CuI formed)'},
 {id:'i2_oh',t:(v,x)=>x.has('I2')&&x.pH>10.5,f:v=>{const n=v.c.I2;ch(v,{I2:-n,'IO-':n,'I-':n,Hn:2*n});}},
 {id:'iodoform',t:(v,x)=>x.has('IO-')&&x.has('ethanol')&&v.T>=50,f:v=>{const n=Math.min(v.c['IO-']/3,v.c.ethanol);ch(v,{'IO-':-3*n,ethanol:-n,CHI3:n,'I-':2*n});},inf:'Iodoform (CHI₃) formed: CH₃CH(OH)– group, ethanol present'},
 {id:'fehling',t:(v,x)=>x.has('cuCplx')&&x.has('glucose')&&v.T>=70,f:v=>{const n=Math.min(v.c.cuCplx/2,v.c.glucose);ch(v,{cuCplx:-2*n,glucose:-n,Cu2O:n});},inf:'Cu₂O formed: reducing sugar present'},
 {id:'ninh',t:(v,x)=>x.has('ninh')&&x.has('protein')&&v.T>=60,f:v=>{const n=Math.min(v.c.ninh,v.c.protein);ch(v,{ninh:-n,ninhP:n*0.06});},inf:'Purple colour: amino acids/protein present'},
 {id:'xanth',t:(v,x)=>x.has('protein')&&x.has('NO3-')&&x.Hc>2.2&&v.T>=60,f:v=>{const n=v.c.protein;ch(v,{protein:-n,xanS:n*0.05,xanP:n*0.03});},inf:'Yellow nitro-compounds: protein (aromatic amino acids) present'},
 {id:'millonW',t:(v,x)=>x.has('millon')&&x.has('protein'),f:v=>{const n=Math.min(v.c.millon,v.c.protein);ch(v,{millon:-n,protein:-n,millonW:n*0.05});}},
 {id:'millonR',t:(v,x)=>x.has('millonW')&&v.T>=60,f:v=>{const n=v.c.millonW;ch(v,{millonW:-n,millonR:n});},inf:'Brick-red precipitate: protein present'},
 {id:'coag',t:(v,x)=>x.has('protein')&&v.T>=80&&!x.has('NO3-')&&x.pH<11&&!x.has('ninh')&&!x.has('ninhP')&&!x.has('millon')&&!x.has('cuCplx'),f:v=>{const n=v.c.protein;ch(v,{protein:-n,protC:n*0.05});},inf:'Protein coagulates (denatured) on heating'},
 {id:'ester',t:(v,x)=>!v.flags.ester&&x.has('ethanol')&&x.has('Act')&&x.Hc>2.5&&v.T>=55,f:v=>{const n=Math.min(v.c.ethanol,v.c.Act)*0.35;ch(v,{ethanol:-n,Act:-n,Hn:-n,ester:n});v.flags.ester=1;},inf:'Ester formed (esterification)',smell:'A sweet, fruity smell is produced'},
 {id:'ring',t:(v,x)=>!v.flags.ring&&!v.flags.ringDone&&x.has('Fe2+')&&x.has('NO3-')&&x.Hc>4,f:v=>{v.flags.ring=true;v.flags.ringDone=true;},inf:'Brown ring: NO₃⁻ confirmed',obs:'A brown ring forms at the junction of the two liquids'},
];
function react(v,events){
  for(let pass=0;pass<30;pass++){
    let fired=false;const x=X(v);
    for(const r of RULES){
      if(r.t(v,x)){r.f(v);fired=true;events.push({k:'rule',id:r.id,inf:r.inf,obs:r.obs,smell:r.smell});break;}
    }
    if(!fired)break;
  }
}

/* ---------- derived state: precipitation, complexes, pH ---------- */
function derive(v,events){
  for(let loop=0;loop<8;loop++){
    const d=deriveOnce(v);v.d=d;
    // gas evolution (irreversible)
    const h=Math.pow(10,-d.pH);let evolved=false;
    if((v.c.Ct||0)>1e-6&&d.pH<6.5&&v.vol>0.05){const D=h*h+KC.C1*h+KC.C1*KC.C2,fr=h*h/D;const n=v.c.Ct*fr-0.03*v.vol;if(n>1e-5){add(v,'Ct',-n);add(v,'Hn',-2*n);gasOut(v,'CO2',n,events);evolved=true;}}
    if((v.c.St||0)>1e-6&&d.pH<2.6&&v.vol>0.05){const D=h*h+KC.S1*h+KC.S1*KC.S2,fr=h*h/D;const n=v.c.St*fr*0.9;if(n>1e-6){add(v,'St',-n);add(v,'Hn',-2*n);gasOut(v,'SO2',n,events);evolved=true;}}
    if(!evolved)return d;
  }
  return v.d;
}
function gasOut(v,g,n,events){v.gases[g]=SIMT;v.gasAmt=(v.gasAmt||0)+n;events.push({k:'gas',g,n});}
function caThr(c){return 14+0.5*Math.log10(5e-5/Math.max(c,1e-6));}
function deriveOnce(v){
  const V=Math.max(v.vol,0.05);const a={...v.c};
  const pHq=(extra,nh)=>solvePH(((a.Hn||0)+extra)/V,{NH:Math.max(nh,0)/V,Ac:(a.Act||0)/V,C:(a.Ct||0)/V,S:(a.St||0)/V});
  let nh=a.NHt||0;
  const pH0=pHq(0,nh);const h0=Math.pow(10,-pH0);
  const nh3free=nh*KC.NH4/(h0+KC.NH4);
  const x={pH0,conc:k=>(a[k]||0)/V,nh3:nh3free/V};
  const ppt={},cplx={},diss={};
  // salts
  for(const [cat,ca,an,cb,p,cond,pHmin] of SALTS){
    if((a[cat]||0)>1e-7&&(a[an]||0)>1e-7&&cond(v,x)){let n=Math.min(a[cat]/ca,a[an]/cb);
      if(pHmin!=null){const orig=a[an];const f=q=>{a[an]=orig-cb*q;const r=pHq(0,nh);a[an]=orig;return r;};
        if(f(0)<pHmin)n=0;else if(f(n)<pHmin){let lo=0,hi=n;for(let i=0;i<26;i++){const mid=(lo+hi)/2;if(f(mid)>=pHmin)lo=mid;else hi=mid;}n=lo;}}
      if(n>1e-9){a[cat]-=ca*n;a[an]-=cb*n;ppt[p]=(ppt[p]||0)+n;}}
  }
  // biuret complex
  if((a.protein||0)>0&&(a['Cu2+']||0)>0&&pH0>10.5){const b=Math.min(a['Cu2+'],a.protein*0.05);a['Cu2+']-=b;cplx.biuret=b;}
  // ammine complexes
  let free=nh3free;
  for(const M of ['Cu2+','Zn2+','Ag+']){const C=NH3CPLX[M];if((a[M]||0)>1e-7&&free/V>C.thr){const n=Math.min(a[M],(free-C.thr*V)/C.k);if(n>0){a[M]-=n;nh-=C.k*n;free-=C.k*n;cplx[M]=n;}}}
  // hydroxides
  let acc=0;
  for(const H of HYD){
    const m=a[H.m]||0;if(m<1e-7)continue;
    const thr=H.thrFn?H.thrFn(m/V):H.thr==null?caThr(m/V):H.thr;
    const f=p=>pHq(acc+H.n*p,nh);
    let p=0;
    if(f(0)>=thr){if(f(m)>=thr)p=m;else{let lo=0,hi=m;for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(f(mid)>=thr)lo=mid;else hi=mid;}p=lo;}}
    if(p>1e-9){acc+=H.n*p;a[H.m]-=p;ppt[H.p]=(ppt[H.p]||0)+p;}
  }
  for(const H of HYD){
    if(!H.amph||!(ppt[H.p]>1e-9))continue;
    const [thr,e]=H.amph;const f=d=>pHq(acc+e*d,nh);
    if(f(0)<thr)continue;
    const P=ppt[H.p];let d=P;
    if(f(P)<thr){let lo=0,hi=P;for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(f(mid)>=thr)lo=mid;else hi=mid;}d=lo;}
    ppt[H.p]-=d;acc+=e*d;diss[H.m]=d;
  }
  // iron(III) thiocyanate equilibrium (exothermic: K falls on heating)
  if((a['Fe3+']||0)>1e-9&&(a['SCN-']||0)>1e-9){const K=150*Math.exp(3608*(1/(v.T+273.15)-1/298.15));const F=a['Fe3+']/V,Sc=a['SCN-']/V;const b=K*(F+Sc)+1;const x=(b-Math.sqrt(Math.max(0,b*b-4*K*K*F*Sc)))/(2*K);const n=x*V;a['Fe3+']-=n;a['SCN-']-=n;cplx.FeSCN=n;}
  // crystallisation when solubility exceeded
  if(v.vol>0.02)for(const [c1,k1,c2,k2,p,sol] of SOLUB){if((a[c1]||0)>1e-7&&(a[c2]||0)>1e-7){const m=Math.min(a[c1]/k1,a[c2]/k2)/Math.max(v.vol,0.02);const s0=sol(v.T);if(m>s0){const n=(m-s0)*Math.max(v.vol,0.02);a[c1]-=k1*n;a[c2]-=k2*n;ppt[p]=(ppt[p]||0)+n;}}}
  else if(v.vol<=0.02)for(const [c1,k1,c2,k2,p] of SOLUB){const n=Math.min((a[c1]||0)/k1,(a[c2]||0)/k2);if(n>1e-7){a[c1]-=k1*n;a[c2]-=k2*n;ppt[p]=(ppt[p]||0)+n;}}
  const pH=pHq(acc,nh);
  // stored solids
  for(const k of ['Cu2O','CHI3','S','CuI','millonW','millonR','xanS','protC','sand']){if((a[k]||0)>1e-7){ppt[k]=a[k];delete a[k];}}
  const metals={};for(const k of ['Zn(s)','Mg(s)','Cu(s)','MnO2(s)']){if((a[k]||0)>1e-7)metals[k]=a[k];}
  return {pH,free:a,ppt,cplx,diss,metals,V};
}

/* ---------- equilibrate after any change ---------- */
function equilibrate(v,events=[]){react(v,events);derive(v,events);return events;}

/* ---------- time step ---------- */
function tick(v,dt,heating,events){
  const x=X(v);const pH=v.d?v.d.pH:x.pH;let changed=false;const V=x.V;
  // heating / cooling
  const C=heatCap(v);
  if(heating&&BURNER_P[v.type]){
    const wet=v.vol>0.3;const maxT=wet?100:450;
    if(v.T<maxT)v.T=Math.min(maxT,v.T+BURNER_P[v.type]*dt/C);
    if(wet&&v.T>=99.5){const ev=(v.type==='dish'?0.012:0.004)*BURNER_P[v.type]*dt/10;v.vol=Math.max(0,v.vol-ev);if(v.vol<=0.3&&!v.flags.dried){v.flags.dried=1;events.push({k:'obs',t:'The liquid boils away, leaving a residue',o:1});}}
    if(!v.flags.fire&&(v.c.ethanol>0.5||v.org>0.3)&&v.T>55){v.flags.fire=1;events.push({k:'safety',t:'Flammable vapour caught fire! Never heat ethanol, hexane or hexene directly over a flame. Use a hot-water bath.'});events.push({k:'obs',t:'The flammable vapour ignites at the mouth of the vessel',o:1});}
    changed=true;
  }else if(Math.abs(v.T-AMB)>0.05){v.T+=(AMB-v.T)*dt/(COOL_TAU[v.type]||200);changed=true;}
  // dry solid heating
  if(Object.keys(v.dry).length&&v.T>180){for(const id in v.dry){if(v.flags['h_'+id])continue;v.flags['h_'+id]=1;thermalDecomp(v,id,events);changed=true;}}
  if(v.flags.hotRes&&v.T<120){v.flags.hotRes=null;changed=true;}
  if(v.flags.decomp&&heating&&SIMT<v.flags.decomp.until){for(const g of v.flags.decomp.gases)v.gases[g]=SIMT;}
  if(v.vol>0.05){
    const Hc=Math.pow(10,-pH);
    // metal + acid → H2
    for(const [m,k] of [['Zn(s)',0.06],['Mg(s)',0.5]]){if((v.c[m]||0)>1e-6&&pH<2.2){const dn=Math.min(v.c[m],k*Math.min(Hc,3)*dt*(v.c[m]>0.2?1:v.c[m]/0.2+0.05),Math.max(0,(v.c.Hn||0))/2);if(dn>1e-6){const M=m==='Zn(s)'?'Zn2+':'Mg2+';ch(v,{[m]:-dn,[M]:dn,Hn:-2*dn});gasOut(v,'H2',dn,events);v.T+=dn*150/C;changed=true;}}}
    // H2O2 + MnO2
    if((v.c.H2O2||0)>1e-4&&(v.c['MnO2(s)']||0)>1e-6){const dn=v.c.H2O2*Math.min(1,0.18*dt);add(v,'H2O2',-dn);gasOut(v,'O2',dn/2,events);v.T+=dn*98/C;changed=true;}
    // thiosulphate + acid → S (rate experiment)
    if((v.c.S2O3||0)>1e-6&&pH<3){const k=0.00098*Math.pow(2,(v.T-27)/10);const dn=k*v.c.S2O3*dt;ch(v,{S2O3:-dn,S:dn,St:dn});changed=true;if(!v.flags.sAcid){v.flags.sAcid=SIMT;}}
    // permanganate/oxalate slow at room temperature (autocatalysed by Mn2+)
    if((v.c['MnO4-']||0)>1e-7&&(v.c.C2O4||0)>1e-7&&pH<3.6&&v.T<55){const fr=Math.min(1,(0.012+30*x.conc('Mn2+'))*dt*Math.pow(2,(v.T-27)/10));const n=Math.min(v.c['MnO4-']/2,v.c.C2O4/5)*fr;ch(v,{'MnO4-':-2*n,C2O4:-5*n,'Mn2+':2*n,Hn:-16*n});changed=true;}
    // acid hydrolysis of sucrose/starch on boiling
    if(pH<2&&v.T>=90){for(const [k,g] of [['sucrose',2],['starch',0.6]]){if((v.c[k]||0)>1e-6){const dn=v.c[k]*Math.min(1,0.07*dt);ch(v,{[k]:-dn,glucose:g*dn});changed=true;}}}
    // boiling expels CO2 from hydrogencarbonates (removes temporary hardness)
    if((v.c.Ct||0)>1e-7&&v.T>=95&&pH>5.5&&pH<9.6&&(v.c.Hn||0)>0){const dn=Math.min(v.c.Ct,(v.c.Hn||0)/2)*Math.min(1,0.05*dt);if(dn>1e-8){ch(v,{Ct:-dn,Hn:-2*dn});changed=true;}}
    // Fe(OH)2 → Fe(OH)3 in air
    if(v.d&&v.d.ppt['Fe(OH)2']>1e-6){const dn=v.d.ppt['Fe(OH)2']*0.006*dt;ch(v,{'Fe2+':-dn,'Fe3+':dn,Hn:-dn});changed=true;}
    // NH3 evolution from warm alkaline ammonium
    if((v.c.NHt||0)>1e-6&&pH>9.3&&v.T>=55){const h=Math.pow(10,-pH);const free=v.c.NHt*KC.NH4/(h+KC.NH4);const dn=free*Math.min(1,0.12*dt);if(dn>1e-6){add(v,'NHt',-dn);gasOut(v,'NH3',dn,events);changed=true;}}
    // HCl from chloride + conc H2SO4
    if((v.c['Cl-']||0)>1e-6&&x.Hc>7){const dn=v.c['Cl-']*Math.min(1,0.08*dt);ch(v,{'Cl-':-dn,Hn:-dn});gasOut(v,'HCl',dn,events);changed=true;}
    // NO2 from Cu + nitrate + conc acid
    if((v.c['Cu(s)']||0)>1e-6&&(v.c['NO3-']||0)>1e-6&&x.Hc>3.5&&v.T>40){const dn=Math.min(v.c['Cu(s)'],v.c['NO3-']/2)*Math.min(1,0.08*dt);ch(v,{'Cu(s)':-dn,'Cu2+':dn,'NO3-':-2*dn,Hn:-4*dn});gasOut(v,'NO2',dn,events);changed=true;}
    else if((v.c['NO3-']||0)>1e-6&&x.Hc>9&&v.T>85){const dn=v.c['NO3-']*0.01*dt;ch(v,{'NO3-':-dn,Hn:-dn});gasOut(v,'NO2',dn*0.2,events);changed=true;}
  }
  if(changed){equilibrate(v,events);}
  return changed;
}
const DECOMP={
  nahco3:{gases:['CO2','H2O'],t:'Colourless droplets condense on the cooler part of the tube; a colourless gas is evolved',inf:'CO₂ and H₂O evolved: HCO₃⁻ (hydrogentrioxocarbonate(IV)) present',to:'s_na2co3'},
  nano3:{gases:['O2'],t:'The white solid melts to a colourless liquid; a colourless gas is slowly evolved',inf:'O₂ evolved: trioxonitrate(V) of Na/K (decomposes to the dioxonitrate(III))',to:'r_nano2'},
  nh4cl:{gases:['NH3','HCl'],t:'The white solid disappears from the bottom of the tube and a white sublimate forms on the cooler part; white fumes are seen',inf:'NH₄Cl sublimes (NH₄Cl ⇌ NH₃ + HCl)',to:null},
  cuso4:{gases:['H2O'],t:'The blue crystals turn to a white powder; colourless droplets condense on the cooler part of the tube',inf:'Water of crystallisation driven off (CuSO₄·5H₂O → CuSO₄)',to:'s_cuso4a'},
  pbno3:{gases:['NO2','O2'],t:'The crystals crackle (decrepitation); a reddish-brown gas is evolved; the residue is reddish-brown when hot and yellow when cold',inf:'NO₂ and O₂ evolved: trioxonitrate(V) of a heavy metal (Pb²⁺)',to:'r_pbo',fume:[170,75,20]},
  zno:{gases:[],t:'The white solid turns yellow on heating',inf:'ZnO present (yellow when hot, white when cold)',to:null,hot:[245,215,60]},
};
function thermalDecomp(v,id,events){
  const chm=chemOf(id);const key=chm&&chm.heat;const D=DECOMP[key];
  if(!D){events.push({k:'obs',t:`${chm?chm.n:'The solid'}: no visible change on heating`,o:1});return;}
  events.push({k:'obs',t:D.t,inf:D.inf,o:1});
  for(const g of D.gases)gasOut(v,g,0.5,events);
  v.flags.decomp={gases:D.gases,until:SIMT+30};
  if(D.to){const amt=v.dry[id];delete v.dry[id];v.dry[D.to]=(v.dry[D.to]||0)+amt;v.flags['h_'+D.to]=1;}
  else if(key==='nh4cl'){delete v.dry[id];v.flags.sublimate=1;}
  if(key==='zno'||key==='pbno3')v.flags.hotRes=key;
}

/* ---------- appearance ---------- */
const COLNAMES=[
 ['red',[205,35,45]],['blood-red',[145,12,22]],['orange',[236,128,32]],['orange-red',[218,88,32]],['yellow',[245,205,40]],['yellow-brown',[200,140,40]],
 ['brown',[135,68,22]],['reddish-brown',[150,65,25]],['green',[60,150,70]],['pale green',[160,210,130]],['blue',[60,140,230]],['deep blue',[30,50,190]],
 ['violet',[130,50,170]],['purple',[95,18,115]],['pink',[225,70,150]],['blue-black',[20,20,80]],['white',[248,248,246]],['cream',[245,235,200]],
 ['brick-red',[178,60,30]],['chocolate-brown',[115,50,25]],['dark blue',[25,40,140]],['light blue',[110,170,230]],['grey',[150,150,150]],['dirty green',[75,105,55]],['black',[40,38,38]],['silvery grey',[195,200,205]],['sandy brown',[205,185,145]],['copper-coloured',[185,105,55]],['colourless',[255,255,255]]
];
function colName(rgb,a,liquid){
  if(a!=null&&a<0.07)return 'colourless';
  let best='',bd=1e9;for(const [n,c] of COLNAMES){if(n==='colourless'||(liquid&&['copper-coloured','silvery grey','black','white','cream','chocolate-brown','brick-red','dirty green'].includes(n)))continue;const d=(c[0]-rgb[0])**2+(c[1]-rgb[1])**2+(c[2]-rgb[2])**2;if(d<bd){bd=d;best=n;}}
  if(a!=null&&a<0.22&&!/^(pale|deep|light|dark)/.test(best))return 'pale '+best;
  return best;
}
function appearance(v){
  const d=v.d||deriveOnce(v);const V=d.V,f=d.free;const pH=d.pH;
  const contrib=[];const push=(rgb,A)=>{if(A>1e-4)contrib.push([rgb,A]);};
  const orgOn=v.org>0.2;
  const part=orgOn?0.1:1;
  for(const k in f){const s=SPECIES[k];if(!s||!s.col||f[k]<=0)continue;
    if(['I2','Br2','Cl2'].includes(k))continue;
    let c=f[k]/V,A=s.eps*c,rgb=s.col;
    if(k==='MnO4-'){rgb=A<2?[220,60,170]:lerp([220,60,170],[95,15,110],cl((A-2)/8));}
    push(rgb,A);}
  // halogens (aqueous part)
  const starchOn=(f.starch||0)>1e-6&&v.T<70;
  if((f.I2||0)>1e-8){const c=f.I2/V*part;if(starchOn)push([18,18,75],16000*c);else push((f['I-']||0)>1e-6?[140,70,20]:[185,125,40],260*c);}
  if((f.Br2||0)>1e-8)push([228,125,30],150*f.Br2/V*part);
  if((f.Cl2||0)>1e-8)push([200,220,120],16*f.Cl2/V*part);
  for(const k in d.cplx){if(k==='FeSCN')push([155,14,24],4700*d.cplx[k]/V);if(k==='Cu2+')push([30,50,190],60*d.cplx[k]/V);if(k==='biuret')push([130,50,175],260*d.cplx[k]/V);}
  // indicators
  for(const k of ['MO','MR','PP','UI','LIT']){if((f[k]||0)>1e-6){const c=f[k]/V;let rgb=IND_COL[k](pH),A=420*c;if(k==='PP'){A*=IND_COL.PPeps(pH);rgb=[225,40,140];}if(k==='UI')A=300*c;push(rgb,A);}}
  if((f.xanP||0)>1e-7)push(pH>8?[235,130,30]:[240,200,30],30*f.xanP/V*20);
  let A=0,r=0,g=0,b=0;for(const [rgb,a] of contrib){A+=a;r+=rgb[0]*a;g+=rgb[1]*a;b+=rgb[2]*a;}
  const liq=A>0.0005?[r/A,g/A,b/A]:[220,235,242];const alpha=A>0.0005?cl(1-Math.exp(-A),0.05,0.96):0.16;const tinted=A>0.07;
  // precipitates
  const ppts=[];let haze=0;
  for(const k in d.ppt){const amt=d.ppt[k];if(amt<0.0008)continue;const P=PPT[k];if(!P)continue;
    const vis=Math.min(1,amt/Math.max(V,1)*25+ (amt>0.004?0.25:0));ppts.push({k,amt,rgb:P.c,gel:!!P.gel,vis,colloid:!!P.colloid,cryst:!!P.cryst});haze+=vis;}
  // organic layer
  let layer=null;
  if(orgOn){const lc=[];const p=(rgb,A)=>{if(A>1e-4)lc.push([rgb,A]);};const O=v.org;
    if((f.I2||0)>1e-8)p([130,40,170],300*f.I2*0.9/O);if((f.Br2||0)>1e-8)p([215,85,30],200*f.Br2*0.9/O);if((f.Cl2||0)>1e-8)p([215,230,160],16*f.Cl2*0.9/O);
    let LA=0,lr=0,lg=0,lb=0;for(const [rgb,a] of lc){LA+=a;lr+=rgb[0]*a;lg+=rgb[1]*a;lb+=rgb[2]*a;}
    layer={rgb:LA>0.0005?[lr/LA,lg/LA,lb/LA]:[240,240,232],a:LA>0.0005?cl(1-Math.exp(-LA),0.06,0.95):0.12};layer.name=LA>0.07?colName(layer.rgb,layer.a):'colourless';}
  const now=SIMT;const gasesActive=Object.keys(v.gases).filter(g=>now-v.gases[g]<6);
  const fumes=gasesActive.map(g=>GASES[g].fume).filter(Boolean);
  const dry=Object.keys(v.dry).map(id=>{const c=chemOf(id)||{};let rgb=c.solid||[250,250,250];if(v.flags.hotRes&&v.T>120){if(id==='s_zno'||c.real==='s_zno')rgb=[245,215,60];if(id==='r_pbo')rgb=[160,65,30];}return {id,rgb,amt:v.dry[id]};});
  const metals=Object.keys(d.metals).map(k=>({k,amt:d.metals[k],rgb:{'Zn(s)':[150,155,160],'Mg(s)':[205,210,215],'Cu(s)':[185,105,55],'MnO2(s)':[45,40,40]}[k]}));
  const foam=(f.soap||0)/V>4e-4&&v.flags.shook!=null&&SIMT-v.flags.shook<45;
  return {foam,liq,alpha,name:tinted?colName(liq,alpha,true):'colourless',ppts,haze,layer,ring:!!v.flags.ring,gasesActive,fumes,bubbles:gasesActive.some(g=>g!=='H2O'&&now-v.gases[g]<3)||(v.T>=99.5&&v.vol>0.3),steam:v.T>=95&&v.vol>0.3,dry,metals,T:v.T,vol:v.vol,org:v.org,sublimate:!!v.flags.sublimate,fire:!!(v.flags.fire&&v.T>55)};
}

/* ---------- observation writer ---------- */
const INF_PPT={
 'Fe(OH)3':'Fe³⁺ present','Fe(OH)2':'Fe²⁺ present','Cu(OH)2':'Cu²⁺ present','Al(OH)3':'Al³⁺, Pb²⁺ or Zn²⁺ probably present','Pb(OH)2':'Al³⁺, Pb²⁺ or Zn²⁺ probably present','Zn(OH)2':'Al³⁺, Pb²⁺ or Zn²⁺ probably present',
 'Ca(OH)2':'Ca²⁺ probably present','Mg(OH)2':'Mg²⁺ probably present','Ag2O':'Ag⁺ present','Mn(OH)2':'Mn²⁺ present','Cr(OH)3':'Cr³⁺ present',
 'AgCl':'Cl⁻ probably present','AgBr':'Br⁻ present','AgI':'I⁻ present','BaSO4':'SO₄²⁻, SO₃²⁻ or CO₃²⁻ present','BaSO3':'SO₄²⁻, SO₃²⁻ or CO₃²⁻ present','BaCO3':'SO₄²⁻, SO₃²⁻ or CO₃²⁻ present',
 'CaCO3':'CO₂ present (CaCO₃ formed)','CaSO3':'SO₂ (or CO₂) present','PbCl2':'Pb²⁺ present (PbCl₂)','PbI2':'Pb²⁺ confirmed (PbI₂)','PbSO4':'Pb²⁺ present (PbSO₄)','CaSO4':'Ca²⁺ present','CaC2O4':'Ca²⁺ confirmed',
 'Cu2[Fe(CN)6]':'Cu²⁺ confirmed','Fe4[Fe(CN)6]3':'Fe³⁺ confirmed','Fe3[Fe(CN)6]2':'Fe²⁺ confirmed','Zn2[Fe(CN)6]':'Zn²⁺ present','Fe2[Fe(CN)6]':'Fe²⁺ present',
 'Cu2O':'Reducing sugar present','CHI3':'Ethanol present (iodoform)','S':'Sulphur formed','CuI':'Cu²⁺ present','millonW':'Protein probably present','millonR':'Protein confirmed','xanS':'Protein present','protC':'Protein present (coagulated)',
 'PbCO3':'CO₃²⁻ present','scum':'Ca²⁺/Mg²⁺ (hardness) present: soap forms scum','CuSO4cr':'Solution saturated: crystals form on cooling','KNO3cr':'Solution saturated: crystals form','NaClcr':'Solution saturated: crystals form','ZnCO3':'CO₃²⁻ present','CuCO3':'CO₃²⁻ present',
};
function snap(v){const a=appearance(v);const _f=a.foam;const pp={};for(const p of a.ppts)if(p.vis>0.08)pp[p.k]={amt:p.amt,rgb:p.rgb,gel:p.gel};return {name:a.name,alpha:a.alpha,pp,layer:a.layer&&a.layer.name,ring:a.ring,T:v.T,vol:v.vol,cplx:{...(v.d?v.d.cplx:{})},dry:a.dry.map(x=>x.id).join(','),dryCol:a.dry.length?colName(a.dry[0].rgb):null,foam:_f,soap:!!(v.c.soap>1e-6)};}
function describe(before,after,events,ctx){
  const obs=[],inf=[];const reag=ctx&&ctx.reagent||'';const xs=ctx&&ctx.excess;
  // gases
  const gs={};for(const e of events)if(e.k==='gas')gs[e.g]=(gs[e.g]||0)+e.n;
  const gl=Object.keys(gs).filter(g=>g!=='H2O');
  const hasO=events.some(e=>e.o);
  if(gl.length&&!hasO){const brown=gl.includes('NO2');const smelly=gl.map(g=>GASES[g].smell).filter(s=>s!=='odourless');
    obs.push((after.vol>0.3&&gl.some(g=>['CO2','H2','O2','SO2','NH3','HCl'].includes(g))&&gl.some(g=>['CO2','H2','O2','SO2'].includes(g))?'Effervescence; ':'')+(brown?'a reddish-brown gas is evolved':'a colourless gas is evolved')+(smelly.length?` with a ${smelly[0]} smell`:'')+(gl.includes('HCl')?' (misty white fumes)':''));}
  if(gs.H2O&&!events.some(e=>e.o))obs.push('Colourless droplets condense on the cooler part of the tube');
  // rule/explicit observations
  for(const e of events){if(e.k==='obs'){obs.push(e.t);if(e.inf)inf.push(e.inf);}if(e.k==='rule'){if(e.obs)obs.push(e.obs);if(e.smell)obs.push(e.smell);if(e.inf)inf.push(e.inf);}}
  // precipitates
  const newP=[],goneP=[],keptP=[];
  for(const k in after.pp){if(!before.pp[k])newP.push(k);else keptP.push(k);}
  for(const k in before.pp){if(!after.pp[k])goneP.push(k);}
  const STORED=['Cu2O','CHI3','millonR','xanS','protC','CuI'];
  if(goneP.includes('millonW')&&newP.includes('millonR')){obs.push('The white precipitate turns brick-red');goneP.splice(goneP.indexOf('millonW'),1);}
  if(newP.includes('Fe(OH)3')&&before.pp['Fe(OH)2']){obs.push('The green precipitate turns reddish-brown on standing (oxidised by air)');inf.push('Fe²⁺ oxidised to Fe³⁺');newP.splice(newP.indexOf('Fe(OH)3'),1);}
  const byCol2={};for(const k of newP){if(k==='millonR'&&obs.some(o=>/turns brick-red/.test(o)))continue;const p=after.pp[k];const nm=colName(p.rgb);const key=nm+(p.gel?'|g':'');(byCol2[key]=byCol2[key]||[]).push(k);}
  for(const key in byCol2){const [nm,g]=key.split('|');if(byCol2[key].every(k=>k==='sand')){obs.push('Insoluble sandy particles remain undissolved');inf.push('Sand is an insoluble impurity');continue;}if(byCol2[key].every(k=>PPT[k]&&PPT[k].cryst)){obs.push(`${nm.charAt(0).toUpperCase()+nm.slice(1)} crystals appear`);continue;}obs.push(`${/^[aeiou]/.test(nm)?'An':'A'} ${nm}${g?' gelatinous':''} precipitate is formed`);for(const k of byCol2[key])if(INF_PPT[k]&&!STORED.includes(k))inf.push(INF_PPT[k]);}
  for(const k of goneP){const nm=colName(before.pp[k].rgb);const sol=after.name==='colourless'?'a colourless solution':`a ${after.name} solution`;
    if(after.T>before.T+15&&['PbI2','PbCl2'].includes(k)){obs.push(`The ${nm} precipitate dissolves on heating`);inf.push(k==='PbI2'?'PbI₂ is soluble in hot water':'PbCl₂ is soluble in hot water');continue;}
    obs.push(`The ${nm} precipitate dissolves${xs?` in excess ${reag}`:''} to give ${sol}`);
    if(['Zn(OH)2','Al(OH)3','Pb(OH)2'].includes(k)){if(/NH/.test(reag))inf.push(k==='Zn(OH)2'?'Zn²⁺ confirmed (soluble ammine complex)':'');else inf.push('Amphoteric hydroxide: Zn²⁺, Al³⁺ or Pb²⁺ present');}
    if(k==='Cu(OH)2'&&/NH/.test(reag))inf.push('Cu²⁺ confirmed ([Cu(NH₃)₄]²⁺ formed)');
    if(k==='AgCl')inf.push('Cl⁻ confirmed (AgCl soluble in NH₃)');
    if(['BaSO3','BaCO3'].includes(k))inf.push('SO₃²⁻ or CO₃²⁻ present (SO₄²⁻ absent)');
    if(k==='CaCO3'&&/gas|CO/.test(reag))inf.push('Excess CO₂ forms soluble Ca(HCO₃)₂');
    if(k==='Ag2O'&&/NH/.test(reag))inf.push('Ag⁺ forms a soluble ammine complex');
  }
  if(xs)for(const k of keptP){const nm=colName(after.pp[k].rgb);if(after.pp[k].amt>=before.pp[k].amt*0.6){obs.push(`The ${nm} precipitate is insoluble in excess ${reag}`);
    const m={'Ca(OH)2':'Ca²⁺ present','Cu(OH)2':'Cu²⁺ present','Fe(OH)2':'Fe²⁺ present','Fe(OH)3':'Fe³⁺ present','BaSO4':'SO₄²⁻ confirmed'};
    if(/NH/.test(reag)&&['Al(OH)3','Pb(OH)2'].includes(k))inf.push('Al³⁺ or Pb²⁺ present');else if(/HCl|acid/.test(reag)&&k==='BaSO4')inf.push('SO₄²⁻ confirmed');else if(m[k]&&!/acid|HCl/.test(reag))inf.push(m[k]);}}
  if(after.pp.PbI2&&!before.pp.PbI2&&before.T>after.T+10){obs.pop();inf.pop();obs.push('Golden-yellow crystals (spangles) reappear on cooling');inf.push('Pb²⁺ confirmed');}
  // solution colour
  const pptChanged=newP.length+goneP.length>0;
  const hasP=Object.keys(after.pp).length>0;
  const art=n=>/^[aeiou]/.test(n)?'An':'A';
  const ruleObs=events.some(e=>e.k==='rule'&&e.obs);
  if(!before.dry&&after.dry&&after.vol<0.3&&before.vol<0.05){const nm=after.dryCol||'white';obs.push(`${art(nm)} ${nm} solid`);}
  else if(before.dry&&!after.dry&&after.vol>=0.3){obs.push(`The solid dissolves to give ${art(after.name).toLowerCase()} ${after.name} solution`);}
  else if(before.vol<0.3&&after.vol>=0.3&&!newP.length&&!ruleObs){obs.push(`${art(after.name)} ${after.name} solution`);}
  else if(!ruleObs&&!after.ring&&after.name!==before.name&&!(goneP.length&&obs.some(o=>/dissolves/.test(o)))&&!(hasP&&after.name==='colourless')&&!(newP.length&&/^pale/.test(after.name))){
    if(before.vol<0.3)obs.push(`${art(after.name)} ${after.name} solution is formed`);
    else if(after.name==='colourless')obs.push(`The ${before.name} colour disappears (decolourised)`);
    else if(before.name==='colourless')obs.push(`The solution turns ${after.name}`);
    else obs.push(`The ${before.name} solution turns ${after.name}`);
    if(after.cplx.biuret&&!before.cplx.biuret)inf.push('Peptide bonds: protein present');
    if(/orange/.test(after.name)&&/yellow/.test(before.name)&&(after.cplx.x||1)&&ctx&&/NH/.test(ctx.reagent||''))inf.push('Protein confirmed (xanthoproteic test)');
    if(/blood-red/.test(after.name)&&!/blood/.test(before.name))inf.push('Fe³⁺ confirmed');
    if(/blue-black/.test(after.name)&&!/blue-black/.test(before.name))inf.push(ctx&&/iodine/i.test(reag)?'Starch present':'I₂ present (with starch)');
  }
  if(!ruleObs&&after.name===before.name&&after.name!=='colourless'&&!newP.length&&!goneP.length&&Math.abs(after.alpha-before.alpha)>0.1&&before.vol>=0.3){obs.push(after.alpha>before.alpha?`The ${after.name} colour deepens (becomes more intense)`:`The ${after.name} colour becomes paler`);}
  if(after.foam&&!before.foam)obs.push('A lather forms which lasts (persists)');
  if(ctx&&ctx.shake&&after.soap&&!after.foam)obs.push('No lasting lather forms');
  if(after.layer&&after.layer!==before.layer){obs.push(before.layer?`The upper organic layer turns ${after.layer}`:`Two layers form; the upper organic layer is ${after.layer}`);if(/violet|purple/.test(after.layer))inf.push('I₂ present');if(/orange/.test(after.layer))inf.push('Br₂ present');}
  const dT=after.T-before.T;if(!(ctx&&(ctx.heat||ctx.wait))&&Math.abs(dT)>=1.5){if(dT>0&&after.T>AMB+1.5)obs.push(`The mixture becomes ${dT>8?'hot':'warm'} (heat is evolved)`);else if(dT<0&&after.T<AMB-1)obs.push('The mixture becomes cold (heat is absorbed)');}
  const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);const o=[...new Set(obs.filter(Boolean).map(cap))],i=[...new Set(inf.filter(Boolean))];
  return {obs:o.length?o.join('. ')+'.':'No visible change.',inf:i.join('. ')+(i.length?'.':'')};
}

/* ---------- gas & tool tests ---------- */
function toolTest(v,tool){
  const a=appearance(v);const gs=a.gasesActive;const pH=v.d?v.d.pH:7;
  const res=(o,i,vis)=>({obs:o,inf:i||'',vis:vis||{}});
  if(tool==='waft'){
    if(gs.length){const s=[...new Set(gs.map(g=>GASES[g].smell))];return res(s.map(x=>x==='odourless'?'The gas is odourless':`The gas has a ${x} smell`).join('; ')+'.',gs.length===1&&GASES[gs[0]].smell!=='odourless'?'':'');}
    const sm=[];if(v.c.ester>1e-4)sm.push('sweet, fruity (ester)');if((v.c.Act||0)/Math.max(v.vol,.1)>0.3&&pH<5)sm.push('vinegar-like');if((v.c.ethanol||0)>0.5)sm.push('alcohol-like');
    if(v.d&&(v.c.NHt||0)/Math.max(v.vol,.1)>0.4&&pH>9.5)sm.push('pungent ammonia');if(v.c.Br2>1e-3)sm.push('choking (bromine)');if(v.c.Cl2>1e-3)sm.push('choking (chlorine)');if(v.org>0.2)sm.push('petrol-like');
    return res(sm.length?`A ${sm.join(', ')} smell is detected.`:'No characteristic smell.',v.c.ester>1e-4?'Ester present':'');
  }
  if(tool==='thermo')return res(`The thermometer reads ${v.T.toFixed(1)} °C.`,'');
  if(tool==='uipaper'){if(v.vol<0.1)return res('There is no liquid to test.','');const rgb=IND_COL.UI(pH);return res(`The universal indicator paper turns ${colName(rgb)}.`,`pH ≈ ${Math.round(pH)}`,{paper:rgb});}
  if(tool==='colorimeter'){const A=absorbance(v);if(A==null)return res('Not enough solution to fill the colorimeter cuvette (needs at least 0.3 cm³).','');const r=Math.max(0,A+(Math.random()-.5)*0.006);return res(`Absorbance at 450 nm: A = ${r.toFixed(3)}.`,'',{A:r});}
  const inGas=gs.length>0;
  if(['blue','red','dich'].includes(tool)&&!inGas){
    if(v.vol<0.1)return res('The paper is held at the mouth of the vessel: no change.','No gas evolved');
    const lit=tool==='blue'?(pH<5?'turns red':'remains blue'):tool==='red'?(pH>8?'turns blue':'remains red'):'remains orange';
    return res(`No gas is being evolved. When dipped into the solution, the ${tool==='dich'?'orange paper':(tool+' litmus paper')} ${lit}.`,tool==='blue'&&pH<5?'Solution is acidic':tool==='red'&&pH>8?'Solution is alkaline':'',{paper:tool==='blue'?(pH<5?[210,50,50]:[60,90,200]):tool==='red'?(pH>8?[60,90,200]:[210,50,50]):[238,130,30]});
  }
  if(!inGas&&['burn','glow','rodHCl','rodNH3'].includes(tool)){
    return res(tool==='burn'?'No gas is evolved; the splint simply burns at the mouth of the tube.':tool==='glow'?'No gas is evolved; the splint just glows.':'No white fumes.','No gas evolved',{flame:tool==='burn'?'bright':tool==='glow'?'glow':null,rod:tool.startsWith('rod')});
  }
  const G=gs.map(g=>GASES[g]);const names=gs;
  const any=(f)=>G.some(f);
  switch(tool){
    case 'blue':{const r=any(g=>g.blue==='red'),f=any(g=>g.blue==='faint');const t=r?'turns red':f?'turns faintly red':'remains blue';
      const extra=names.includes('NH3')&&names.includes('HCl')?' (red litmus turned blue first, then the blue litmus turned red as HCl diffused up)':'';
      return res(`Damp blue litmus paper ${t}${extra}.`,r||f?'Acidic gas':'Gas is not acidic',{paper:r?[210,50,50]:f?[175,80,140]:[60,90,200]});}
    case 'red':{const b=any(g=>g.red==='blue');return res(`Damp red litmus paper ${b?'turns blue':'remains red'}.`,b?'Alkaline gas: NH₃ present':'Gas is not alkaline',{paper:b?[60,90,200]:[210,50,50]});}
    case 'dich':{const g=any(g=>g.dich);return res(`Orange acidified K₂Cr₂O₇ paper ${g?'turns green':'remains orange'}.`,g?'Reducing gas: SO₂ present':'SO₂ absent',{paper:g?[70,150,70]:[238,130,30]});}
    case 'burn':{if(any(g=>g.burn==='pop'))return res('The gas burns with a squeaky "pop" sound.','H₂ present',{flame:'pop'});
      if(any(g=>g.burn==='bright'))return res('The splint burns more brightly.','Gas supports combustion (O₂)',{flame:'bright'});
      return res('The burning splint is extinguished.','Gas neither burns nor supports combustion',{flame:'out'});}
    case 'glow':{if(any(g=>g.glow==='relight'))return res('The glowing splint is rekindled (relights).','O₂ present',{flame:'relight'});
      if(any(g=>g.glow==='relight-weak'))return res('The glowing splint relights.','O₂ present in the gas mixture',{flame:'relight'});
      return res('The glowing splint is not rekindled.','O₂ absent',{flame:'glow'});}
    case 'rodHCl':{const y=any(g=>g.rodHCl);return res(y?'Dense white fumes are formed.':'No white fumes.',y?'NH₃ confirmed (NH₄Cl formed)':'NH₃ absent',{rod:true,fumes:y?[255,255,255]:null});}
    case 'rodNH3':{const y=any(g=>g.rodNH3);return res(y?'Dense white fumes are formed.':'No white fumes.',y?'HCl confirmed (NH₄Cl formed)':'HCl absent',{rod:true,fumes:y?[255,255,255]:null});}
  }
  return res('Nothing happens.','');
}
function flameColour(cats){
  if(cats.includes('Na+'))return ['golden yellow','Na⁺ present',[255,190,40]];
  if(cats.includes('K+'))return ['lilac (pale purple)','K⁺ present',[190,140,230]];
  if(cats.includes('Ca2+'))return ['brick-red','Ca²⁺ present',[215,70,40]];
  if(cats.includes('Cu2+'))return ['blue-green','Cu²⁺ present',[40,190,170]];
  if(cats.includes('Ba2+'))return ['apple-green','Ba²⁺ present',[140,210,70]];
  if(cats.includes('Pb2+'))return ['bluish-white','Pb²⁺ possibly present',[200,215,240]];
  return ['no characteristic colour (normal blue flame)','Na⁺, K⁺, Ca²⁺, Cu²⁺ absent',[110,150,255]];
}
if(typeof module!=='undefined')module.exports={newVessel,addLiquid,addSolid,transfer,equilibrate,tick,appearance,snap,describe,toolTest,passGas,flameColour,solvePH,setT:t=>{SIMT=t;}};

/* ---------- solids for filtration ---------- */
function removeSolid(v,key,amt){
  const H=HYD.find(h=>h.p===key);if(H){add(v,H.m,-amt);add(v,'Hn',H.n*amt);return;}
  const Sx=SALTS.find(s=>s[4]===key);if(Sx){add(v,Sx[0],-Sx[1]*amt);add(v,Sx[2],-Sx[3]*amt);return;}
  const C=SOLUB.find(s=>s[4]===key);if(C){add(v,C[0],-C[1]*amt);add(v,C[2],-C[3]*amt);return;}
  add(v,key,-amt);
}
function restoreSolid(v,key,amt){
  const H=HYD.find(h=>h.p===key);if(H){add(v,H.m,amt);add(v,'Hn',-H.n*amt);return;}
  const Sx=SALTS.find(s=>s[4]===key);if(Sx){add(v,Sx[0],Sx[1]*amt);add(v,Sx[2],Sx[3]*amt);return;}
  const C=SOLUB.find(s=>s[4]===key);if(C){add(v,C[0],C[1]*amt);add(v,C[2],C[3]*amt);return;}
  add(v,key,amt);
}
function absorbance(v){const d=v.d;if(!d||v.vol<0.3)return null;const V=d.V;let A=0;if(d.cplx.FeSCN)A+=4700*d.cplx.FeSCN/V;if((d.free.I2||0)>0)A+=1000*d.free.I2/V;if((d.free.Cr2O7||0)>0)A+=380*d.free.Cr2O7/V;if((d.free['MnO4-']||0)>0)A+=700*d.free['MnO4-']/V;return Math.min(3,A);}
