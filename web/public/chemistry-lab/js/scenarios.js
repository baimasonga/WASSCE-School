/* =========================================================
   Missions (Labster-style scenarios mapped to WAEC Paper 3)
   ========================================================= */
"use strict";
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rpick=a=>a[Math.floor(Math.random()*a.length)];
const S=ids=>ids.map(id=>CHEM[id]).filter(Boolean);
function unknown(realId,label,extra={}){const r=CHEM[realId];const u={...r,...extra,id:'unk_'+label.replace(/\W/g,''),n:label,f:extra.f||'unknown sample',conc:extra.conc||'',cat:'Samples (unknowns)',use:extra.use||'Unknown sample: identify it from its reactions.',rx:'',hz:['X'],real:realId,smell:undefined,short:label};UNKNOWN[u.id]=u;return u;}
function scaledSol(realId,label,factor,extra={}){const u=unknown(realId,label,extra);u.comp={};for(const k in CHEM[realId].comp)u.comp[k]=CHEM[realId].comp[k]*factor;return u;}
const has=(L,f)=>L.events.some(f);
const addTo=(e,chemId,stockId)=>e.type==='add'&&e.chem===chemId&&(!stockId||e.contents.includes(stockId));
function vesselHist(id){const it=itemById(id);return it?(it.hist||[]):[];}
function concordant(runs){const acc=runs.slice(1).map(r=>r.titre);let best=null;
  for(let a=0;a<acc.length;a++)for(let b=a+1;b<acc.length;b++)if(Math.abs(acc[a]-acc[b])<=0.2001){const set=acc.filter(x=>Math.abs(x-acc[a])<=0.2001&&Math.abs(x-acc[b])<=0.2001);if(!best||set.length>best.length)best=set;}
  return best?best.reduce((s,x)=>s+x,0)/best.length:null;}
const STD_TOOLS=['blue','red','dich','burn','glow','rodHCl','rodNH3','waft','thermo','wire'];
function benchBasics(nTubes=4,opts={}){
  const xs=[260,330,400,470,540,610].slice(0,nTubes);xs.forEach(x=>addItem('vessel','tube',x,320));
  if(opts.burner!==false)addItem('burner','burner',720,380);
  if(opts.bath)addItem('bath','bath',830,412);
}
function titrationBench(){addItem('burette','burette',70,58);addItem('vessel','flask',280,385);addItem('vessel','flask',430,385);addItem('vessel','beaker',600,400,{label:'Waste'});}

const CAT_SALTS=[
  {id:'cuso4',cat:0,an:1},{id:'feso4',cat:1,an:1},{id:'fecl3',cat:2,an:0},{id:'znso4',cat:3,an:1},
  {id:'pbno3',cat:4,an:2},{id:'al2so43',cat:5,an:1},{id:'nh4cl',cat:6,an:0},{id:'cacl2',cat:7,an:0}];
const CATS=['Cu²⁺','Fe²⁺','Fe³⁺','Zn²⁺','Pb²⁺','Al³⁺','NH₄⁺','Ca²⁺'];
const ANS=['Cl⁻','SO₄²⁻','NO₃⁻','CO₃²⁻','SO₃²⁻'];

