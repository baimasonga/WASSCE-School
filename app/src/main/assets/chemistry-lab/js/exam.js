/* =========================================================
   WAEC mock Paper 3 (Practical) — exam mode
   Q1 Quantitative (20) · Q2 Qualitative (18) · Q3 Practical activity (12)
   ========================================================= */
"use strict";
const NORM=t=>String(t||'').toLowerCase().replace(/²/g,'2').replace(/³/g,'3').replace(/⁺/g,'+').replace(/[⁻−–—]/g,'-').replace(/₂/g,'2').replace(/₃/g,'3').replace(/₄/g,'4').replace(/₆/g,'6').replace(/\s+/g,' ').trim();
const KW={
  blue:t=>/\bblue\b/.test(t),deepblue:t=>/\b(deep|dark|royal|intense|navy|ink)[\s-]*blue\b/.test(t),white:t=>/\bwhite\b/.test(t),green:t=>/green/.test(t),
  brown:t=>/brown|chocolate|rust/.test(t),yellow:t=>/yellow/.test(t),bloodred:t=>/blood[\s-]*red|deep red|wine[\s-]*red|\bred\b/.test(t),
  darkblue:t=>/(dark|deep|prussian|turnbull'?s?|navy)[\s-]*blue/.test(t),
  ppt:t=>/\b(precipitates?|ppte?|precipitated)\b/.test(t)&&!/\bno\s+(\w+\s+){0,2}(precipitates?|ppte?)\b/.test(t),
  noppt:t=>/\bno\s+(\w+\s+){0,2}(precipitates?|ppte?)\b|\bno (visible |observable )?(reaction|change)/.test(t),
  insol:t=>/\binsoluble\b|(does\s*not|doesn'?t|did\s*not|not)\s+dissolve|\bpersists?\b|\bremains?\b|\bunchanged\b|\bno change\b/.test(t),
  diss:t=>/\bdissolves?\b|\bdissolved\b|\bsoluble\b|\bclear\b/.test(t)&&!/\binsoluble\b|(does\s*not|doesn'?t|did\s*not|not)\s+dissolve/.test(t),
  colourless:t=>/colou?rless/.test(t),gas:t=>/gas|fume|effervesc|pungent|choking|smell/.test(t),litblue:t=>/blue/.test(t),
  brownring:t=>/brown[\s-]*ring/.test(t),junction:t=>/junction|interface|between|boundary|where the/.test(t),colour:t=>/colou?r|solution|complex/.test(t),
};
const ION={cu:/\bcu\s*\(?\s*(2\+|ii\b)|copper/,fe2:/\bfe\s*\(?\s*(2\+|ii\b)|iron\s*\(?\s*ii\b|ferrous/,fe3:/\bfe\s*\(?\s*(3\+|iii\b)|iron\s*\(?\s*iii\b|ferric/,
  zn:/\bzn|zinc/,pb:/\bpb|lead/,ca:/\bca\b|ca\s*2\+|ca2|calcium/,nh4:/nh\s*4|ammonium/,nh3:/nh\s*3|ammonia/,
  amph:/\bzn|zinc|\bal\b|al\s*3|alumin|\bpb|lead/,pbal:/\bpb|lead|\bal\b|al\s*3|alumin/,
  so4:/so\s*4|sulphate|sulfate|tetraoxosulphate/,cl:/\bcl\b|cl\s*-|chloride/,no3:/no\s*3|nitrate|trioxonitrate/,absent:/absent|not present|no (coloured|transition)/};
const ION_NAME={cu:'Cu²⁺',fe2:'Fe²⁺',fe3:'Fe³⁺',zn:'Zn²⁺',pb:'Pb²⁺',ca:'Ca²⁺',nh4:'NH₄⁺',so4:'SO₄²⁻',cl:'Cl⁻',no3:'NO₃⁻'};
const grp=(t,g)=>g.split('|').some(k=>KW[k](t));
const allOf=(t,list)=>list.every(g=>grp(t,g));
const ionHit=(t,keys)=>keys.some(k=>ION[k].test(t));

/* ---------- Q1 variants ---------- */
function makeQ1(){
  const kind=rpick(['hcl_na2co3','h2so4_naoh','ch3cooh_naoh','kmno4_fe']);
  const T=21+Math.random()*7; // target supervisor titre
  const clone=(base,id,name,extra={})=>({...CHEM[base],...extra,id,n:name,short:id.replace('X',''),cat:'Examination solutions',use:'Examination solution: see the question paper.',rx:'',real:base});
  const scaled=(base,id,name,factor,extra={})=>{const c=clone(base,id,name,extra);c.comp={};for(const k in CHEM[base].comp)c.comp[k]=CHEM[base].comp[k]*factor;c.conc='see question';return c;};
  let V;
  if(kind==='hcl_na2co3'){const cA=sig3(0.05*25*2/T);V={kind,cA,veq:0.05*25*2/cA,A:scaled('hcl01','XA','A: hydrochloric acid',cA/0.1),B:clone('na2co3s','XB','B: sodium trioxocarbonate(IV), 0.0500 mol dm⁻³'),
    ind:['mo'],given:'methyl orange',
    rubric:`<b>A</b> is a solution of hydrochloric acid of unknown concentration. <b>B</b> is a solution containing 0.0500 mol dm⁻³ of anhydrous sodium trioxocarbonate(IV), Na₂CO₃.<br>Put A into the burette and titrate it against 25.0 cm³ portions of B using <b>methyl orange</b> as indicator. Repeat the titration to obtain concordant titres.`,
    eqn:'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂',atoms:'[H = 1.0, Cl = 35.5]',M:36.5,
    calc:[{k:'c1',q:'the amount of Na₂CO₃ in 25.0 cm³ of B',u:'mol',f:a=>0.05*25/1000},{k:'c2',q:'the amount of HCl in the average volume of A used',u:'mol',f:(a,s)=>2*s.c1},{k:'c3',q:'the concentration of A in mol dm⁻³',u:'mol dm⁻³',f:(a,s)=>s.c2*1000/a},{k:'c4',q:'the concentration of A in g dm⁻³',u:'g dm⁻³',f:(a,s)=>s.c3*36.5}],
    model:a=>`n(Na₂CO₃) = 0.0500 × 25.0/1000 = 1.25 × 10⁻³ mol; n(HCl) = 2 × 1.25 × 10⁻³ = 2.50 × 10⁻³ mol; C(A) = 2.50 × 10⁻³ × 1000/${a.toFixed(2)} = ${(2.5/a).toFixed(4)} mol dm⁻³; mass conc = ${(2.5/a).toFixed(4)} × 36.5 = ${(2.5/a*36.5).toFixed(2)} g dm⁻³`};}
  if(kind==='h2so4_naoh'){const cA=sig3(0.1*25/(2*T));V={kind,cA,veq:0.1*25/(2*cA),A:scaled('h2so4d','XA','A: tetraoxosulphate(VI) acid',cA/1),B:clone('naoh01','XB','B: sodium hydroxide, 0.100 mol dm⁻³'),
    ind:['mo','mr','pp'],given:null,
    rubric:`<b>A</b> is a solution of tetraoxosulphate(VI) acid, H₂SO₄, of unknown concentration. <b>B</b> is 0.100 mol dm⁻³ sodium hydroxide solution.<br>Put A into the burette and titrate it against 25.0 cm³ portions of B using a <b>suitable indicator</b>. Repeat to obtain concordant titres.`,
    eqn:'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',atoms:'[H = 1.0, O = 16.0, S = 32.0]',M:98,
    calc:[{k:'c1',q:'the amount of NaOH in 25.0 cm³ of B',u:'mol',f:()=>0.1*25/1000},{k:'c2',q:'the amount of H₂SO₄ in the average volume of A used',u:'mol',f:(a,s)=>s.c1/2},{k:'c3',q:'the concentration of A in mol dm⁻³',u:'mol dm⁻³',f:(a,s)=>s.c2*1000/a},{k:'c4',q:'the concentration of A in g dm⁻³',u:'g dm⁻³',f:(a,s)=>s.c3*98}],
    model:a=>`n(NaOH) = 0.100 × 25.0/1000 = 2.50 × 10⁻³ mol; n(H₂SO₄) = ½ × 2.50 × 10⁻³ = 1.25 × 10⁻³ mol; C(A) = 1.25 × 10⁻³ × 1000/${a.toFixed(2)} = ${(1.25/a).toFixed(4)} mol dm⁻³; × 98 = ${(1.25/a*98).toFixed(2)} g dm⁻³`};}
  if(kind==='ch3cooh_naoh'){const cA=sig3(0.1*25/T);V={kind,cA,veq:0.1*25/cA,A:scaled('ch3cooh','XA','A: ethanoic acid',cA/2),B:clone('naoh01','XB','B: sodium hydroxide, 0.100 mol dm⁻³'),
    ind:['pp'],given:null,
    rubric:`<b>A</b> is a solution of ethanoic acid, CH₃COOH, of unknown concentration. <b>B</b> is 0.100 mol dm⁻³ sodium hydroxide solution.<br>Put A into the burette and titrate it against 25.0 cm³ portions of B using a <b>suitable indicator</b>. Repeat to obtain concordant titres.`,
    eqn:'CH₃COOH + NaOH → CH₃COONa + H₂O',atoms:'[H = 1.0, C = 12.0, O = 16.0]',M:60,
    calc:[{k:'c1',q:'the amount of NaOH in 25.0 cm³ of B',u:'mol',f:()=>0.1*25/1000},{k:'c2',q:'the amount of CH₃COOH in the average volume of A used',u:'mol',f:(a,s)=>s.c1},{k:'c3',q:'the concentration of A in mol dm⁻³',u:'mol dm⁻³',f:(a,s)=>s.c2*1000/a},{k:'c4',q:'the concentration of A in g dm⁻³',u:'g dm⁻³',f:(a,s)=>s.c3*60}],
    model:a=>`n(NaOH) = 2.50 × 10⁻³ mol = n(CH₃COOH); C(A) = 2.50 × 10⁻³ × 1000/${a.toFixed(2)} = ${(2.5/a).toFixed(4)} mol dm⁻³; × 60 = ${(2.5/a*60).toFixed(2)} g dm⁻³`};}
  if(kind==='kmno4_fe'){const cB=sig3(0.02*T*5/25);const B=scaled('feso4','XB','B: iron(II) tetraoxosulphate(VI) solution',cB/0.1);B.comp.Hn=0.03;
    V={kind,cA:cB,veq:cB*25/(5*0.02),A:clone('kmno4','XA','A: KMnO₄, 0.0200 mol dm⁻³'),B,ind:[],given:'none',
    rubric:`<b>A</b> is 0.0200 mol dm⁻³ potassium tetraoxomanganate(VII), KMnO₄. <b>B</b> is a solution of iron(II) tetraoxosulphate(VI), FeSO₄, of unknown concentration.<br>Put A into the burette. Pipette 25.0 cm³ of B into a conical flask, add about 10 cm³ of dilute H₂SO₄ and titrate with A. Repeat to obtain concordant titres.`,
    eqn:'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O',atoms:'[O = 16.0, S = 32.0, Fe = 56.0]',M:152,
    calc:[{k:'c1',q:'the amount of MnO₄⁻ in the average volume of A used',u:'mol',f:a=>0.02*a/1000},{k:'c2',q:'the amount of Fe²⁺ in 25.0 cm³ of B',u:'mol',f:(a,s)=>5*s.c1},{k:'c3',q:'the concentration of B in mol dm⁻³',u:'mol dm⁻³',f:(a,s)=>s.c2*1000/25},{k:'c4',q:'the concentration of FeSO₄ in B in g dm⁻³',u:'g dm⁻³',f:(a,s)=>s.c3*152}],
    model:a=>`n(MnO₄⁻) = 0.0200 × ${a.toFixed(2)}/1000 = ${(0.02*a/1000).toExponential(3)} mol; n(Fe²⁺) = 5 × that = ${(0.1*a/1000).toExponential(3)} mol; C(B) = that × 1000/25.0 = ${(0.1*a/25).toFixed(4)} mol dm⁻³; × 152 = ${(0.1*a/25*152).toFixed(2)} g dm⁻³`};}
  return V;
}
function sig3(x){return Number(x.toPrecision(3));}

/* ---------- Q2 salts ---------- */
const Q2SALTS=[{id:'cuso4',cat:'cu',an:'so4'},{id:'feso4',cat:'fe2',an:'so4'},{id:'fecl3',cat:'fe3',an:'cl'},{id:'znso4',cat:'zn',an:'so4'},{id:'pbno3',cat:'pb',an:'no3'},{id:'cacl2',cat:'ca',an:'cl'},{id:'nh4cl',cat:'nh4',an:'cl'}];
const CAT_SPEC={
 cu:{a:{p1:['blue'],inf:['cu'],m:['Blue solution','Cu²⁺ probably present']},b:{p1:['blue','ppt'],p2:['insol'],inf:['cu'],m:['Blue gelatinous precipitate, insoluble in excess NaOH(aq)','Cu²⁺ present']},c:{p1:['blue','ppt'],p2:['diss','deepblue'],inf:['cu'],m:['Blue precipitate which dissolves in excess NH₃(aq) to give a deep blue solution','Cu²⁺ confirmed']},e:{rg:'k4fecn6',test:'To a portion of C, add a few drops of potassium hexacyanoferrate(II), K₄Fe(CN)₆(aq).',p1:['brown'],p2:['ppt'],inf:['cu'],m:['Reddish-brown (chocolate) precipitate','Cu²⁺ confirmed']}},
 fe2:{a:{p1:['green'],inf:['fe2'],m:['Pale green solution','Fe²⁺ probably present']},b:{p1:['green','ppt'],p2:['insol'],inf:['fe2'],m:['Green gelatinous precipitate, insoluble in excess (turns brown on standing)','Fe²⁺ present']},c:{p1:['green','ppt'],p2:['insol'],inf:['fe2'],m:['Green precipitate, insoluble in excess NH₃(aq)','Fe²⁺ present']},e:{rg:'k3fecn6',test:'To a portion of C, add a few drops of potassium hexacyanoferrate(III), K₃Fe(CN)₆(aq).',p1:['darkblue'],p2:['ppt'],inf:['fe2'],m:['Dark blue precipitate','Fe²⁺ confirmed']}},
 fe3:{a:{p1:['yellow|brown'],inf:['fe3'],m:['Yellow-brown solution','Fe³⁺ probably present']},b:{p1:['brown','ppt'],p2:['insol'],inf:['fe3'],m:['Reddish-brown gelatinous precipitate, insoluble in excess','Fe³⁺ present']},c:{p1:['brown','ppt'],p2:['insol'],inf:['fe3'],m:['Reddish-brown precipitate, insoluble in excess NH₃(aq)','Fe³⁺ present']},e:{rg:'kscn',test:'To a portion of C, add a few drops of potassium thiocyanate, KSCN(aq).',p1:['bloodred'],p2:['colour'],inf:['fe3'],m:['Blood-red colouration','Fe³⁺ confirmed']}},
 zn:{a:{p1:['colourless'],inf:['absent','zn'],m:['Colourless solution','Coloured (transition metal) ions such as Cu²⁺, Fe²⁺, Fe³⁺ absent']},b:{p1:['white','ppt'],p2:['diss'],inf:['amph'],m:['White gelatinous precipitate, soluble in excess NaOH(aq)','Zn²⁺, Al³⁺ or Pb²⁺ present']},c:{p1:['white','ppt'],p2:['diss'],inf:['zn'],m:['White precipitate, soluble in excess NH₃(aq) to give a colourless solution','Zn²⁺ present']},e:{rg:'k4fecn6',test:'To a portion of C, add a few drops of K₄Fe(CN)₆(aq).',p1:['white'],p2:['ppt'],inf:['zn'],m:['White precipitate','Zn²⁺ confirmed']}},
 pb:{a:{p1:['colourless'],inf:['absent','pb'],m:['Colourless solution','Coloured ions absent']},b:{p1:['white','ppt'],p2:['diss'],inf:['amph'],m:['White precipitate, soluble in excess NaOH(aq)','Zn²⁺, Al³⁺ or Pb²⁺ present']},c:{p1:['white','ppt'],p2:['insol'],inf:['pbal'],m:['White precipitate, insoluble in excess NH₃(aq)','Pb²⁺ or Al³⁺ present']},e:{rg:'ki',test:'To a portion of C, add a few drops of potassium iodide, KI(aq).',p1:['yellow'],p2:['ppt'],inf:['pb'],m:['Yellow precipitate','Pb²⁺ confirmed']}},
 ca:{a:{p1:['colourless'],inf:['absent','ca'],m:['Colourless solution','Coloured ions absent']},b:{p1:['white','ppt'],p2:['insol'],inf:['ca'],m:['White precipitate, insoluble in excess NaOH(aq)','Ca²⁺ present']},c:{p1:['noppt'],p2:['noppt'],inf:['ca'],m:['No precipitate (in drops or in excess)','Ca²⁺ present']},e:{rg:'nh4ox',test:'To a portion of C, add ammonium ethanedioate (oxalate) solution.',p1:['white'],p2:['ppt'],inf:['ca'],m:['White precipitate','Ca²⁺ confirmed']}},
 nh4:{a:{p1:['colourless'],inf:['absent','nh4'],m:['Colourless solution','Coloured ions absent']},b:{p1:['noppt'],p2:['noppt'],inf:['nh4','absent'],m:['No precipitate','Ca²⁺, Zn²⁺, Pb²⁺, Cu²⁺, Fe²⁺, Fe³⁺ absent; NH₄⁺ possible']},c:{p1:['noppt'],p2:['noppt'],inf:['nh4','absent'],m:['No visible change','NH₄⁺ possible']},e:{rg:'warm',test:'Warm a portion of C with NaOH(aq) and test any gas evolved with damp red litmus paper.',p1:['gas'],p2:['litblue'],inf:['nh4','nh3'],m:['Colourless gas with a pungent smell; turns damp red litmus blue','NH₃ evolved; NH₄⁺ confirmed']}},
};
const AN_SPEC={
 so4:{test:'To a portion of C, add BaCl₂(aq), then excess dilute HCl.',p1:['white','ppt'],p2:['insol'],inf:['so4'],m:['White precipitate, insoluble in excess dilute HCl','SO₄²⁻ present']},
 cl:{test:'To a portion of C, add dilute HNO₃, then AgNO₃(aq), then excess NH₃(aq).',p1:['white','ppt'],p2:['diss'],inf:['cl'],m:['White precipitate, soluble in excess NH₃(aq)','Cl⁻ present']},
 no3:{test:'To a portion of C, add freshly prepared FeSO₄(aq), then carefully pour conc. H₂SO₄ down the side of the tube.',p1:['brownring'],p2:['junction'],inf:['no3'],m:['A brown ring forms at the junction of the two liquids','NO₃⁻ present']},
};

/* ---------- Q3 bank ---------- */
const Q3BANK=[
 {q:'State <b>two</b> precautions to observe when taking a burette reading.',pool:[/eye[\s-]*level|level with (your|the) eye/,/meniscus/,/air[\s-]*bubble/,/vertical|upright|perpendicular/,/funnel/,/(rinse|wash).*(acid|solution|burette)/],model:'Read at eye level; read the bottom of the meniscus; remove air bubbles from the tip; keep the burette vertical; remove the funnel before reading.'},
 {q:'Why is the burette rinsed with the acid, and not with distilled water, before filling?',pool:[/dilut|change (the )?concentration|concentration (would|will) (change|decrease|reduce)/],marks:2,model:'Water left in the burette would dilute the acid and change its concentration.'},
 {q:'Why should the conical flask <b>not</b> be rinsed with solution B before the titration?',pool:[/(mole|amount|quantity|more|extra|excess).*(b|base|alkali|solution|increase)|(increase|change).*(amount|mole|quantity)/],marks:2,model:'Rinsing leaves extra B in the flask, increasing the amount (moles) of B and giving a larger titre.'},
 {q:'Give <b>one</b> reason why a white tile is placed under the conical flask during titration.',pool:[/colou?r change|end[\s-]*point|see|observ|visib|clear(ly)?|detect/],marks:2,model:'To see the colour change at the end point clearly.'},
 {q:'Name the gas evolved when NH₄Cl is warmed with NaOH(aq), and give <b>one</b> test for it.',parts:[[/ammonia|nh\s*3/],[/red litmus.*blue|blue.*litmus|turns? .*blue|white fumes|dense white|conc(entrated)?\.? ?hcl|hydrochloric/]],model:'Ammonia (NH₃). It turns damp red litmus blue, or gives dense white fumes with a rod dipped in conc. HCl.'},
 {q:'State what is observed when carbon(IV) oxide is bubbled into lime water (i) for a short time; (ii) for a long time.',parts:[[/milky|white (precipitate|ppt)|cloudy|turbid/],[/clear|colou?rless|disappear|dissolve/]],model:'(i) Lime water turns milky; (ii) the milkiness disappears and the solution becomes clear again.'},
 {q:'Why is dilute HNO₃ added before AgNO₃(aq) in the test for chloride ions?',pool:[/carbonate|co\s*3|sulphite|sulfite|so\s*3|other (anions|ions)|interfer|false|prevent .*precipitat/],marks:2,model:'To remove CO₃²⁻ (and SO₃²⁻) ions, which would otherwise also give a white precipitate with AgNO₃.'},
 {q:'Name <b>one</b> reagent that distinguishes Fe²⁺ from Fe³⁺ and state the observation with Fe³⁺.',parts:[[/kscn|thiocyanate|naoh|sodium hydroxide|nh\s*3|ammonia|k\s*4|hexacyanoferrate/],[/blood[\s-]*red|reddish[\s-]*brown|red[\s-]*brown|(dark|prussian) blue/]],model:'KSCN(aq): blood-red colouration with Fe³⁺ (or NaOH(aq): reddish-brown precipitate with Fe³⁺).'},
 {q:'What is observed when acidified KMnO₄ is added to a solution of iron(II) ions?',pool:[/decolou?ri[sz]|colou?rless|(purple|pink).*(disappear|discharg|fade)/],marks:2,model:'The purple colour of KMnO₄ is discharged (decolourised).'},
 {q:'What is observed when iodine solution is added to a starch solution?',pool:[/blue[\s-]*black|dark blue|black/],marks:2,model:'A blue-black colouration.'},
 {q:'State <b>two</b> observations when zinc granules are added to dilute hydrochloric acid.',pool:[/effervescence|bubbles?|fizz|gas/,/dissolv|disappear|(granules?|zinc).*(smaller|decreas|reduc)/,/warm|heat|hot|exothermic/,/pop/],model:'Effervescence (bubbles of colourless gas); the zinc dissolves/gets smaller; the tube becomes warm.'},
 {q:'Why is ethanol warmed in a water bath and not directly over a Bunsen flame?',pool:[/flammab|catch(es)? fire|ignit|burn/],marks:2,model:'Ethanol is flammable; its vapour can catch fire.'},
 {q:'Define the <b>end point</b> of a titration.',pool:[/indicator.*chang|colou?r chang|reaction is complete|exact(ly)? (neutrali|react)|just (complete|neutrali)|equivalen/],marks:2,model:'The point at which the indicator just changes colour, showing that the reaction is just complete.'},
 {q:'Which indicator is most suitable for titrating ethanoic acid with sodium hydroxide?',mcq:['Methyl orange','Methyl red','Phenolphthalein','Litmus'],ans:2,model:'Phenolphthalein (weak acid / strong base).'},
 {q:'Which gas relights a glowing splint?',mcq:['Hydrogen','Oxygen','Carbon(IV) oxide','Ammonia'],ans:1,model:'Oxygen.'},
 {q:'Which ion gives a deep blue solution with excess aqueous ammonia?',mcq:['Zn²⁺','Fe²⁺','Cu²⁺','Al³⁺'],ans:2,model:'Cu²⁺ (forms [Cu(NH₃)₄]²⁺).'},
 {q:'What is the colour of methyl orange in an acidic solution?',mcq:['Yellow','Orange','Red','Colourless'],ans:2,model:'Red.'},
 {q:'Give <b>one</b> use of a pipette and <b>one</b> use of a burette.',parts:[[/pipette.*(fixed|accurate|exact|known|definite|25|transfer|measur)|(fixed|definite|exact) volume/],[/burette.*(variable|vary|accurate|drop|titrat|deliver|measur)|variable volume/]],model:'Pipette: to transfer a fixed, accurately known volume. Burette: to deliver variable volumes accurately (titration).'},
];
function markQ3Item(it,ans){
  if(it.mcq)return {got:+ans===it.ans?2:0,max:2};
  const t=NORM(ans);if(!t)return {got:0,max:2};
  if(it.parts){let g=0;for(const p of it.parts)if(p.some(r=>r.test(t)))g++;return {got:g,max:2};}
  let g=0;for(const r of it.pool)if(r.test(t))g++;return {got:Math.min(2,g*(it.marks===2?2:1)),max:2};
}


/* ---------- Q3(a) bench practical activities ---------- */
function makeQ3act(){
  const kind=rpick(['mp','ph','heatsol','equil']);
  const ev=()=>L.events;
  if(kind==='mp'){const rid=rpick(['s_naph','s_naphimp','s_benz']);const D=unknown(rid,'D',{f:'organic solid',st:'solid'});const pure=rid!=='s_naphimp';
    return {kind,stock:[D],glass:['mpapp'],tools:[],
      rubric:`<b>D</b> is an organic solid. Using the melting-point apparatus, determine the temperature at which D starts to melt and the temperature at which it is completely melted. State whether D is pure and give a reason.`,
      fields:[['mp_s','D starts to melt at (°C)'],['mp_e','D is completely melted at (°C)'],['mp_pure','Is D pure or impure?'],['mp_why','Reason']],
      mark(A,add){const rec=w=>ev().some(e=>e.type==='mp'&&e.chem===D.id&&e.which===w);const s=parseNum(A.mp_s),e=parseNum(A.mp_e);
        const ds=Math.abs(s-D.mp[0]),de=Math.abs(e-D.mp[1]);
        add('(a) Start of melting',rec('s')&&isFinite(ds)?(ds<=1.5?2:ds<=3?1:0):0,2,rec('s')?`D starts to melt at about ${D.mp[0].toFixed(1)} °C.`:'Melting was not observed at the bench.');
        add('(a) Completely melted',rec('e')&&isFinite(de)&&de<=1.5?1:0,1,`Completely melted at about ${D.mp[1].toFixed(1)} °C.`);
        const t=NORM(A.mp_pure);const saidImp=/impure|not pure/.test(t),saidPure=/\bpure\b/.test(t)&&!saidImp;
        add('(a) Purity judgement',(pure&&saidPure)||(!pure&&saidImp)?2:0,2,`D is ${pure?'pure':'impure'}.`);
        add('(a) Reason',/sharp|narrow|range|lower|below|wide|broad|literature|accepted|80|122/.test(NORM(A.mp_why))?1:0,1,pure?'It melts sharply (narrow range) at the accepted melting point.':'It melts below the accepted value and over a wide range.');}};}
  if(kind==='ph'){const defs=[['hcl01',1,1.0,'strong','acid'],['ch3cooh',0.05,2.9,'weak','acid'],['nacl',1,7.0,'','neutral'],['nahco3',1,8.3,'weak','alkali'],['nh3aq',0.05,11.1,'weak','alkali'],['naoh01',1,13.0,'strong','alkali']];
    const two=shuffle(defs).slice(0,2);const U=two.map((d,i)=>{const u=scaledSol(d[0],'EF'[i],d[1],{f:'0.1 mol dm⁻³ solution',conc:'0.1 mol dm⁻³'});u.cls=d;return u;});
    return {kind,stock:[...U,CHEM.ui],glass:[],tools:['uipaper'],
      rubric:`<b>E</b> and <b>F</b> are 0.1 mol dm⁻³ solutions. Determine the pH of each using universal indicator and the colour chart. Classify each as a strong acid, weak acid, neutral, weak alkali or strong alkali.`,
      fields:[['ph_E','pH of E'],['cl_E','E is a…'],['ph_F','pH of F'],['cl_F','F is a…']],
      mark(A,add){U.forEach((u,i)=>{const L1='EF'[i];const tested=ev().some(e=>(e.type==='tool'&&e.tool==='uipaper'&&vesselHist(e.vessel).includes(u.id))||(e.type==='add'&&e.chem==='ui'&&e.contents.includes(u.id)));
        const ph=parseNum(A['ph_'+L1]);add(`(a) pH of ${L1}`,tested&&isFinite(ph)&&Math.abs(ph-u.cls[2])<=1.01?1:0,1,tested?`pH ≈ ${u.cls[2].toFixed(1)}.`:`${L1} was not tested with universal indicator at the bench.`);
        const t=NORM(A['cl_'+L1]);const [,,,str,typ]=u.cls;let g=0;
        if(typ==='neutral')g=/neutral/.test(t)?2:0;else{const tOK=typ==='acid'?/acid/.test(t)&&!/alkal|bas/.test(t):/alkal|bas/.test(t);const sOK=new RegExp('\\b'+str).test(t);g=(tOK?1:0)+(tOK&&sOK?1:0);}
        add(`(a) Classification of ${L1}`,g,2,`${L1} is ${typ==='neutral'?'neutral':`a ${str} ${typ}`}.`);});}};}
  if(kind==='heatsol'){const rid=rpick(['s_naoh','s_kno3','s_nh4cl']);const G=unknown(rid,'G',{f:'white crystalline solid',st:'solid'});const exo=rid==='s_naoh';
    const cup=()=>vessels().find(v=>v.type==='cup'&&(v.hist||[]).includes(G.id));
    return {kind,stock:[G,CHEM.water],glass:['cup','balance'],tools:['thermo'],
      rubric:`<b>G</b> is a solid. Put 50 cm³ of distilled water into a polystyrene cup and note its temperature. Dissolve about 2 g of G in the water, stir, and record the highest or lowest temperature reached. State whether dissolving G is exothermic or endothermic, and suggest a use for it.`,
      fields:[['hs_i','Initial temperature (°C)'],['hs_f','Highest/lowest temperature reached (°C)'],['hs_dT','Temperature change (K)'],['hs_type','Dissolving G is…'],['hs_use','Suggested use']],
      mark(A,add){const c=cup();const ini=c?c.mixT0:NaN;const ext=c?(exo?c.maxT:c.minT):NaN;const ui=parseNum(A.hs_i),uf=parseNum(A.hs_f),ud=parseNum(A.hs_dT);
        add('(a) Initial temperature',c&&Math.abs(ui-ini)<=0.31?1:0,1,c?`Initial temperature ${ini.toFixed(1)} °C.`:'G was not dissolved in a cup at the bench.');
        add('(a) Highest/lowest temperature',c&&isFinite(ext)&&Math.abs(uf-ext)<=0.51?1:0,1,c?`${exo?'Highest':'Lowest'} temperature ${isFinite(ext)?ext.toFixed(1):'—'} °C.`:'');
        add('(a) Temperature change',isFinite(ud)&&isFinite(ui)&&isFinite(uf)&&Math.abs(Math.abs(ud)-Math.abs(uf-ui))<=0.11&&c?1:0,1,'ΔT = final − initial (from your own readings).');
        const t=NORM(A.hs_type);const saidEndo=/endo/.test(t),saidExo=/exo/.test(t)&&!saidEndo;
        add('(a) Exothermic or endothermic',(exo&&saidExo)||(!exo&&saidEndo)?2:0,2,`Dissolving G is ${exo?'exothermic (temperature rises)':'endothermic (temperature falls)'}.`);
        add('(a) Use',(exo?/hot|warm|heat/:/cold|cool|ice|chill/).test(NORM(A.hs_use))?1:0,1,exo?'Self-heating (hot) packs.':'Instant cold packs for sprains.');}};}
  // equilibrium
  const H={...CHEM.water,id:'XH',n:'H: iron(III) thiocyanate equilibrium mixture',short:'H',f:'Fe³⁺/SCN⁻ mixture',cat:'Examination solutions',comp:{'Fe3+':.001,'SCN-':.001,'Cl-':.003,'K+':.001,Hn:.0002},bot:[230,170,160],use:'Examination solution: see the question paper.',rx:''};
  const did=(pred)=>ev().some(pred);
  return {kind,stock:[H],glass:['bath'],tools:[],
    rubric:`<b>H</b> is a pale red mixture in which the equilibrium Fe³⁺(aq) + SCN⁻(aq) ⇌ [Fe(SCN)]²⁺(aq) has been set up. Put about 2 cm³ of H into each of four test tubes. To the 1st add a few drops of FeCl₃(aq); to the 2nd add a few drops of KSCN(aq); warm the 3rd; to the 4th add a few drops of NaOH(aq). Record your observations and explain the effect of warming.`,
    fields:[['eq_1','Observation: + FeCl₃(aq)'],['eq_2','Observation: + KSCN(aq)'],['eq_3','Observation: on warming'],['eq_4','Observation: + NaOH(aq)'],['eq_x','Explain the effect of adding Fe³⁺ and of warming']],
    mark(A,add){const deep=/deep|dark|intens|more red|redder|increase/;const pale=/pale|light|fade|less|decolou|reduc|disappear/;
      add('(a) + FeCl₃: observation',did(e=>e.type==='add'&&e.chem==='fecl3'&&e.contents.includes('XH'))&&deep.test(NORM(A.eq_1))?1:0,1,'The red colour deepens.');
      add('(a) + KSCN: observation',did(e=>e.type==='add'&&e.chem==='kscn'&&e.contents.includes('XH'))&&deep.test(NORM(A.eq_2))?1:0,1,'The red colour deepens.');
      add('(a) Warming: observation',did(e=>e.type==='heat'&&vesselHist(e.vessel).includes('XH'))&&pale.test(NORM(A.eq_3))?1:0,1,'The red colour becomes paler.');
      add('(a) + NaOH: observation',did(e=>e.type==='add'&&e.chem==='naoh2'&&e.contents.includes('XH'))&&(pale.test(NORM(A.eq_4))||/brown|precipitate/.test(NORM(A.eq_4)))?1:0,1,'The red colour fades (Fe³⁺ removed as Fe(OH)₃).');
      const x=NORM(A.eq_x);add('(a) Explanation',(/right|forward|product/.test(x)?1:0)+(/exothermic|left|backward|reverse|endothermic direction/.test(x)?1:0),2,'Adding Fe³⁺ shifts the equilibrium to the right (more complex). The forward reaction is exothermic, so warming shifts it to the left.');}};
}

/* ---------- exam state ---------- */
const EXAM={
  make(){
    const V=makeQ1();const s=rpick(Q2SALTS);const C=unknown(s.id,'C',{f:'aqueous solution of salt C',conc:'see question'});
    const q3=shuffle(Q3BANK).slice(0,3);const act=makeQ3act();
    L.exam={V,salt:s,C,q3,act,ans:{tt:[{},{},{},{}]},tab:'q1',started:false,submitted:false,dur:120*60,cand:{}};
    const stock=[V.A,V.B,...S(['mo','mr','pp']),...(V.kind==='kmno4_fe'?S(['h2so4d']):[]),C,...S(['naoh2','nh3aq','hcl2','hno3d','h2so4c','bacl2','agno3','feso4','ki','k3fecn6','k4fecn6','kscn','nh4ox','fecl3','water']),...act.stock.filter(c=>c.id!=='water')];
    return {stock,glass:['tube','flask','beaker','burette','burner',...act.glass],tools:['red','blue','burn','glow','rodHCl','waft','thermo','wire',...act.tools],data:false,exam:true,objectives:[],questions:[],
      hint:'Mock examination in progress. Work carefully: no hints are given.',story:'',
      setup(){addItem('burette','burette',30,58);addItem('vessel','flask',190,390);addItem('vessel','flask',330,390);
        [480,540,600,660,720].forEach(x=>addItem('vessel','tube',x,320));addItem('burner','burner',800,380);renderAll();
        setTimeout(()=>EXAM.startModal(),50);}};
  },
  startModal(){
    $$('#exstart').forEach(x=>x.remove());if(!L.exam||L.exam.started)return;
    const hist=EXAM.history();
    const m=document.createElement('div');m.className='modal';m.id='exstart';
    m.innerHTML=`<div class="box" style="max-width:760px"><div class="tag" style="color:var(--accent);font-weight:700;font-size:12px;letter-spacing:.6px">West African Senior School Certificate Examination (mock)</div>
    <h2 style="margin:4px 0">Chemistry 3 (Practical): Alternative A</h2><div class="sub" style="color:var(--muted)">Answer <b>all</b> questions. Credit is given for strict adherence to instructions, for clear and accurate records of observations, and for correct inferences. All working must be shown.</div>
    <div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
      <label>Candidate name<input class="search" style="margin:4px 0 0;width:100%" id="exname" placeholder="e.g. Fatmata Kamara"></label>
      <label>Index number<input class="search" style="margin:4px 0 0;width:100%" id="exidx" placeholder="e.g. 4250123045"></label>
      <label>School<input class="search" style="margin:4px 0 0;width:100%" id="exsch" placeholder="e.g. Annie Walsh Memorial School"></label>
      <label>Time allowed<select class="search" style="margin:4px 0 0;width:100%" id="exdur"><option value="7200">2 hours (school candidates)</option><option value="5400">1 hour 30 minutes</option><option value="0">Untimed practice</option></select></label></div>
    <table class="obs" style="margin-bottom:12px"><tr><th>Question</th><th>Area</th><th>Marks</th></tr><tr><td>1</td><td>Quantitative analysis (titration at the bench)</td><td>20</td></tr><tr><td>2</td><td>Qualitative analysis of salt C (tests at the bench)</td><td>18</td></tr><tr><td>3</td><td>(a) Practical activity at the bench · (b) short questions</td><td>12</td></tr><tr><td></td><td><b>Total</b></td><td><b>50</b></td></tr></table>
    <div class="note warn">During the examination: the solution data panel, model inferences and hints are switched off. Your answers are typed into the <b>Answer booklet</b> below the bench. Only tests you actually carry out at the bench earn observation marks.</div>
    ${hist.length?`<details style="margin-top:10px"><summary>Your previous attempts (${hist.length})</summary><table class="obs">${hist.slice(-6).reverse().map(h=>`<tr><td>${new Date(h.d).toLocaleDateString()}</td><td>${h.total}/50</td><td><b>${h.grade}</b></td><td class="sub">${h.q1} · salt ${h.salt}</td></tr>`).join('')}</table></details>`:''}
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" id="excancel">Back to missions</button><button class="btn pri" id="exgo">Start the examination</button></div></div>`;
    document.body.appendChild(m);
    $('#excancel',m).onclick=()=>{m.remove();openScenarios();};
    $('#exgo',m).onclick=()=>{const E=L.exam;E.cand={name:$('#exname',m).value.trim()||'Candidate',idx:$('#exidx',m).value.trim(),school:$('#exsch',m).value.trim()};E.dur=+$('#exdur',m).value;E.started=Date.now();m.remove();EXAM.renderHeader();EXAM.renderBooklet(true);EXAM.timer();mentor('The examination has started. Read Question 1 in the answer booklet below the bench.');};
  },
  timer(){clearInterval(EXAM._t);EXAM._t=setInterval(()=>{const E=L.exam;if(!E||!E.started||E.submitted){clearInterval(EXAM._t);return;}EXAM.updatePill();
    if(E.dur){const left=E.dur-(Date.now()-E.started)/1000;if(left<=0){mentor('Time is up! Your script has been collected.','bad');EXAM.submit();}
      else if(left<300&&!E.w5){E.w5=1;mentor('⏰ 5 minutes remaining.','warn');}else if(left<1800&&!E.w30){E.w30=1;mentor('⏰ 30 minutes remaining.','warn');}}},1000);},
  stop(){clearInterval(EXAM._t);$('#exstart')?.remove();$('#exresult')?.remove();},
  clock(){const E=L.exam;if(!E.started)return '—';const el=(Date.now()-E.started)/1000;if(!E.dur){const m=Math.floor(el/60);return `${m}:${String(Math.floor(el%60)).padStart(2,'0')} elapsed`;}const l=Math.max(0,E.dur-el);const h=Math.floor(l/3600),m=Math.floor(l%3600/60),s=Math.floor(l%60);return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} left`;},
  updatePill(){const E=L.exam;$('#score').innerHTML=E.submitted&&E.result?`<span>Mock result</span><b>${E.result.total}/50</b><span>Grade <b>${E.result.grade}</b></span>`:`<span>⏱ <b class="mono">${EXAM.clock()}</b></span><span>${esc(E.cand.name||'')}</span>`;},
  renderHeader(){const E=L.exam;$('#mission').className='mission c-exam';$('#mission').innerHTML=`<div><div class="tag">WASSCE mock · Chemistry 3 (Practical)</div><h2>Mock Paper 3: ${E.dur?Math.round(E.dur/60)+' minutes':'untimed'}</h2><div class="story">${E.cand.name?`Candidate: <b>${esc(E.cand.name)}</b>${E.cand.idx?` · Index no. ${esc(E.cand.idx)}`:''}${E.cand.school?` · ${esc(E.cand.school)}`:''}<br>`:''}Answer all three questions in the <b>Answer booklet</b> below the bench. Q1 and Q2 must be carried out at the bench.</div></div><div><div class="tag">Paper</div><div class="objs"><div class="obj"><i></i><span>Q1 Quantitative analysis: 20 marks</span></div><div class="obj"><i></i><span>Q2 Qualitative analysis of salt C: 18 marks</span></div><div class="obj"><i></i><span>Q3 Practical activities: 12 marks</span></div></div></div>`;EXAM.updatePill();},

  /* ---------- answer booklet ---------- */
  renderBooklet(force){
    const E=L.exam;const body=$('#nbbody');$('#nbtabs').style.display='none';
    if(!force&&body.dataset.ex===E.tab+(E.submitted?'s':''))return;body.dataset.ex=E.tab+(E.submitted?'s':'');
    const ro=E.submitted?'disabled':'';const A=E.ans;const val=k=>esc(A[k]??'');
    const tabs=[['q1','Question 1 · 20'],['q2','Question 2 · 18'],['q3','Question 3 · 12'],['sub',E.submitted?'Results':'Hand in script']];
    let h=`<div class="tabs" style="margin:-12px -12px 12px">${tabs.map(([k,l])=>`<button data-x="${k}" class="${E.tab===k?'on':''}">${l}</button>`).join('')}</div>`;
    const V=E.V;
    if(E.tab==='q1'){
      h+=`<div class="qpaper"><p><b>1.</b> ${V.rubric}</p><p class="sub">Equation: ${V.eqn}. ${V.atoms}</p>
      <p><b>(a)</b> Tabulate your burette readings and calculate the average volume of A used.</p>
      <div style="overflow:auto"><table class="obs" style="max-width:640px"><thead><tr><th>Burette reading (cm³)</th><th>Rough</th><th>1st</th><th>2nd</th><th>3rd</th></tr></thead><tbody>
      <tr><td>Final reading</td>${[0,1,2,3].map(i=>`<td><input class="cell" data-tt="f${i}" value="${esc(A.tt[i].f||'')}" ${ro} inputmode="decimal"></td>`).join('')}</tr>
      <tr><td>Initial reading</td>${[0,1,2,3].map(i=>`<td><input class="cell" data-tt="i${i}" value="${esc(A.tt[i].i||'')}" ${ro} inputmode="decimal"></td>`).join('')}</tr>
      <tr><td><b>Volume of A used</b></td>${[0,1,2,3].map(i=>`<td class="mono" data-vv="${i}">—</td>`).join('')}</tr></tbody></table></div>
      <div class="exgrid"><label>Indicator used<input data-k="ind" value="${val('ind')}" ${ro} placeholder="${V.kind==='kmno4_fe'?'e.g. none (self-indicating)':'name of indicator'}"></label>
      <label>Colour change at end point: from<input data-k="cfrom" value="${val('cfrom')}" ${ro}></label><label>to<input data-k="cto" value="${val('cto')}" ${ro}></label>
      <label>Average volume of A used (cm³)<input data-k="avg" value="${val('avg')}" ${ro} inputmode="decimal"></label></div>
      <p><b>(b)</b> From your results and the information provided, calculate:</p>
      <div class="exgrid">${V.calc.map((c,i)=>`<label>(${['i','ii','iii','iv'][i]}) ${c.q} <span class="sub">[${c.u}]</span><input data-k="${c.k}" value="${val(c.k)}" ${ro} inputmode="decimal" placeholder="your answer (e.g. 3.6e-3)"></label>`).join('')}</div>
      <label class="sub" style="display:block;margin-top:8px">Working (shown to the examiner)<textarea data-k="work" rows="3" ${ro} style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px">${val('work')}</textarea></label></div>`;
    }
    if(E.tab==='q2'){const cs=CAT_SPEC[E.salt.cat],as=AN_SPEC[E.salt.an];
      const rows=[['a','Note the appearance (colour) of C.'],['b','To about 2 cm³ of C, add NaOH(aq) in drops and then in excess.'],['c','To about 2 cm³ of C, add NH₃(aq) in drops and then in excess.'],['d',as.test],['e',cs.e.test]];
      h+=`<div class="qpaper"><p><b>2.</b> <b>C</b> is a solution of a simple salt. Carry out the following exercises on C. Record your observations and identify any gas(es) evolved. State the conclusions you draw from the result of each test.</p>
      <table class="obs extable"><thead><tr><th style="width:26%">Test</th><th>Observation</th><th style="width:30%">Inference</th></tr></thead><tbody>
      ${rows.map(([k,t])=>`<tr><td>(${k}) ${t}</td><td><textarea data-k="o_${k}" rows="2" ${ro}>${val('o_'+k)}</textarea></td><td><textarea data-k="i_${k}" rows="2" ${ro}>${val('i_'+k)}</textarea></td></tr>`).join('')}</tbody></table>
      <div class="exgrid"><label>(f) The cation in C is<input data-k="cat" value="${val('cat')}" ${ro}></label><label>The anion in C is<input data-k="an" value="${val('an')}" ${ro}></label></div></div>`;}
    if(E.tab==='q3'){h+=`<div class="qpaper"><p><b>3. (a)</b> [6 marks] ${E.act.rubric}</p><div class="exgrid">${E.act.fields.map(([k,l])=>/_why$|_x$/.test(k)?`<label style="grid-column:1/-1">${l}<textarea data-k="${k}" rows="3" ${ro} style="border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit">${val(k)}</textarea></label>`:`<label>${l}<input data-k="${k}" value="${val(k)}" ${ro}></label>`).join('')}</div><p style="margin-top:14px"><b>(b)</b> Answer all parts. (2 marks each)</p>${E.q3.map((it,i)=>`<div class="q"><p>(${['i','ii','iii'][i]}) ${it.q}</p>${it.mcq?it.mcq.map((o,j)=>`<label><input type="radio" name="x3${i}" value="${j}" ${String(A['q3_'+i])===String(j)?'checked':''} ${ro}> ${esc(o)}</label>`).join(''):`<textarea data-k="q3_${i}" rows="2" ${ro} style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px">${val('q3_'+i)}</textarea>`}</div>`).join('')}</div>`;}
    if(E.tab==='sub'){
      if(!E.submitted){const filled=Object.keys(A).filter(k=>k!=='tt'&&String(A[k]).trim()).length;
        h+=`<div class="qpaper"><p>You have answered <b>${filled}</b> items and recorded <b>${L.runs.length}</b> titration(s) at the bench.</p><p class="sub">Check all three questions before handing in. You cannot change your answers afterwards.</p><div class="row"><button class="btn pri" id="exsub">Hand in my script for marking</button><span class="sub" id="exsubc"></span></div></div>`;}
      else h+=EXAM.resultHTML();}
    body.innerHTML=h;
    $$('[data-x]',body).forEach(b=>b.onclick=()=>{E.tab=b.dataset.x;EXAM.renderBooklet(true);});
    $$('[data-k]',body).forEach(el=>el.addEventListener('input',()=>{A[el.dataset.k]=el.value;EXAM.save();}));
    $$('input[type=radio]',body).forEach(r=>r.onchange=()=>{A['q3_'+r.name.slice(2)]=r.value;EXAM.save();});
    const upd=()=>{for(let i=0;i<4;i++){const f=parseFloat(A.tt[i].f),n=parseFloat(A.tt[i].i);const c=$(`[data-vv="${i}"]`,body);if(c)c.textContent=isFinite(f)&&isFinite(n)?(f-n).toFixed(2):'—';}};
    $$('[data-tt]',body).forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.tt;A.tt[+k.slice(1)][k[0]]=el.value;upd();EXAM.save();}));upd();
    const sb=$('#exsub',body);if(sb){let armed=false;sb.onclick=()=>{if(!armed){armed=true;sb.textContent='Click again to confirm';$('#exsubc').textContent='This is final.';setTimeout(()=>{armed=false;if(sb.isConnected){sb.textContent='Hand in my script for marking';$('#exsubc').textContent='';}},4000);return;}EXAM.submit();};}
    $('#exrev',body)?.addEventListener('click',()=>{L.revealed=true;L.exam.showLog=!L.exam.showLog;EXAM.renderBooklet(true);});
    $('#excopy',body)?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(EXAM.resultText());mentor('Result copied.');}catch(e){mentor('Copy not allowed here: select the text and copy it manually.','warn');}});
    $('#exnew',body)?.addEventListener('click',()=>loadScenario(SCENARIOS.find(s=>s.id==='exam')));
  },
  save(){},

  /* ---------- marking ---------- */
  mark(){
    const E=L.exam,A=E.ans,V=E.V,items1=[],items2=[],items3=[];
    const add=(arr,label,got,max,note)=>arr.push({label,got,max,note});
    // ---- Q1 tabulation
    const cols=[0,1,2,3].map(i=>{const f=parseFloat(A.tt[i].f),n=parseFloat(A.tt[i].i);return {fs:A.tt[i].f||'',is:A.tt[i].i||'',f,n,ok:isFinite(f)&&isFinite(n),v:f-n};});
    const full=cols.filter(c=>c.ok);
    add(items1,'Table complete (rough + at least 2 accurate titrations)',full.length>=3?1:0,1,full.length>=3?'':'Fewer than three complete titrations were tabulated.');
    const dp=full.length&&full.every(c=>/^\d+\.\d\d$/.test(c.fs.trim())&&/^\d+\.\d\d$/.test(c.is.trim()));
    add(items1,'Readings recorded to 2 decimal places',dp?1:0,1,dp?'':'Every burette reading must have two decimal places (e.g. 0.00, 24.35).');
    let match=0,checked=0;cols.forEach((c,i)=>{const r=L.runs[i];if(!c.ok||!r)return;checked++;if(Math.abs(c.f-r.final)<0.026&&Math.abs(c.n-r.initial)<0.026)match++;});
    const mm=checked&&match===checked?2:(match>=Math.ceil(checked/2)&&match>0?1:0);
    add(items1,'Readings agree with your burette at the bench',mm,2,checked?`${match} of ${checked} columns match what the burette showed.`:'No titrations were recorded at the bench.');
    const acc=cols.slice(1).filter(c=>c.ok).map(c=>c.v);let best=null,spread=Infinity;
    for(let a=0;a<acc.length;a++)for(let b=a+1;b<acc.length;b++){const d=Math.abs(acc[a]-acc[b]);if(d<spread){spread=d;}if(d<=0.2001){const set=acc.filter(x=>Math.abs(x-acc[a])<=0.2001&&Math.abs(x-acc[b])<=0.2001);if(!best||set.length>best.length)best=set;}}
    add(items1,'Concordant titres (within 0.20 cm³)',spread<=0.2001?2:spread<=0.4001?1:0,2,isFinite(spread)?`Closest accurate titres differ by ${spread.toFixed(2)} cm³.`:'No accurate titres.');
    const avgUser=parseFloat(A.avg);const avgTrue=best?best.reduce((s,x)=>s+x,0)/best.length:(acc.length?acc.reduce((s,x)=>s+x,0)/acc.length:NaN);
    add(items1,'Average titre correctly calculated',isFinite(avgUser)&&isFinite(avgTrue)&&Math.abs(avgUser-avgTrue)<=0.011?1:0,1,isFinite(avgTrue)?`Average of your concordant titres = ${avgTrue.toFixed(2)} cm³.`:'');
    const avg=isFinite(avgUser)?avgUser:avgTrue;const dev=Math.abs(avg-V.veq);
    const am=!isFinite(dev)?0:dev<=0.30?4:dev<=0.60?3:dev<=0.90?2:dev<=1.20?1:0;
    add(items1,'Accuracy compared with the supervisor’s value',am,4,`Supervisor’s titre: ${V.veq.toFixed(2)} cm³; yours: ${isFinite(avg)?avg.toFixed(2):'—'} cm³ (difference ${isFinite(dev)?dev.toFixed(2):'—'}).`);
    // indicator & colour
    const used=[...new Set(L.events.filter(e=>e.type==='add'&&['mo','mr','pp'].includes(e.chem)&&e.contents.includes('XB')).map(e=>e.chem))];
    const it=NORM(A.ind);const indRe={mo:/methyl\s*orange/,mr:/methyl\s*red/,pp:/phen[oa]l?phthalein|\bpp\b|phenolph/};
    let indOK=false,indUsed=null;
    if(V.kind==='kmno4_fe'){indOK=/none|no indicator|self|kmno4|permanganate|tetraoxomanganate|itself/.test(it);}
    else{for(const k of V.ind)if(indRe[k].test(it)&&used.includes(k)){indOK=true;indUsed=k;}if(!indUsed)for(const k of ['mo','mr','pp'])if(indRe[k].test(it))indUsed=k;}
    add(items1,'Suitable indicator named (and used)',indOK?1:0,1,V.kind==='kmno4_fe'?'KMnO₄ acts as its own indicator.':`Suitable: ${V.ind.map(k=>({mo:'methyl orange',mr:'methyl red',pp:'phenolphthalein'})[k]).join(' / ')}${used.length?`; you actually added ${used.map(k=>({mo:'methyl orange',mr:'methyl red',pp:'phenolphthalein'})[k]).join(', ')}.`:'; no indicator was added to B at the bench.'}`);
    const cf=NORM(A.cfrom),ct=NORM(A.cto);const EXP={mo:[/yellow/,/orange|pink|red|peach/],mr:[/yellow/,/red|orange|pink/],pp:[/pink|red|magenta|purple/,/colou?rless/],kmn:[/colou?rless|pale|green|yellow/,/pink|purple/]};
    const ex=V.kind==='kmno4_fe'?EXP.kmn:EXP[indUsed||V.ind[0]];
    add(items1,'Colour change at the end point',ex&&ex[0].test(cf)&&ex[1].test(ct)?1:0,1,V.kind==='kmno4_fe'?'Expected: colourless (pale yellow) → pale pink.':`Expected for ${({mo:'methyl orange',mr:'methyl red',pp:'phenolphthalein'})[indUsed||V.ind[0]]}: ${({mo:'yellow → orange',mr:'yellow → red/orange',pp:'pink → colourless'})[indUsed||V.ind[0]]}.`);
    // calculations (error carried forward)
    const base=isFinite(avg)?avg:V.veq;const st={};const userv={};
    V.calc.forEach(c=>{userv[c.k]=parseNum(A[c.k]);});
    V.calc.forEach((c,i)=>{const ecf={};V.calc.slice(0,i).forEach(p=>{ecf[p.k]=isFinite(userv[p.k])?userv[p.k]:st[p.k];});
      const exp=c.f(base,ecf);const correct=c.f(base,st);st[c.k]=correct;const u=userv[c.k];const max=i===1?1:2;
      let got=0;if(isFinite(u)&&exp){const r=Math.abs(u-exp)/Math.abs(exp);got=r<=0.011?max:(r<=0.05&&max===2?1:0);}
      add(items1,`(b)(${['i','ii','iii','iv'][i]}) ${c.q}`,got,max,`Expected (from your values): ${fmt(exp)} ${c.u}.`);});
    // ---- Q2
    const s=E.salt,cs=CAT_SPEC[s.cat],as=AN_SPEC[s.an];const ev=L.events;const CID=E.C.id;
    const did={a:ev.some(e=>e.type==='add'&&e.stock===CID),
      b1:ev.some(e=>e.type==='add'&&e.chem==='naoh2'&&e.contents.includes(CID)&&e.tag==='drops'),b2:ev.some(e=>e.type==='add'&&e.chem==='naoh2'&&e.contents.includes(CID)&&e.excess),
      c1:ev.some(e=>e.type==='add'&&e.chem==='nh3aq'&&e.contents.includes(CID)&&e.tag==='drops'),c2:ev.some(e=>e.type==='add'&&e.chem==='nh3aq'&&e.contents.includes(CID)&&e.excess)};
    if(s.an==='so4'){did.d1=ev.some(e=>e.type==='add'&&e.contents.includes(CID)&&e.contents.includes('bacl2'));did.d2=ev.some(e=>e.type==='add'&&e.chem==='hcl2'&&e.contents.includes(CID)&&e.contents.includes('bacl2'));}
    if(s.an==='cl'){did.d1=ev.some(e=>e.type==='add'&&e.contents.includes(CID)&&e.contents.includes('agno3'));did.d2=ev.some(e=>e.type==='add'&&e.chem==='nh3aq'&&e.contents.includes(CID)&&e.contents.includes('agno3'));}
    if(s.an==='no3'){did.d1=did.d2=ev.some(e=>e.type==='add'&&e.contents.includes(CID)&&e.contents.includes('feso4')&&e.contents.includes('h2so4c'));}
    if(cs.e.rg==='warm')did.e1=did.e2=ev.some(e=>e.type==='tool'&&e.gases.includes('NH3')&&vesselHist(e.vessel).includes(CID));
    else did.e1=did.e2=ev.some(e=>e.type==='add'&&e.contents.includes(CID)&&e.contents.includes(cs.e.rg));
    if(s.an==='cl'&&s.cat==='fe3')as.p2=['diss|brown'];
    const part=(k,spec,lab)=>{const o=NORM(A['o_'+k]),i=NORM(A['i_'+k]);let got=0,notes=[];const max=(spec.p2?2:1)+1;
      const d1=k==='a'?did.a:did[k+'1'],d2=k==='a'?did.a:did[k+'2'];
      if(!d1&&!d2)notes.push('This test was not carried out at the bench, so no observation marks.');
      if(d1&&o&&allOf(o,spec.p1))got++;if(spec.p2&&d2&&o&&allOf(o,spec.p2))got++;
      const infOK=i&&ionHit(i,spec.inf);if(infOK)got++;
      notes.push(`Expected: ${spec.m[0]}. Inference: ${spec.m[1]}.`);add(items2,lab,got,max,notes.join(' '));};
    part('a',cs.a,'(a) Appearance of C');part('b',cs.b,'(b) NaOH(aq), drops then excess');part('c',cs.c,'(c) NH₃(aq), drops then excess');part('d',as,'(d) Test for the anion');part('e',cs.e,'(e) Confirmatory test');
    const ca=NORM(A.cat),an=NORM(A.an);
    add(items2,'(f) Cation identified',ca&&ION[s.cat].test(ca)?2:0,2,`The cation is ${ION_NAME[s.cat]}.`);
    add(items2,'(f) Anion identified',an&&ION[s.an].test(an)?2:0,2,`The anion is ${ION_NAME[s.an]}.`);
    // ---- Q3
    E.act.mark(A,(l,g,m,n)=>add(items3,l,g,m,n));
    E.q3.forEach((q,i)=>{const r=markQ3Item(q,A['q3_'+i]);add(items3,`(b)(${['i','ii','iii'][i]}) ${q.q.replace(/<[^>]+>/g,'')}`,r.got,r.max,`Model answer: ${q.mcq?q.mcq[q.ans]:q.model}`);});
    const sum=a=>a.reduce((s,x)=>s+x.got,0);
    let q1=sum(items1),q2=sum(items2),q3=sum(items3);
    const pen=Math.min(4,L.penalties.length*2);
    const total=Math.max(0,q1+q2+q3-pen);const pct=total/50*100;
    const grade=pct>=75?'A1':pct>=70?'B2':pct>=65?'B3':pct>=60?'C4':pct>=55?'C5':pct>=50?'C6':pct>=45?'D7':pct>=40?'E8':'F9';
    return {items1,items2,items3,q1,q2,q3,pen,total,pct,grade};
  },
  submit(){
    const E=L.exam;if(E.submitted)return;E.result=EXAM.mark();E.submitted=true;E.tab='sub';clearInterval(EXAM._t);
    const h=EXAM.history();h.push({d:Date.now(),total:E.result.total,grade:E.result.grade,q1:E.V.kind,salt:E.salt.id,q3:E.act.kind});try{localStorage.setItem('wassce-exam-hist',JSON.stringify(h.slice(-30)));}catch(e){}
    EXAM.updatePill();EXAM.renderBooklet(true);mentor(`Script marked: ${E.result.total}/50, grade ${E.result.grade}. Scroll down to see the examiner’s report.`);
    $('.nb').scrollIntoView({behavior:'smooth'});
  },
  history(){try{return JSON.parse(localStorage.getItem('wassce-exam-hist')||'[]');}catch(e){return [];}},
  resultHTML(){
    const E=L.exam,R=E.result;
    const sec=(title,items,got,max)=>`<h3 style="margin:16px 0 6px">${title} <span class="pill">${got}/${max}</span></h3><table class="obs"><thead><tr><th>Marking point</th><th style="width:70px">Marks</th><th>Examiner’s comment</th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.label)}</td><td class="mono" style="color:${x.got===x.max?'var(--good)':x.got?'var(--warn)':'var(--bad)'}">${x.got}/${x.max}</td><td class="sub">${esc(x.note||'')}</td></tr>`).join('')}</tbody></table>`;
    const band=R.pct>=65?'Distinction-level work.':R.pct>=50?'Credit pass.':R.pct>=40?'Pass, but not at credit level.':'Below pass level: practise the weak areas below.';
    return `<div class="qpaper"><div class="resulthead"><div><div class="tag" style="color:var(--accent);font-weight:700;font-size:12px">Examiner’s report: mock Chemistry 3</div><h2 style="margin:2px 0">${esc(E.cand.name||'Candidate')}${E.cand.idx?` · ${esc(E.cand.idx)}`:''}</h2><div class="sub">${esc(E.cand.school||'')}</div></div>
      <div class="gradebox"><b>${R.grade}</b><span>${R.total}/50 · ${R.pct.toFixed(0)}%</span></div></div>
      <p>${band} ${R.pen?`<span style="color:var(--bad)">${R.pen} mark(s) deducted for unsafe practice.</span>`:''}</p>
      <div class="row"><button class="btn sm" id="excopy">Copy result summary</button><button class="btn sm" id="exrev">${E.showLog?'Hide':'Show'} your bench log</button><button class="btn sm pri" id="exnew">Sit a new paper</button></div>
      ${E.showLog?`<div class="obswrap" style="margin-top:10px"><table class="obs"><thead><tr><th>Test</th><th>What happened at the bench</th><th>Model inference</th></tr></thead><tbody>${L.rows.map(r=>`<tr><td>${esc(r.test)}</td><td>${esc(r.obs)}</td><td class="inf">${esc(r.inf||'')}</td></tr>`).join('')}</tbody></table></div>`:''}
      ${sec('Question 1: Quantitative analysis',R.items1,R.q1,20)}
      <div class="calc" style="margin-top:6px">Model working (using your titre): ${esc(E.V.model(isFinite(parseFloat(E.ans.avg))?parseFloat(E.ans.avg):E.V.veq))}</div>
      ${sec('Question 2: Qualitative analysis of C',R.items2,R.q2,18)}
      ${sec('Question 3: Practical activities ('+({mp:'melting point',ph:'pH by colorimetry',heatsol:'heat of solution',equil:'chemical equilibrium'})[E.act.kind]+')',R.items3,R.q3,12)}</div>`;
  },
  resultText(){const E=L.exam,R=E.result;return `WASSCE Mock Chemistry 3 (Practical)\nCandidate: ${E.cand.name} ${E.cand.idx||''} ${E.cand.school||''}\nDate: ${new Date().toLocaleString()}\nQ1 Quantitative: ${R.q1}/20\nQ2 Qualitative: ${R.q2}/18\nQ3 Practical activities: ${R.q3}/12\n${R.pen?`Safety deduction: -${R.pen}\n`:''}TOTAL: ${R.total}/50 (${R.pct.toFixed(0)}%)  GRADE: ${R.grade}`;},
};
function fmt(x){if(!isFinite(x))return '—';return Math.abs(x)<0.01?x.toExponential(3):x.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');}

function parseNum(v){let t=String(v??'').trim();if(!t)return NaN;
  t=t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).replace(/[⁻−–]/g,'-').replace(/\s/g,'').replace(/,/g,'.');
  t=t.replace(/[×x*]10\^?\(?(-?\d+)\)?/i,'e$1');const m=t.match(/^-?\d*\.?\d+(e-?\d+)?/i);return m?parseFloat(m[0]):NaN;}