const SCENARIOS=[
{id:'exam',tag:'WAEC mock examination',title:'Mock Paper 3 (Practical): timed exam',blurb:'A full 50-mark practical paper: a titration, salt analysis and practical questions. Auto-marked with a WAEC-style scheme and graded A1–F9.',pills:['2 h timer','Randomised paper','Examiner’s report'],make(){return EXAM.make();}},
/* ------------------------------------------------------ */
{id:'free',tag:'Sandbox',title:'Free lab',blurb:'Every chemical, apparatus and tool. Teacher data panel switched on. Experiment freely.',pills:['All 70+ substances','Data panel on'],
 make(){return {stock:CHEMS,data:true,hint:'Free lab: drag glassware onto the bench, then drag bottles onto it. Click a bottle to read its uses and hazards.',
  objectives:[
   {t:'Form a coloured precipitate',check:L=>has(L,e=>e.type==='obs'&&e.pp&&e.pp.some(p=>!['AgCl','BaSO4','Al(OH)3','Zn(OH)2','Pb(OH)2','Ca(OH)2'].includes(p)))},
   {t:'Make a gas and identify it with a test',check:L=>has(L,e=>e.type==='tool'&&e.gases&&e.gases.filter(g=>g!=='H2O').length)},
   {t:'Heat something over the Bunsen burner',check:L=>has(L,e=>e.type==='heat')},
   {t:'Do a titration and record an end point',check:L=>L.runs.length>0},
   {t:'Do a flame test',check:L=>has(L,e=>e.type==='flame')}],
  setup(){benchBasics(4,{bath:true});addItem('burette','burette',40,58);addItem('vessel','flask',140,400);}};}},
/* ------------------------------------------------------ */
{id:'saltx',tag:'Qualitative analysis · cations & anions',title:'The mystery salt at Queen Elizabeth II Quay',blurb:'A sack of salt arrived at the Freetown port without a label. Identify the cation and the anion before it can be cleared.',pills:['NaOH/NH₃ tests','Confirmatory tests','Anion tests'],
 make(){const s=rpick(CAT_SALTS);const X=unknown(s.id,'Sample X',{f:'aqueous solution of salt X'});
  return {stock:[X,...S(['naoh2','nh3aq','hcl2','hno3d','h2so4d','h2so4c','agno3','bacl2','ki','k3fecn6','k4fecn6','kscn','nh4ox','feso4','water'])],glass:['tube','btube','beaker','burner','bath'],tools:STD_TOOLS,data:false,
   hint:'Start by pouring about 2 cm³ of Sample X into a test tube (drag the bottle onto a tube).',
   story:`<p>A 50 kg sack of white crystals arrived at <b>Queen Elizabeth II Quay</b> without its customs label. The Sierra Leone Standards Bureau needs to know what it is before it can be released. You have a solution of the salt labelled <b>X</b>.</p><p><b>Task:</b> carry out the tests below, record your observations and inferences, and identify the cation and the anion in X.</p>`,
   objectives:[
    {t:'Put about 2 cm³ of X into a test tube',check:L=>has(L,e=>e.type==='add'&&e.stock===X.id)},
    {t:'Add NaOH(aq) a few drops, then in excess',check:L=>has(L,e=>addTo(e,'naoh2',X.id)&&e.tag==='drops')&&has(L,e=>addTo(e,'naoh2',X.id)&&e.excess)},
    {t:'Add NH₃(aq) a few drops, then in excess',check:L=>has(L,e=>addTo(e,'nh3aq',X.id)&&e.tag==='drops')&&has(L,e=>addTo(e,'nh3aq',X.id)&&e.excess)},
    {t:'Carry out a confirmatory test for the cation',check:L=>has(L,e=>e.type==='add'&&['ki','k3fecn6','k4fecn6','kscn','nh4ox'].includes(e.chem)&&e.contents.includes(X.id))||has(L,e=>e.type==='tool'&&['red','rodHCl'].includes(e.tool)&&e.gases.includes('NH3'))||has(L,e=>e.type==='flame')},
    {t:'Test for the anion (BaCl₂, AgNO₃ or brown ring)',check:L=>has(L,e=>e.type==='add'&&['bacl2','agno3'].includes(e.chem)&&e.contents.includes(X.id))||has(L,e=>addTo(e,'h2so4c',X.id)&&e.contents.includes('feso4'))},
    {t:'Submit your report (Report tab)',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'mcq',q:'Which cation is present in X?',opts:CATS,ans:s.cat},
    {type:'mcq',q:'Which anion is present in X?',opts:ANS,ans:s.an},
    {type:'mcq',q:'Which observation distinguishes Zn²⁺ from Al³⁺?',opts:['White precipitate with NaOH(aq) in drops','Precipitate soluble in excess NaOH(aq)','Precipitate soluble in excess NH₃(aq)','No precipitate with dilute HCl'],ans:2,explain:'Zn(OH)₂ forms the soluble [Zn(NH₃)₄]²⁺ complex; Al(OH)₃ does not dissolve in NH₃.'}],
   setup(){benchBasics(5);}};}},
/* ------------------------------------------------------ */
{id:'gases',tag:'Gas preparation & tests',title:'Rokel Gas: the unlabelled cylinders',blurb:'Three solids, P, Q and R, react with dilute HCl. Produce each gas, test it, and identify it. Then prepare O₂ and NH₃.',pills:['H₂ · CO₂ · SO₂ · O₂ · NH₃','Litmus, splints, lime water'],
 make(){const ids=shuffle(['s_zn','s_caco3','s_na2so3']);const lab=['Solid P','Solid Q','Solid R'];const U=ids.map((id,i)=>unknown(id,lab[i],{f:'white/grey solid',st:'solid'}));
  const gasOf={s_zn:0,s_caco3:2,s_na2so3:3};const G=['Hydrogen, H₂','Oxygen, O₂','Carbon(IV) oxide, CO₂','Sulphur(IV) oxide, SO₂','Ammonia, NH₃','Hydrogen chloride, HCl'];
  return {stock:[...U,...S(['hcl2','h2o2','s_mno2','s_nh4cl','s_caoh2','limew','k2cr2o7','water'])],glass:['tube','btube','beaker','burner','bath'],tools:STD_TOOLS,data:false,
   hint:'Put a spatula of Solid P into a boiling tube, add dilute HCl, then test the gas at the mouth of the tube while it is still bubbling.',
   story:`<p>The labels have washed off three gas-generator kits at <b>Rokel Gas Ltd.</b> Each kit contains a solid that gives a gas with <b>dilute hydrochloric acid</b>. Your job is to prepare a little of each gas, identify it with standard tests, and also show the laboratory preparations of <b>oxygen</b> (H₂O₂ + MnO₂) and <b>ammonia</b> (NH₄Cl + Ca(OH)₂, heat).</p><p class="sub">Tip: drag a test tool onto the tube <i>while</i> the gas is being evolved. Drag a tube of lime water onto a fizzing tube to bubble the gas through it.</p>`,
   objectives:[
    ...U.map(u=>({t:`Make the gas from ${u.n} and test it`,check:L=>has(L,e=>e.type==='tool'&&e.gases.filter(g=>g!=='H2O').length&&vesselHist(e.vessel).includes(u.id))})),
    {t:'Bubble a gas through lime water',check:L=>has(L,e=>e.type==='passgas'&&e.toContents.includes('Ca2+'))},
    {t:'Prepare oxygen and relight a glowing splint',check:L=>has(L,e=>e.type==='tool'&&e.tool==='glow'&&e.gases.includes('O2'))},
    {t:'Prepare ammonia and test it with damp red litmus',check:L=>has(L,e=>e.type==='tool'&&e.tool==='red'&&e.gases.includes('NH3'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    ...U.map(u=>({type:'mcq',q:`Which gas is produced when ${u.n} reacts with dilute HCl?`,opts:G,ans:gasOf[u.real]})),
    {type:'mcq',q:'Which test distinguishes SO₂ from CO₂?',opts:['Lime water turns milky','Damp blue litmus turns red','Acidified K₂Cr₂O₇ turns from orange to green','A burning splint is extinguished'],ans:2,explain:'Both turn lime water milky, but only SO₂ (a reducing gas) turns dichromate green.'},
    {type:'mcq',q:'In the preparation of oxygen, manganese(IV) oxide acts as a…',opts:['reactant','catalyst','drying agent','oxidising agent'],ans:1}],
   setup(){['btube','btube','btube','btube'].forEach((t,i)=>addItem('vessel',t,250+i*80,310));addItem('vessel','tube',580,320,{label:'Lime water'});addItem('burner','burner',730,380);
     const lw=L.items.find(i=>i.label==='Lime water');addLiquid(lw.v,CHEM.limew,3,[]);equilibrate(lw.v);lw.hist=['limew'];lw.lastSnap=snap(lw.v);renderItem(lw);}};}},
/* ------------------------------------------------------ */
{id:'vinegar',tag:'Quantitative analysis · acid–base',title:'How strong is Lumley market vinegar?',blurb:'Titrate diluted vinegar against standard NaOH. Choosing the right indicator matters.',pills:['Burette & pipette','Indicator choice','Concentration in mol dm⁻³ and g dm⁻³'],
 make(){const cA=Math.round((0.075+Math.random()*0.045)*1000)/1000;const A=scaledSol('ch3cooh','A (diluted vinegar)',cA/2,{f:'CH₃COOH(aq)',conc:'unknown',use:'Vinegar from Lumley market, diluted 10 times with distilled water.'});A.short='A';
  const B={...CHEM.naoh01,id:'B',n:'B: sodium hydroxide 0.100 mol dm⁻³',short:'B',cat:'Samples (unknowns)'};
  const st={stock:[A,B,...S(['mo','mr','pp','water'])],glass:['flask','beaker','burette','tube'],tools:['thermo','waft'],data:false,cA,
   hint:'Drag bottle A onto the burette to fill it. Then drag bottle B onto a conical flask and choose “25.0 cm³ (pipette)”.',
   story:`<p>Market women at <b>Lumley</b> complain that some vinegar is watered down. The vinegar has been diluted ten times to make solution <b>A</b>. <b>B</b> is 0.100 mol dm⁻³ NaOH.</p><p><b>Task (WAEC style):</b> Put A into the burette. Titrate 25.0 cm³ portions of B with A using a <b>suitable indicator</b>. Tabulate your burette readings and calculate the concentration of ethanoic acid in A in mol dm⁻³ and in g dm⁻³. [CH₃COOH = 60 g mol⁻¹]</p><p class="sub">Equation: CH₃COOH + NaOH → CH₃COONa + H₂O</p>`,
   objectives:[
    {t:'Rinse and fill the burette with A',check:L=>has(L,e=>e.type==='fillburette'&&e.chem==='ch3cooh')},
    {t:'Pipette 25.0 cm³ of B into a conical flask',check:L=>has(L,e=>e.type==='add'&&e.stock==='B'&&e.tag==='pipette')},
    {t:'Add 2–3 drops of a suitable indicator',check:L=>has(L,e=>e.type==='add'&&e.chem==='pp'&&e.contents.includes('B'))},
    {t:'Do a rough titration and record the end point',check:L=>L.runs.length>=1},
    {t:'Get two accurate titres that agree within 0.20 cm³',check:L=>concordant(L.runs)!=null},
    {t:'Record your burette readings correctly',check:L=>has(L,e=>e.type==='readings'&&e.ok)},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'mcq',q:'Which indicator is most suitable for this titration?',opts:['Methyl orange','Methyl red','Phenolphthalein','Litmus'],ans:2,explain:'Weak acid against strong base: the equivalence point is at about pH 8.7, inside the phenolphthalein range.'},
    {type:'num',q:'Average volume of A used (concordant titres)',unit:'cm³',check:(x,L)=>{const m=concordant(L.runs);if(m==null)return {ok:false,msg:'You need two concordant accurate titres first.'};return {ok:Math.abs(x-m)<=0.03,msg:`Your concordant mean is ${m.toFixed(2)} cm³.`};}},
    {type:'num',q:'Concentration of CH₃COOH in A',unit:'mol dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.100*25/m;return {ok:Math.abs(x-e)/e<0.015,msg:`From your titre: 0.100 × 25.0 / ${m.toFixed(2)} = ${e.toFixed(4)} mol dm⁻³. (True value: ${st.cA.toFixed(3)})`};}},
    {type:'num',q:'Mass concentration of CH₃COOH in A',unit:'g dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.100*25/m*60;return {ok:Math.abs(x-e)/e<0.02,msg:`${(e/60).toFixed(4)} × 60 = ${e.toFixed(2)} g dm⁻³.`};}},
    {type:'mcq',q:'The original (undiluted) vinegar is therefore…',opts:['the same concentration as A','10 times more concentrated than A','10 times more dilute than A'],ans:1}],
   setup(){titrationBench();}};return st;}},
/* ------------------------------------------------------ */
{id:'hclstd',tag:'Quantitative analysis · acid–base',title:'Standardising the school’s hydrochloric acid',blurb:'Classic WAEC titration: HCl against sodium trioxocarbonate(IV) with methyl orange.',pills:['Na₂CO₃ primary standard','Mole ratio 2 : 1'],
 make(){const cA=Math.round((0.085+Math.random()*0.035)*1000)/1000;const A=scaledSol('hcl01','A (hydrochloric acid)',cA/0.1,{f:'HCl(aq)',conc:'unknown'});A.short='A';
  const B={...CHEM.na2co3s,id:'B',n:'B: Na₂CO₃ 0.0500 mol dm⁻³',short:'B',cat:'Samples (unknowns)'};
  const st={stock:[A,B,...S(['mo','pp','water'])],glass:['flask','beaker','burette'],tools:['thermo'],data:false,cA,
   hint:'Fill the burette with A, pipette 25.0 cm³ of B into a conical flask and add 2 drops of methyl orange.',
   story:`<p>The new bottle of hydrochloric acid in the school store has no concentration on its label. Before the WASSCE practical, the laboratory technician needs it standardised.</p><p><b>A</b> is the hydrochloric acid. <b>B</b> is 0.0500 mol dm⁻³ Na₂CO₃. Titrate 25.0 cm³ portions of B with A using <b>methyl orange</b>. Calculate the concentration of A in mol dm⁻³ and g dm⁻³. [HCl = 36.5 g mol⁻¹]</p><p class="sub">Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂</p>`,
   objectives:[
    {t:'Fill the burette with A',check:L=>has(L,e=>e.type==='fillburette'&&e.chem==='hcl01')},
    {t:'Pipette 25.0 cm³ of B and add methyl orange',check:L=>has(L,e=>e.type==='add'&&e.chem==='mo'&&e.contents.includes('B'))},
    {t:'Rough titration + two concordant titres',check:L=>concordant(L.runs)!=null},
    {t:'Record your burette readings correctly',check:L=>has(L,e=>e.type==='readings'&&e.ok)},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'mcq',q:'Mole ratio of HCl to Na₂CO₃ in the reaction',opts:['1 : 1','1 : 2','2 : 1','2 : 3'],ans:2},
    {type:'mcq',q:'Colour change at the end point (A added to B + methyl orange)',opts:['Pink → colourless','Yellow → orange','Red → yellow','Colourless → pink'],ans:1},
    {type:'num',q:'Average titre',unit:'cm³',check:(x,L)=>{const m=concordant(L.runs);if(m==null)return {ok:false,msg:'You need two concordant titres.'};return {ok:Math.abs(x-m)<=0.03,msg:`Your concordant mean is ${m.toFixed(2)} cm³.`};}},
    {type:'num',q:'Concentration of A',unit:'mol dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.05*25*2/m;return {ok:Math.abs(x-e)/e<0.015,msg:`n(Na₂CO₃) = 0.0500 × 25.0/1000; n(HCl) = 2 × that; C = ${e.toFixed(4)} mol dm⁻³. (True: ${st.cA.toFixed(3)})`};}},
    {type:'num',q:'Mass concentration of A',unit:'g dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.05*25*2/m*36.5;return {ok:Math.abs(x-e)/e<0.02,msg:`${e.toFixed(2)} g dm⁻³.`};}}],
   setup(){titrationBench();}};return st;}},
/* ------------------------------------------------------ */
{id:'iron',tag:'Quantitative analysis · redox',title:'Iron tablets at Connaught Hospital pharmacy',blurb:'Check the Fe²⁺ content of a tablet solution with potassium tetraoxomanganate(VII).',pills:['KMnO₄ self-indicator','Acidify with dil. H₂SO₄','Mole ratio 1 : 5'],
 make(){const c=Math.round((0.08+Math.random()*0.035)*1000)/1000;const B=scaledSol('feso4','B (iron tablet solution)',c/0.1,{f:'Fe²⁺(aq)',conc:'unknown'});B.comp.Hn=0.005;B.short='B';
  const A={...CHEM.kmno4,id:'A',n:'A: KMnO₄ 0.0200 mol dm⁻³',short:'A',cat:'Samples (unknowns)',real:'kmno4'};
  const st={stock:[A,B,...S(['h2so4d','hcl2','water','pp'])],glass:['flask','beaker','burette'],tools:['thermo'],data:false,c,
   hint:'Fill the burette with A (KMnO₄). Pipette 25.0 cm³ of B into a flask and acidify it with about 10 cm³ of dilute H₂SO₄.',
   story:`<p>Patients at <b>Connaught Hospital</b> are prescribed iron(II) tablets for anaemia. The pharmacy suspects a batch is under-strength. Some tablets were dissolved to make solution <b>B</b>. <b>A</b> is 0.0200 mol dm⁻³ KMnO₄.</p><p><b>Task:</b> titrate 25.0 cm³ of B (acidified) with A. KMnO₄ acts as its own indicator. Calculate the concentration of Fe²⁺ in B and the mass concentration of FeSO₄. [FeSO₄ = 152 g mol⁻¹]</p><p class="sub">MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O</p>`,
   objectives:[
    {t:'Fill the burette with A',check:L=>has(L,e=>e.type==='fillburette'&&e.chem==='kmno4')},
    {t:'Pipette 25.0 cm³ of B and acidify with dil. H₂SO₄',check:L=>has(L,e=>e.type==='add'&&e.chem==='h2so4d'&&e.contents.includes('B'))},
    {t:'Rough titration + two concordant titres',check:L=>concordant(L.runs)!=null},
    {t:'Record your burette readings correctly',check:L=>has(L,e=>e.type==='readings'&&e.ok)},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'mcq',q:'Why is dilute H₂SO₄, not HCl, used to acidify?',opts:['HCl is too weak','KMnO₄ would oxidise Cl⁻ to Cl₂, giving a false titre','H₂SO₄ is an indicator','HCl reacts with Fe²⁺'],ans:1},
    {type:'mcq',q:'The end point is seen when…',opts:['the purple colour first disappears','the solution first turns permanently pale pink','a brown precipitate forms','the solution turns green'],ans:1},
    {type:'num',q:'Concentration of Fe²⁺ in B',unit:'mol dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.02*m*5/25;return {ok:Math.abs(x-e)/e<0.015,msg:`n(MnO₄⁻) = 0.0200 × ${m.toFixed(2)}/1000; n(Fe²⁺) = 5 × that; C = ${e.toFixed(4)} mol dm⁻³. (True: ${st.c.toFixed(3)})`};}},
    {type:'num',q:'Mass concentration of FeSO₄ in B',unit:'g dm⁻³',check:(x,L)=>{const m=concordant(L.runs)||L.runs.at(-1)?.titre;if(!m)return {ok:false,msg:'No titre recorded.'};const e=0.02*m*5/25*152;return {ok:Math.abs(x-e)/e<0.02,msg:`${e.toFixed(2)} g dm⁻³.`};}}],
   setup(){titrationBench();}};return st;}},
/* ------------------------------------------------------ */
{id:'canteen',tag:'Organic · food tests',title:'What’s in the school canteen food?',blurb:'Four food extracts A–D. Use Fehling’s/Benedict’s, iodine, Biuret, Millon’s and more to identify each.',pills:['Reducing sugars','Starch','Proteins','Hydrolysis of sucrose'],
 make(){const ids=shuffle(['glucose','sucrose','starchs','albumen']);const lab=['A','B','C','D'];const U=ids.map((id,i)=>unknown(id,'Food extract '+lab[i],{f:'aqueous extract'}));
  const OPT=['Reducing sugar (glucose)','Non-reducing sugar (sucrose)','Starch','Protein'];const idx={glucose:0,sucrose:1,starchs:2,albumen:3};
  return {stock:[...U,...S(['fehling','benedict','i2ki','naoh2','cuso4d','millons','ninhydrin','hno3c','nh3aq','hcl2','water'])],glass:['tube','beaker','burner','bath'],tools:['thermo','waft'],data:false,
   hint:'Put 2 cm³ of each extract into separate tubes. Fehling’s and Benedict’s tests need warming in the water bath.',
   story:`<p>The PTA wants to know what the canteen food actually contains. Four extracts (<b>A–D</b>) were made from rice, sweetened drink, bean soup and kanya. Identify each as a reducing sugar, a non-reducing sugar, starch or protein.</p><p class="sub">Remember: sucrose only gives a positive Benedict’s test after boiling with dilute HCl and then neutralising with NaOH.</p>`,
   objectives:[...U.map(u=>({t:`Test ${u.n}`,check:L=>has(L,e=>e.type==='add'&&e.stock!==u.id&&e.contents.includes(u.id))})),
    {t:'Warm a Fehling’s or Benedict’s test',check:L=>has(L,e=>e.type==='heat'&&vesselHist(e.vessel).some(x=>x==='fehling'||x==='benedict'))},
    {t:'Carry out a protein test (Biuret, Millon’s, ninhydrin or xanthoproteic)',check:L=>has(L,e=>e.type==='add'&&['cuso4d','millons','ninhydrin','hno3c'].includes(e.chem))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[...U.map(u=>({type:'mcq',q:`${u.n} contains…`,opts:OPT,ans:idx[u.real]})),
    {type:'mcq',q:'The brick-red precipitate in Fehling’s test is…',opts:['CuO','Cu₂O','Cu(OH)₂','CuSO₄'],ans:1}],
   setup(){benchBasics(5,{bath:true,burner:true});}};}},
/* ------------------------------------------------------ */
{id:'organic',tag:'Organic · functional groups',title:'Samples from the Kissy oil refinery lab',blurb:'Four colourless liquids P–S: an alkene, an alkane, an alkanol and an alkanoic acid. Which is which?',pills:['Br₂ water','KMnO₄ / K₂Cr₂O₇','NaHCO₃','Esterification'],
 make(){const ids=shuffle(['hexene','hexane','ethanol','ch3cooh']);const lab=['P','Q','R','S'];const U=ids.map((id,i)=>unknown(id,'Liquid '+lab[i],{f:'colourless liquid'}));
  const OPT=['Alkene','Alkane','Alkanol','Alkanoic acid'];const idx={hexene:0,hexane:1,ethanol:2,ch3cooh:3};
  return {stock:[...U,...S(['br2aq','kmno4','h2so4d','k2cr2o7','nahco3','i2ki','naoh2','h2so4c','ethanol','ch3cooh','water'])],glass:['tube','beaker','bath','burner'],tools:['blue','red','burn','waft','thermo'],data:false,
   hint:'Hydrocarbons and ethanol are flammable: warm them in the water bath, never over the Bunsen flame.',
   story:`<p>A technician at the <b>Kissy refinery</b> mixed up four sample bottles. One is an alkene, one an alkane, one an alkanol and one an alkanoic acid. Identify each using test-tube reactions.</p><p class="sub">Safety: hexane, hexene and ethanol are highly flammable. Use the water bath for any warming.</p>`,
   objectives:[{t:'Test the liquids with bromine water',check:L=>L.events.filter(e=>e.type==='add'&&e.chem==='br2aq').length>=2},
    {t:'Test for the –COOH group with NaHCO₃',check:L=>has(L,e=>e.type==='add'&&e.chem==='nahco3')},
    {t:'Warm a sample with acidified K₂Cr₂O₇ in the water bath',check:L=>has(L,e=>e.type==='heat'&&e.bath&&vesselHist(e.vessel).includes('k2cr2o7'))},
    {t:'Work safely (no fires)',check:L=>has(L,e=>e.type==='submit')&&!L.penalties.some(p=>/Flammable/.test(p))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[...U.map(u=>({type:'mcq',q:`${u.n} is an…`,opts:OPT,ans:idx[u.real]})),
    {type:'mcq',q:'Why does the alkene decolourise bromine water but the alkane does not?',opts:['Alkanes are gases','The alkene has a C=C double bond and undergoes addition','The alkane is acidic','Bromine reacts only with alcohols'],ans:1}],
   setup(){benchBasics(5,{bath:true,burner:true});}};}},
/* ------------------------------------------------------ */
{id:'halogens',tag:'Qualitative · halogens',title:'Chlorine at Guma Valley water works',blurb:'Why can chlorine release bromine and iodine? Rank the halogens by displacement, then identify an unknown halide.',pills:['Displacement','Hexane layer colours','AgNO₃ test'],
 make(){const yid=rpick(['kbr','ki','kcl']);const Y=unknown(yid,'Solution Y',{f:'potassium halide solution'});
  return {stock:[Y,...S(['cl2aq','br2aq','i2ki','kcl','kbr','ki','hexane','agno3','hno3d','nh3aq','water'])],glass:['tube','beaker'],tools:['waft'],data:false,
   hint:'Add 2 cm³ of KBr to a tube, then add chlorine water. Add 1 cm³ hexane and shake to see the halogen in the upper layer.',
   story:`<p>Guma Valley Water Company chlorinates Freetown’s water. A trainee asks why chlorine can “push out” bromine and iodine from their salts. Show it with <b>displacement reactions</b>, rank the halogens, and identify the halide in solution <b>Y</b>.</p>`,
   objectives:[{t:'React chlorine water with KBr',check:L=>has(L,e=>e.type==='add'&&((e.chem==='cl2aq'&&e.contents.includes('kbr'))||(e.chem==='kbr'&&e.contents.includes('cl2aq'))))},
    {t:'React chlorine water with KI',check:L=>has(L,e=>e.type==='add'&&((e.chem==='cl2aq'&&e.contents.includes('ki'))||(e.chem==='ki'&&e.contents.includes('cl2aq'))))},
    {t:'React bromine water with KI',check:L=>has(L,e=>e.type==='add'&&((e.chem==='br2aq'&&e.contents.includes('ki'))||(e.chem==='ki'&&e.contents.includes('br2aq'))))},
    {t:'Use hexane to show the colour of the free halogen',check:L=>has(L,e=>e.type==='add'&&e.chem==='hexane'&&e.contents.some(c=>['cl2aq','br2aq','i2ki'].includes(c)))},
    {t:'Test solution Y',check:L=>has(L,e=>e.type==='add'&&e.stock!==Y.id&&e.contents.includes(Y.id))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'mcq',q:'Order of reactivity (strongest oxidising agent first)',opts:['I₂ > Br₂ > Cl₂','Cl₂ > Br₂ > I₂','Br₂ > Cl₂ > I₂','Cl₂ > I₂ > Br₂'],ans:1},
    {type:'mcq',q:'Colour of iodine in the hexane layer',opts:['Orange-red','Violet','Pale green','Colourless'],ans:1},
    {type:'mcq',q:'Solution Y contains…',opts:['Chloride (KCl)','Bromide (KBr)','Iodide (KI)'],ans:{kcl:0,kbr:1,ki:2}[yid]}],
   setup(){benchBasics(6,{burner:false});}};}},
/* ------------------------------------------------------ */
{id:'heat',tag:'General skills · thermochemistry',title:'Heat of neutralisation',blurb:'Mix acid and alkali in a polystyrene cup, record the highest temperature, and calculate ΔH. Then compare a weak acid.',pills:['Calorimetry','ΔH = −mcΔT / n'],
 make(){return {stock:S(['hcl1','ch3cooh1','naoh1','water']),glass:['cup','beaker'],tools:['thermo'],data:false,
   hint:'Drag 1.0 M HCl onto Cup 1 (50 cm³), insert the thermometer, then add 50 cm³ of 1.0 M NaOH and watch for the highest temperature.',
   story:`<p>A local soap maker in Makeni adds caustic soda to acid waste and notices it gets hot. How much heat is given out per mole of water formed?</p><p><b>Task:</b> Mix 50 cm³ of 1.0 mol dm⁻³ HCl with 50 cm³ of 1.0 mol dm⁻³ NaOH in a polystyrene cup. Record the initial temperature and the highest temperature reached. Repeat with 1.0 mol dm⁻³ ethanoic acid. Take c = 4.2 J g⁻¹ K⁻¹ and density = 1.0 g cm⁻³.</p>`,
   objectives:[{t:'Put 50 cm³ of HCl in a cup and insert a thermometer',check:L=>has(L,e=>e.type==='thermo')&&has(L,e=>e.type==='add'&&e.chem==='hcl1')},
    {t:'Add 50 cm³ of NaOH and record the temperature rise',check:L=>vessels().some(v=>v.type==='cup'&&(v.hist||[]).includes('hcl1')&&(v.hist||[]).includes('naoh1'))},
    {t:'Repeat with ethanoic acid',check:L=>vessels().some(v=>v.type==='cup'&&(v.hist||[]).includes('ch3cooh1')&&(v.hist||[]).includes('naoh1'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'num',q:'Temperature rise ΔT for HCl + NaOH',unit:'K',check:(x)=>{const c=vessels().find(v=>v.type==='cup'&&(v.hist||[]).includes('hcl1')&&(v.hist||[]).includes('naoh1'));if(!c)return {ok:false,msg:'Do the HCl + NaOH experiment first.'};const e=c.maxT-c.mixT0;return {ok:Math.abs(x-e)<=0.35,msg:`Highest ${c.maxT.toFixed(1)} °C − initial ${c.mixT0.toFixed(1)} °C = ${e.toFixed(1)} K.`};}},
    {type:'num',q:'ΔH of neutralisation for HCl + NaOH (include the sign)',unit:'kJ mol⁻¹',check:(x)=>{const c=vessels().find(v=>v.type==='cup'&&(v.hist||[]).includes('hcl1')&&(v.hist||[]).includes('naoh1'));if(!c)return {ok:false,msg:'Do the experiment first.'};const dT=c.maxT-c.mixT0;const e=-(100*4.2*dT)/0.05/1000;return {ok:Math.abs(x-e)<=1.5,msg:`Heat = 100 × 4.2 × ${dT.toFixed(1)} = ${(420*dT).toFixed(0)} J; n(H₂O) = 0.050 mol; ΔH = ${e.toFixed(1)} kJ mol⁻¹ (data book: −57.3).`};}},
    {type:'mcq',q:'Why is ΔH for ethanoic acid less negative?',opts:['Ethanoic acid is more concentrated','Some energy is used to ionise the weak acid completely','The cup absorbs more heat','Water is formed in smaller amount'],ans:1}],
   setup(){addItem('vessel','cup',330,390);addItem('vessel','cup',520,390);}};}},
/* ------------------------------------------------------ */
{id:'rates',tag:'General skills · kinetics',title:'Rates: the disappearing cross',blurb:'Sodium thiosulphate + HCl gives a sulphur precipitate. Time how long the cross takes to vanish at different concentrations.',pills:['Stopwatch','1/t ∝ concentration'],
 make(){const runs=[];const st={stock:S(['na2s2o3r','hcl2','water']),glass:['flask','crosspaper','beaker'],tools:['stopwatch','thermo'],data:false,runs,
   hint:'Put the flask on the cross. Add Na₂S₂O₃ (and water to make 50 cm³), then add 5 cm³ of HCl, start the stopwatch and watch the cross in the Inspector.',
   story:`<p>Sulphur from the thiosulphate–acid reaction slowly clouds the mixture. The faster the reaction, the sooner the cross under the flask disappears.</p><p><b>Task:</b> Use 50, 30 and 10 cm³ of 0.150 mol dm⁻³ Na₂S₂O₃, each made up to 50 cm³ with water. Add 5 cm³ of 2 M HCl and time how long the cross takes to disappear. Rate ∝ 1/t.</p><p class="sub">Tip: use the speed control (top right of the bench) to fast-forward. Empty and rinse the flask between runs.</p>`,
   onAdd(it,chem){if(chem.id==='hcl2'&&(it.v.c.S2O3||0)>0){it.rate={thio:it.v.c.S2O3,vol:it.v.vol,t0:SIMT,done:false};}},
   onLoop(){for(const it of vessels()){if(it.rate&&!it.rate.done){const S=(it.v.d&&it.v.d.ppt.S)||0;if(S/Math.max(it.v.vol,1)>=0.004){it.rate.done=true;it.rate.t=SIMT-it.rate.t0;runs.push({c:it.rate.thio/it.rate.vol,t:it.rate.t});emit({type:'cross',t:it.rate.t,c:it.rate.thio/it.rate.vol});}}}},
   objectives:[{t:'Place a conical flask on the cross',check:L=>has(L,e=>e.type==='oncross')},
    {t:'Run 1: 50 cm³ thiosulphate + 5 cm³ HCl, timed',check:L=>runs.some(r=>Math.abs(r.c-0.15*50/55)<0.01)&&has(L,e=>e.type==='time')},
    {t:'Run 2: 30 cm³ thiosulphate + 20 cm³ water',check:L=>runs.some(r=>Math.abs(r.c-0.15*30/55)<0.008)},
    {t:'Run 3: 10 cm³ thiosulphate + 40 cm³ water',check:L=>runs.some(r=>Math.abs(r.c-0.15*10/55)<0.006)},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'num',q:'Time for the cross to disappear with 50 cm³ of thiosulphate',unit:'s',check:x=>{const r=runs.find(r=>Math.abs(r.c-0.15*50/55)<0.01);if(!r)return {ok:false,msg:'Do this run first.'};return {ok:Math.abs(x-r.t)/r.t<0.12,msg:`The cross disappeared after about ${r.t.toFixed(0)} s.`};}},
    {type:'mcq',q:'When the volume of thiosulphate is halved (same total volume), the time taken…',opts:['halves','stays the same','roughly doubles','quadruples'],ans:2},
    {type:'mcq',q:'The graph of 1/t against concentration of thiosulphate is…',opts:['a curve that levels off','a straight line through the origin','a horizontal line','a straight line with negative slope'],ans:1,explain:'Rate ∝ [S₂O₃²⁻] (first order in thiosulphate).'}],
   setup(){addItem('cross','crosspaper',360,520);const f=addItem('vessel','flask',600,385);addItem('stopwatch','stopwatch',830,440);addItem('vessel','beaker',180,400,{label:'Waste'});}};return st;}},

/* ====== Syllabus 16.0 (a) general skills ====== */
{id:'ph',tag:'General skills · pH by colorimetry',title:'pH of six mystery solutions',blurb:'Use universal indicator paper and the colour chart to estimate the pH of six solutions and classify them.',pills:['Universal indicator','pH chart','Strong vs weak'],
 make(){const defs=shuffle([['hcl01',1,1.0],['ch3cooh',0.05,2.9],['nacl',1,7.0],['nahco3',1,8.3],['nh3aq',0.05,11.1],['naoh01',1,13.0]]);const lab='PQRSTU';
  const U=defs.map(([id,f,pH],i)=>{const u=scaledSol(id,'Solution '+lab[i],f,{f:'colourless solution',conc:'0.1 mol dm⁻³ (approx.)'});u.pH=pH;return u;});
  const tested=(L,u)=>has(L,e=>(e.type==='tool'&&e.tool==='uipaper'&&vesselHist(e.vessel).includes(u.id))||(e.type==='add'&&e.chem==='ui'&&e.contents.includes(u.id)));
  return {stock:[...U,...S(['ui','water'])],glass:['tube','beaker'],tools:['uipaper','waft'],data:false,
   hint:'Pour about 2 cm³ of each solution into a test tube, then drag universal indicator paper onto it. Compare the colour with the chart in the Inspector.',
   story:`<p>The school health club wants to label six solutions from the store by how acidic or alkaline they are. They are labelled <b>P–U</b>. Each is roughly 0.1 mol dm⁻³.</p><p><b>Task:</b> determine the pH of each solution by colorimetry: test it with universal indicator and match the colour with the pH chart. Then classify each as a strong acid, weak acid, neutral, weak alkali or strong alkali.</p>`,
   objectives:[{t:'Test three of the solutions',check:L=>U.filter(u=>tested(L,u)).length>=3},{t:'Test all six solutions',check:L=>U.every(u=>tested(L,u))},{t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[...U.map(u=>({type:'num',q:`Estimated pH of ${u.n}`,unit:'',check:x=>({ok:Math.abs(x-u.pH)<=1.01,msg:`pH ≈ ${u.pH.toFixed(1)}.`})})),
    {type:'mcq',q:'Which solution is a WEAK acid?',opts:U.map(u=>u.n),ans:U.findIndex(u=>u.real==='ch3cooh'),explain:'0.1 M ethanoic acid has pH ≈ 3, not 1, because it is only partly ionised.'},
    {type:'mcq',q:'Which solution is the STRONGEST alkali?',opts:U.map(u=>u.n),ans:U.findIndex(u=>u.real==='naoh01')}],
   setup(){benchBasics(6,{burner:false});}};}},
{id:'equil',tag:'General skills · chemical equilibrium',title:'Le Chatelier and the blood-red equilibrium',blurb:'Disturb Fe³⁺ + SCN⁻ ⇌ [Fe(SCN)]²⁺ by adding reagents and heating, then measure K with a colorimeter.',pills:['Le Chatelier','Colorimeter','Equilibrium constant'],
 make(){const both=h=>h.includes('fecl3')&&h.includes('kscn');const cnt=(h,id)=>h.filter(x=>x===id).length;let last=null;
  return {stock:S(['fecl3','kscn','fe3dil','scndil','naoh2','water']),glass:['tube','beaker','burner','bath'],tools:['colorimeter','thermo'],data:false,
   hint:'Put 10 cm³ of water in a boiling tube or beaker, add 2 drops of FeCl₃ and 2 drops of KSCN to get a pale red mixture. Then pour 2 cm³ portions into test tubes.',
   story:`<p>Iron(III) ions and thiocyanate ions form a blood-red complex in a reversible reaction:</p><p class="mono" style="font-size:13px">Fe³⁺(aq) + SCN⁻(aq) ⇌ [Fe(SCN)]²⁺(aq)   K = [Fe(SCN)²⁺] / ([Fe³⁺][SCN⁻])</p><p><b>Part 1:</b> Make a pale red mixture, divide it into portions and disturb each one: add more Fe³⁺, add more SCN⁻, warm it, and add NaOH(aq). Explain each change with Le Chatelier’s principle.<br><b>Part 2:</b> Mix 5.0 cm³ of 0.00200 M Fe³⁺ with 5.0 cm³ of 0.00200 M SCN⁻, measure the absorbance (ε = 4700 dm³ mol⁻¹ cm⁻¹) and calculate K.</p>`,
   objectives:[{t:'Make a pale red equilibrium mixture',check:L=>has(L,e=>e.type==='add'&&both(e.contents))},
    {t:'Add more Fe³⁺ to a portion',check:L=>has(L,e=>e.type==='add'&&e.chem==='fecl3'&&both(e.contents)&&cnt(vesselHist(e.vessel),'fecl3')>=2)},
    {t:'Add more SCN⁻ to a portion',check:L=>has(L,e=>e.type==='add'&&e.chem==='kscn'&&both(e.contents)&&cnt(vesselHist(e.vessel),'kscn')>=2)},
    {t:'Warm a portion (water bath or burner)',check:L=>has(L,e=>e.type==='heat'&&both(vesselHist(e.vessel)))},
    {t:'Add NaOH(aq) to a portion',check:L=>has(L,e=>e.type==='add'&&e.chem==='naoh2'&&both(e.contents))},
    {t:'Measure the absorbance of the dilute 5 + 5 cm³ mixture',check:L=>has(L,e=>e.type==='tool'&&e.tool==='colorimeter'&&e.kA!=null&&vesselHist(e.vessel).includes('fe3dil')&&vesselHist(e.vessel).includes('scndil'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[
    {type:'mcq',q:'When more Fe³⁺ is added, the colour…',opts:['deepens: the equilibrium shifts to the right','fades: the equilibrium shifts to the left','does not change'],ans:0},
    {type:'mcq',q:'Warming makes the colour paler. The forward reaction is therefore…',opts:['exothermic','endothermic','neither'],ans:0,explain:'Raising the temperature favours the endothermic (backward) direction.'},
    {type:'mcq',q:'Adding NaOH(aq) makes the red colour fade because…',opts:['Fe³⁺ is removed as Fe(OH)₃, so the equilibrium shifts to the left','OH⁻ reacts with the complex directly to make it blue','NaOH is a catalyst'],ans:0},
    {type:'num',q:'[Fe(SCN)²⁺] in your 5 + 5 cm³ mixture (from A = ε c l)',unit:'mol dm⁻³',check:(x,L)=>{const e=[...L.events].reverse().find(e=>e.type==='tool'&&e.tool==='colorimeter'&&e.kA!=null);if(!e)return {ok:false,msg:'Measure the absorbance first.'};const c=e.A/4700;return {ok:Math.abs(x-c)/c<0.04,msg:`A = ${e.A.toFixed(3)}, so c = A/(4700 × 1) = ${c.toExponential(3)} mol dm⁻³.`};}},
    {type:'num',q:'Equilibrium constant K from your measurement',unit:'dm³ mol⁻¹',check:(x,L)=>{const e=[...L.events].reverse().find(e=>e.type==='tool'&&e.tool==='colorimeter'&&e.kA!=null);if(!e)return {ok:false,msg:'Measure the absorbance first.'};return {ok:Math.abs(x-e.kA)/e.kA<0.1,msg:`Initial [Fe³⁺] = [SCN⁻] = 0.00100 M; x = A/4700; K = x / (0.00100 − x)² ≈ ${e.kA.toFixed(0)} dm³ mol⁻¹ at ${e.T.toFixed(0)} °C.`};}}],
   setup(){addItem('vessel','beaker',90,400,{label:'Stock'});benchBasics(5,{bath:true});}};}},
{id:'stdsol',tag:'General skills · standard solutions',title:'Preparing a primary standard',blurb:'Weigh anhydrous Na₂CO₃, make 250 cm³ of 0.0500 mol dm⁻³ solution in a volumetric flask, then dilute it ten times.',pills:['Balance (0.01 g)','Volumetric flask','Dilution'],
 make(){const vf=e=>{const it=itemById(e.vessel||e.to);return it&&it.type==='volflask';};
  return {stock:S(['s_na2co3','water']),glass:['balance','beaker','volflask','flask'],tools:[],data:false,
   hint:'Calculate the mass needed first (n = c × V; m = n × M). Drop the Na₂CO₃ bottle onto the balance to weigh it.',
   story:`<p>Before the WASSCE practical, the laboratory needs a <b>primary standard</b> to standardise its acids. Anhydrous sodium trioxocarbonate(IV) is pure, stable and does not absorb water, so it is ideal.</p><p><b>Task:</b> prepare 250 cm³ of 0.0500 mol dm⁻³ Na₂CO₃ [Na₂CO₃ = 106 g mol⁻¹]. Dissolve the solid in a beaker, transfer it quantitatively to the volumetric flask (rinse the beaker into the flask), make up to the mark and invert to mix. Then pipette 25.0 cm³ into a second volumetric flask and make up to 250 cm³.</p>`,
   objectives:[{t:'Weigh about 1.33 g of anhydrous Na₂CO₃',check:L=>has(L,e=>e.type==='weigh'&&e.chem==='s_na2co3'&&e.mass>=1.28&&e.mass<=1.38)},
    {t:'Dissolve it in distilled water in a beaker',check:L=>vessels().some(v=>v.type==='beaker'&&(v.hist||[]).includes('s_na2co3')&&(v.hist||[]).includes('water'))||has(L,e=>e.type==='add'&&e.chem==='water'&&e.contents.includes('s_na2co3'))},
    {t:'Transfer the solution into a volumetric flask',check:L=>has(L,e=>e.type==='pour'&&vf({to:e.to}))},
    {t:'Rinse the beaker and add the washings to the flask',check:L=>{const p=L.events.filter(e=>e.type==='pour'&&vf({to:e.to}));const c={};for(const e of p)c[e.from+'>'+e.to]=(c[e.from+'>'+e.to]||0)+1;return Object.values(c).some(n=>n>=2);}},
    {t:'Make up to the mark with distilled water',check:L=>has(L,e=>e.type==='tomark'&&vesselHist(e.vessel).includes('s_na2co3'))},
    {t:'Stopper and invert to mix',check:L=>has(L,e=>e.type==='invert')},
    {t:'Dilute: pipette 25.0 cm³ into a second flask and make up to the mark',check:L=>has(L,e=>e.type==='pipette'&&vf({to:e.to}))&&L.events.filter(e=>e.type==='tomark').length>=2},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'num',q:'Mass of Na₂CO₃ needed for 250 cm³ of 0.0500 mol dm⁻³',unit:'g',check:x=>({ok:Math.abs(x-1.325)<=0.011,msg:'n = 0.0500 × 0.250 = 0.0125 mol; m = 0.0125 × 106 = 1.325 g (1.33 g).'})},
    {type:'num',q:'Actual concentration of your solution, from the mass you weighed',unit:'mol dm⁻³',check:(x,L)=>{const e=[...L.events].reverse().find(e=>e.type==='weigh'&&e.chem==='s_na2co3');if(!e)return {ok:false,msg:'Weigh the solid first.'};const c=e.mass/106/0.25;return {ok:Math.abs(x-c)/c<0.012,msg:`${e.mass.toFixed(2)} g ÷ 106 ÷ 0.250 dm³ = ${c.toFixed(4)} mol dm⁻³.`};}},
    {type:'num',q:'Concentration after diluting 25.0 cm³ to 250 cm³',unit:'mol dm⁻³',check:(x,L)=>{const e=[...L.events].reverse().find(e=>e.type==='weigh'&&e.chem==='s_na2co3');const c=(e?e.mass/106/0.25:0.05)/10;return {ok:Math.abs(x-c)/c<0.015,msg:`C₁V₁ = C₂V₂ → ${c.toFixed(5)} mol dm⁻³ (a ten-fold dilution).`};}},
    {type:'mcq',q:'Why is a volumetric flask used instead of a beaker?',opts:['It holds exactly 250.0 cm³ at the mark, so the concentration is accurate','It dissolves the solid faster','It can be heated'],ans:0},
    {type:'mcq',q:'Why are the beaker washings added to the flask?',opts:['To transfer ALL the weighed solute so none is lost','To cool the solution','To dilute the solution to half strength'],ans:0}],
   setup(){addItem('balance','balance',90,440);addItem('vessel','beaker',290,400);addItem('vessel','volflask',480,350);addItem('vessel','volflask',640,350);addItem('vessel','flask',790,385);}};}},
{id:'purify',tag:'General skills · filtration & recrystallisation',title:'Purifying market blue vitriol',blurb:'Remove sand from impure copper(II) sulphate by filtration, then grow pure crystals by evaporation and cooling.',pills:['Filtration','Evaporation','Recrystallisation'],
 make(){return {stock:S(['s_cuso4imp','water']),glass:['beaker','funnel','dish','burner','flask','tube'],tools:['thermo'],data:false,
   hint:'Dissolve 3 spatulas of the impure salt in about 15 cm³ of water in a beaker and warm it. Place the funnel in the evaporating dish, then drag the beaker onto the funnel.',
   story:`<p>Farmers at Waterloo buy “blue vitriol” (copper(II) sulphate) to make Bordeaux mixture for their crops. A market sample is contaminated with sand.</p><p><b>Task:</b> dissolve the impure salt in warm water, filter off the insoluble impurity, evaporate the filtrate to its crystallisation point, cool it to obtain crystals, then filter, wash and dry the crystals.</p><p class="sub">Tip: use the Time control (×10) while evaporating.</p>`,
   objectives:[{t:'Dissolve the impure salt in warm water',check:L=>has(L,e=>e.type==='heat'&&vesselHist(e.vessel).includes('s_cuso4imp'))||vessels().some(v=>(v.hist||[]).includes('s_cuso4imp')&&v.v.T>40&&v.v.vol>3)},
    {t:'Filter off the insoluble impurity',check:L=>has(L,e=>e.type==='filter'&&e.residue.includes('sand'))},
    {t:'Evaporate the filtrate to crystallisation point in a dish',check:L=>vessels().some(v=>v.type==='dish'&&(v.hist||[]).includes('s_cuso4imp')&&v.v.vol<5&&(v.hist||[]).includes('boiled'))},
    {t:'Cool the concentrated solution to form crystals',check:L=>has(L,e=>e.type==='obs'&&e.pp&&e.pp.includes('CuSO4cr'))},
    {t:'Filter off the crystals, wash and dry them',check:L=>has(L,e=>e.type==='filter'&&e.residue.includes('CuSO4cr'))&&has(L,e=>e.type==='dry'&&e.keys.includes('CuSO4cr'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'mcq',q:'What is the residue on the filter paper after the first filtration?',opts:['Copper(II) sulphate','Sand','Copper(II) hydroxide','Water'],ans:1},
    {type:'mcq',q:'Why should the filtrate NOT be evaporated to dryness?',opts:['The crystals would lose their water of crystallisation and soluble impurities would deposit too','It would take too long','The dish would crack'],ans:0},
    {type:'mcq',q:'How can you tell the crystallisation point has been reached?',opts:['A drop placed on a cold glass rod forms crystals','The solution turns colourless','Bubbles stop forming'],ans:0},
    {type:'mcq',q:'Why are the crystals washed with a little COLD distilled water?',opts:['To remove soluble impurities without dissolving much of the crystals','To make them blue','To dry them'],ans:0},
    {type:'mcq',q:'This purification method is called…',opts:['Distillation','Recrystallisation','Chromatography','Sublimation'],ans:1}],
   setup(){addItem('vessel','beaker',220,400);addItem('funnel','funnel',380,470);addItem('vessel','dish',450,500);addItem('burner','burner',640,380);addItem('vessel','beaker',800,400,{label:'Spare'});}};}},
{id:'mpt',tag:'General skills · melting point',title:'Is the mothball naphthalene pure?',blurb:'Determine melting points with a capillary tube to judge purity, and identify an organic solid.',pills:['Capillary method','Heating curve','Purity'],
 make(){const ids=shuffle(['s_naph','s_naphimp']);const U=ids.map((id,i)=>unknown(id,'Sample '+'XY'[i],{f:'white crystalline solid',st:'solid'}));const B=CHEM.s_benz;
  const rec=(L,id,w)=>[...L.events].reverse().find(e=>e.type==='mp'&&e.chem===id&&e.which===w);
  return {stock:[...U,B],glass:['mpapp'],tools:[],data:false,
   hint:'Drop Sample X onto the melting-point apparatus, heat fast to about 70 °C, then switch to slow heating and record when it starts and finishes melting.',
   story:`<p>A pharmacy in Bo sells mothballs said to be “pure naphthalene” (literature m.p. 80 °C). Two samples, <b>X</b> and <b>Y</b>, were collected. One is pure; one has been adulterated.</p><p><b>Task:</b> determine the melting range of X, Y and a reference sample of benzoic acid. Use your results to decide which sample is pure.</p>`,
   objectives:[...U.map(u=>({t:`Record the melting range of ${u.n}`,check:L=>!!rec(L,u.id,'s')&&!!rec(L,u.id,'e')})),{t:'Record the melting range of benzoic acid',check:L=>!!rec(L,'s_benz','s')&&!!rec(L,'s_benz','e')},{t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[...U.map(u=>({type:'num',q:`Temperature at which ${u.n} starts to melt`,unit:'°C',check:(x,L)=>({ok:Math.abs(x-u.mp[0])<=1.5,msg:`${u.n} starts melting at about ${u.mp[0].toFixed(1)} °C and is fully melted by ${u.mp[1].toFixed(1)} °C.`})})),
    {type:'mcq',q:'Which sample is pure naphthalene?',opts:U.map(u=>u.n),ans:U.findIndex(u=>u.real==='s_naph')},
    {type:'mcq',q:'An impurity affects the melting point by…',opts:['lowering it and widening the melting range','raising it','making it sharper'],ans:0},
    {type:'num',q:'Temperature at which benzoic acid starts to melt',unit:'°C',check:x=>({ok:Math.abs(x-121.8)<=2,msg:'Benzoic acid melts sharply at about 122 °C.'})}],
   setup(){addItem('mp','mpapp',420,330);}};}},
{id:'heatsol',tag:'General skills · heats of solution',title:'Hot packs and cold packs',blurb:'Dissolve weighed solids in water, measure the temperature change and calculate the enthalpy of solution.',pills:['Balance','Exothermic vs endothermic','ΔH(solution)'],
 make(){const cupWith=id=>vessels().find(v=>v.type==='cup'&&(v.hist||[]).includes(id));
  return {stock:S(['s_naoh','s_kno3','s_nh4cl','water']),glass:['balance','cup','beaker'],tools:['thermo'],data:false,
   hint:'Put 50 cm³ of water in Cup 1 and insert the thermometer. Weigh about 2.00 g of NaOH, then drag the balance onto the cup.',
   story:`<p>A clinic in Makeni uses instant <b>cold packs</b> for sprains and <b>hot packs</b> for aches. They work by dissolving salts in water.</p><p><b>Task:</b> dissolve about 2 g of NaOH in 50 cm³ of water and record the temperature change. Repeat with KNO₃ or NH₄Cl. Calculate ΔH(solution) for NaOH. [c = 4.2 J g⁻¹ K⁻¹; NaOH = 40 g mol⁻¹]</p>`,
   objectives:[{t:'Put 50 cm³ of water in a cup with a thermometer',check:L=>has(L,e=>e.type==='thermo')&&has(L,e=>e.type==='add'&&e.chem==='water')},
    {t:'Dissolve about 2.00 g of weighed NaOH',check:L=>has(L,e=>e.type==='weigh'&&e.chem==='s_naoh'&&e.mass>=1.5&&e.mass<=2.5)&&!!cupWith('s_naoh')},
    {t:'Repeat with KNO₃ or NH₄Cl',check:L=>!!(cupWith('s_kno3')||cupWith('s_nh4cl'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'num',q:'Temperature rise when NaOH dissolved',unit:'K',check:x=>{const c=cupWith('s_naoh');if(!c)return {ok:false,msg:'Do the NaOH experiment first.'};const dT=c.maxT-c.mixT0;return {ok:Math.abs(x-dT)<=0.5,msg:`Highest ${c.maxT.toFixed(1)} °C − initial ${c.mixT0.toFixed(1)} °C = ${dT.toFixed(1)} K.`};}},
    {type:'num',q:'ΔH(solution) of NaOH (include the sign)',unit:'kJ mol⁻¹',check:(x,L)=>{const c=cupWith('s_naoh');const w=[...L.events].reverse().find(e=>e.type==='weigh'&&e.chem==='s_naoh');if(!c||!w)return {ok:false,msg:'Do the NaOH experiment first.'};const dT=c.maxT-c.mixT0;const e=-(c.v.vol*4.2*dT)/(w.mass/40)/1000;return {ok:Math.abs(x-e)/Math.abs(e)<0.06,msg:`q = ${c.v.vol.toFixed(0)} × 4.2 × ${dT.toFixed(1)} = ${(c.v.vol*4.2*dT).toFixed(0)} J; n = ${w.mass.toFixed(2)}/40 = ${(w.mass/40).toFixed(4)} mol; ΔH = ${e.toFixed(1)} kJ mol⁻¹ (data book −44.5).`};}},
    {type:'mcq',q:'Which solid dissolves endothermically (suitable for a cold pack)?',opts:['NaOH','KNO₃ / NH₄Cl','Both','Neither'],ans:1},
    {type:'mcq',q:'Why is a polystyrene cup used?',opts:['It is a good insulator, so little heat is lost or gained','It reacts with NaOH','It is cheaper than glass'],ans:0}],
   setup(){addItem('balance','balance',150,440);addItem('vessel','cup',380,390);addItem('vessel','cup',560,390);}};}},
{id:'hardness',tag:'Water · hardness',title:'Hard water in Freetown',blurb:'Compare the hardness of rain, tap, well and borehole water by soap titration, and test the effect of boiling.',pills:['Soap titration','Lather','Temporary vs permanent'],
 make(){const W=['w_rain','w_tap','w_well','w_bore','water'];const runOf=(L,id,boiled)=>L.runs.find(r=>r.hist&&r.hist.includes(id)&&(!!boiled===r.hist.includes('boiled')));
  return {stock:[...S(W),CHEM.soap],glass:['flask','beaker','burette','burner'],tools:['thermo'],data:false,
   hint:'Boil about 50 cm³ of well water in the beaker first (it takes a few minutes; use Time ×30). Fill the burette with soap solution. Pipette 25.0 cm³ of a water sample into a flask under the burette. Add soap 0.5 cm³ at a time and use “Stopper & shake” until a lather lasts.',
   story:`<p>Households in Kissy complain that soap does not lather with their well water and kettles fur up. Compare the hardness of four water samples using a <b>standard soap solution</b>: the volume of soap needed to give a lather that lasts for 1 minute.</p><p>Then <b>boil</b> some well water, cool it, and titrate it again to see whether its hardness is temporary or permanent.</p>`,
   objectives:[{t:'Fill the burette with soap solution',check:L=>has(L,e=>e.type==='fillburette'&&e.chem==='soap')},
    {t:'Titrate three different water samples to a lasting lather',check:L=>new Set(L.runs.map(r=>W.find(w=>r.hist&&r.hist.includes(w))).filter(Boolean)).size>=3},
    {t:'Boil some well water and titrate it again',check:L=>!!runOf(L,'w_well',true)},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'mcq',q:'Which sample is the hardest?',opts:['Rain water','Tap water (Guma)','Well water (Kissy)','Borehole water (Makeni)'],ans:2},
    {type:'mcq',q:'Which sample has TEMPORARY hardness (removed by boiling)?',opts:['Rain water','Well water (Kissy)','Borehole water (Makeni)','Distilled water'],ans:1,explain:'Ca(HCO₃)₂ → CaCO₃ + H₂O + CO₂ on boiling.'},
    {type:'mcq',q:'The borehole water stays hard after boiling because it contains…',opts:['Ca(HCO₃)₂','CaSO₄ (permanent hardness)','NaCl','CO₂'],ans:1},
    {type:'num',q:'Volume of soap used by 25.0 cm³ of unboiled well water',unit:'cm³',check:(x,L)=>{const r=runOf(L,'w_well',false);if(!r)return {ok:false,msg:'Titrate unboiled well water first.'};return {ok:Math.abs(x-r.titre)<=0.3,msg:`Your burette readings give ${r.titre.toFixed(2)} cm³.`};}},
    {type:'mcq',q:'What forms when soap is added to hard water?',opts:['A lather immediately','A white scum (calcium stearate)','A blue precipitate'],ans:1}],
   setup(){addItem('burette','burette',40,58);addItem('vessel','flask',190,385);addItem('vessel','flask',330,385);addItem('vessel','beaker',520,400,{label:'Boil'});addItem('burner','burner',540+20-40+0,380+0);const b=L.items.find(i=>i.label==='Boil');const br=L.items.find(i=>i.kind==='burner');br.x=545;br.y=380;b.x=br.x+br.w/2-b.w/2;b.y=br.y-b.h+18;b.on=br.id;renderAll();}};}},
/* ------------------------------------------------------ */
{id:'thermal',tag:'Qualitative · effect of heat',title:'What happens when salts are heated?',blurb:'Heat solids in dry tubes: decomposition, sublimation, colour changes and water of crystallisation.',pills:['Thermal stability','Gases from heating'],
 make(){return {stock:S(['s_nahco3','s_na2co3','s_cuso4','s_pbno3','s_nh4cl','s_zno','s_nano3','limew','water']),glass:['tube','btube','burner'],tools:STD_TOOLS,data:false,
   hint:'Put a spatula of a solid into a DRY test tube, then drag the tube onto the lit Bunsen burner. Test any gas while heating.',
   story:`<p>In the WASSCE practical, Question 3 often asks about the <b>action of heat</b> on a salt. Heat each solid in a dry test tube, observe colour changes, droplets and gases, and test the gases.</p>`,
   objectives:[{t:'Heat at least four different solids',check:L=>new Set(L.events.filter(e=>e.type==='heat').map(e=>vesselHist(e.vessel)[0])).size>=4},
    {t:'Show that NaHCO₃ gives CO₂ (lime water)',check:L=>has(L,e=>e.type==='passgas'&&e.gases.includes('CO2'))},
    {t:'Relight a glowing splint with a gas from heating',check:L=>has(L,e=>e.type==='tool'&&e.tool==='glow'&&e.gases.includes('O2'))},
    {t:'Submit your report',check:L=>has(L,e=>e.type==='submit')}],
   questions:[{type:'mcq',q:'Which solid gives a reddish-brown gas on heating?',opts:['NaHCO₃','Pb(NO₃)₂','NH₄Cl','ZnO'],ans:1},
    {type:'mcq',q:'Which solid is yellow when hot and white when cold?',opts:['ZnO','CuSO₄·5H₂O','Na₂CO₃','NaNO₃'],ans:0},
    {type:'mcq',q:'Which solid sublimes?',opts:['NaCl','NH₄Cl','Na₂CO₃','CuSO₄'],ans:1},
    {type:'mcq',q:'Na₂CO₃ shows no change on heating because…',opts:['it is a Group 1 carbonate, stable to heat','it melts','it is hydrated','it is amphoteric'],ans:0}],
   setup(){['tube','tube','tube','tube'].forEach((t,i)=>addItem('vessel',t,260+i*70,320));const lw=addItem('vessel','tube',560,320,{label:'Lime water'});addLiquid(lw.v,CHEM.limew,3,[]);equilibrate(lw.v);lw.hist=['limew'];lw.lastSnap=snap(lw.v);addItem('burner','burner',720,380,{lit:true});}};}},
];
