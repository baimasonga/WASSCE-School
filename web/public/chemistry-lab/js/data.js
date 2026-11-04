/* =========================================================
   WASSCE Virtual Chemistry Lab — substance & apparatus data
   Units: solutions → comp in mmol per cm³ (= mol dm⁻³)
          solids    → comp in mmol per spatula (~0.5 g)
   Components: ions, 'Hn' (net protons), weak totals NHt/Act/Ct/St
   ========================================================= */
"use strict";
const AMB = 27; // ambient °C (Sierra Leone lab)

/* ---------- species shown in Solution Info ---------- */
const SPECIES = {
  'Na+':{f:'Na⁺'},'K+':{f:'K⁺'},'Ca2+':{f:'Ca²⁺'},'Pb2+':{f:'Pb²⁺'},'Cu2+':{f:'Cu²⁺',col:[60,140,230],eps:4},
  'Fe2+':{f:'Fe²⁺',col:[150,205,120],eps:1.6},'Fe3+':{f:'Fe³⁺',col:[215,160,45],eps:3},'Al3+':{f:'Al³⁺'},'Zn2+':{f:'Zn²⁺'},
  'Ba2+':{f:'Ba²⁺'},'Ag+':{f:'Ag⁺'},'Mg2+':{f:'Mg²⁺'},'Mn2+':{f:'Mn²⁺',col:[250,215,225],eps:.3},'Cr3+':{f:'Cr³⁺',col:[60,140,70],eps:14},
  'Cl-':{f:'Cl⁻'},'Br-':{f:'Br⁻'},'I-':{f:'I⁻'},'NO3-':{f:'NO₃⁻'},'SO4':{f:'SO₄²⁻'},'S2O3':{f:'S₂O₃²⁻'},'S4O6':{f:'S₄O₆²⁻'},
  'C2O4':{f:'C₂O₄²⁻'},'MnO4-':{f:'MnO₄⁻',col:[215,50,160],eps:7000},'Cr2O7':{f:'Cr₂O₇²⁻',col:[238,125,20],eps:45},
  'SCN-':{f:'SCN⁻'},'Fe(CN)6^3':{f:'[Fe(CN)₆]³⁻',col:[220,190,40],eps:12},'Fe(CN)6^4':{f:'[Fe(CN)₆]⁴⁻',col:[230,220,120],eps:3},
  'NHt':{f:'NH₃/NH₄⁺ (total)'},'Act':{f:'CH₃COOH/CH₃COO⁻ (total)'},'Ct':{f:'CO₃²⁻/HCO₃⁻/H₂CO₃ (total)'},'St':{f:'SO₃²⁻/HSO₃⁻ (total)'},
  'I2':{f:'I₂',col:[140,70,20],eps:260},'Br2':{f:'Br₂',col:[228,120,30],eps:150},'Cl2':{f:'Cl₂',col:[200,220,120],eps:16},
  'IO-':{f:'IO⁻ (hypoiodite)'},'H2O2':{f:'H₂O₂'},'glucose':{f:'glucose'},'sucrose':{f:'sucrose'},'starch':{f:'starch'},
  'protein':{f:'protein'},'ethanol':{f:'C₂H₅OH'},'hexene':{f:'hex-1-ene'},'hexane':{f:'hexane'},'ester':{f:'ethyl ethanoate'},
  'cuCplx':{f:'Cu²⁺ (tartrate/citrate complex)',col:[30,75,215],eps:28},'ninh':{f:'ninhydrin'},'ninhP':{f:'Ruhemann\'s purple',col:[100,40,160],eps:60},
  'xanP':{f:'nitrated protein',col:[240,200,30],eps:30},'millon':{f:'Millon\'s reagent'},
  'MO':{f:'methyl orange'},'MR':{f:'methyl red'},'PP':{f:'phenolphthalein'},'UI':{f:'universal indicator'},'LIT':{f:'litmus'},
  'dibromo':{f:'1,2-dibromohexane'},'soap':{f:'stearate (soap)'},'sand':{f:'sand (SiO₂)'},'Mg(s)':{f:'Mg (s)'},'Zn(s)':{f:'Zn (s)'},'Cu(s)':{f:'Cu (s)'},'MnO2(s)':{f:'MnO₂ (s)'},
};

/* ---------- indicator colours ---------- */
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const IND_COL = {
  MO:pH=>lerp([215,35,40],[245,195,40],cl((pH-3.1)/1.3)),
  MR:pH=>lerp([210,30,70],[240,200,50],cl((pH-4.4)/1.8)),
  PP:pH=>pH<8.2?null:[225,40,140],
  PPeps:pH=>cl((pH-8.2)/1.6),
  LIT:pH=>lerp([210,40,50],[60,80,200],cl((pH-5)/3)),
  UI:pH=>{const s=[[1,[200,20,30]],[3,[240,90,30]],[5,[245,200,40]],[7,[60,170,60]],[9,[40,110,200]],[11,[60,40,170]],[13,[110,20,140]]];
    if(pH<=1)return s[0][1];for(let i=0;i<s.length-1;i++){if(pH<=s[i+1][0])return lerp(s[i][1],s[i+1][1],(pH-s[i][0])/(s[i+1][0]-s[i][0]));}return s[s.length-1][1];},
};

/* ---------- precipitates ---------- */
const PPT = {
  'Fe(OH)3':{n:'iron(III) hydroxide',c:[150,65,25],gel:1,cat:'Fe3+'},
  'Fe(OH)2':{n:'iron(II) hydroxide',c:[70,105,55],gel:1,cat:'Fe2+'},
  'Al(OH)3':{n:'aluminium hydroxide',c:[244,246,242],gel:1,cat:'Al3+'},
  'Cu(OH)2':{n:'copper(II) hydroxide',c:[80,150,225],gel:1,cat:'Cu2+'},
  'Pb(OH)2':{n:'lead(II) hydroxide',c:[248,248,244],gel:0,cat:'Pb2+'},
  'Zn(OH)2':{n:'zinc hydroxide',c:[244,246,242],gel:1,cat:'Zn2+'},
  'Ca(OH)2':{n:'calcium hydroxide',c:[248,248,244],gel:0,cat:'Ca2+'},
  'Mg(OH)2':{n:'magnesium hydroxide',c:[248,248,244],gel:1,cat:'Mg2+'},
  'Ag2O':{n:'silver(I) oxide',c:[110,80,50],gel:0,cat:'Ag+'},
  'Mn(OH)2':{n:'manganese(II) hydroxide',c:[235,225,210],gel:0,cat:'Mn2+'},
  'Cr(OH)3':{n:'chromium(III) hydroxide',c:[90,130,90],gel:1,cat:'Cr3+'},
  'AgCl':{n:'silver chloride',c:[250,250,250],cat:'Ag+'},'AgBr':{n:'silver bromide',c:[245,235,190]},'AgI':{n:'silver iodide',c:[245,220,80]},
  'BaSO4':{n:'barium tetraoxosulphate(VI)',c:[252,252,252]},'BaSO3':{n:'barium trioxosulphate(IV)',c:[250,250,250]},'BaCO3':{n:'barium trioxocarbonate(IV)',c:[250,250,250]},
  'CaCO3':{n:'calcium trioxocarbonate(IV)',c:[250,250,248]},'CaSO3':{n:'calcium trioxosulphate(IV)',c:[250,250,248]},'PbCl2':{n:'lead(II) chloride',c:[250,250,250]},'PbI2':{n:'lead(II) iodide',c:[250,210,30]},
  'PbSO4':{n:'lead(II) tetraoxosulphate(VI)',c:[250,250,250]},'CaSO4':{n:'calcium tetraoxosulphate(VI)',c:[250,250,250]},'CaC2O4':{n:'calcium ethanedioate',c:[250,250,250]},
  'Cu2[Fe(CN)6]':{n:'copper(II) hexacyanoferrate(II)',c:[115,50,25]},'Fe4[Fe(CN)6]3':{n:'Prussian blue',c:[25,40,140]},'Fe3[Fe(CN)6]2':{n:"Turnbull's blue",c:[25,40,150]},
  'Zn2[Fe(CN)6]':{n:'zinc hexacyanoferrate(II)',c:[250,250,250]},'Fe2[Fe(CN)6]':{n:'iron(II) hexacyanoferrate(II)',c:[170,200,235]},
  'PbCO3':{n:'lead(II) trioxocarbonate(IV)',c:[250,250,250]},'ZnCO3':{n:'zinc trioxocarbonate(IV)',c:[250,250,250]},'CuCO3':{n:'copper(II) trioxocarbonate(IV)',c:[120,190,170]},
  'scum':{n:'scum (calcium stearate)',c:[246,246,238]},
  'CuSO4cr':{n:'copper(II) tetraoxosulphate(VI) crystals',c:[40,105,215],cryst:1},'NaClcr':{n:'sodium chloride crystals',c:[252,252,252],cryst:1},'KNO3cr':{n:'potassium trioxonitrate(V) crystals',c:[252,252,252],cryst:1},
  // stored solids (products)
  'Cu2O':{n:'copper(I) oxide',c:[178,60,30],stored:1},'CHI3':{n:'triiodomethane (iodoform)',c:[245,215,50],stored:1},'S':{n:'sulphur',c:[245,235,170],stored:1,colloid:1},
  'CuI':{n:'copper(I) iodide',c:[240,232,215],stored:1},'millonW':{n:'Millon\'s white precipitate',c:[250,250,250],stored:1},'millonR':{n:'Millon\'s red precipitate',c:[180,50,35],stored:1},
  'xanS':{n:'yellow solid (nitrated protein)',c:[240,205,40],stored:1},'protC':{n:'coagulated protein',c:[250,250,245],stored:1},'sand':{n:'sand',c:[205,185,145],stored:1},
};
// hydroxide precipitation: thr = pH at which ppt starts; n = OH per cation; amph = [pH, extraOH]; nh3 = [free NH3 thr (M), ligands]
const HYD = [
  {m:'Fe3+',p:'Fe(OH)3',thr:null,thrFn:c=>2.6+0.7*Math.max(0,Math.log10(0.05/Math.max(c,1e-7))),n:3},
  {m:'Al3+',p:'Al(OH)3',thr:4.0,n:3,amph:[12.4,1]},
  {m:'Cr3+',p:'Cr(OH)3',thr:5.0,n:3,amph:[13.4,1]},
  {m:'Cu2+',p:'Cu(OH)2',thr:5.4,n:2},
  {m:'Pb2+',p:'Pb(OH)2',thr:6.3,n:2,amph:[13.2,2]},
  {m:'Zn2+',p:'Zn(OH)2',thr:6.6,n:2,amph:[13.1,2]},
  {m:'Fe2+',p:'Fe(OH)2',thr:7.4,n:2},
  {m:'Ag+',p:'Ag2O',thr:8.2,n:1},
  {m:'Mn2+',p:'Mn(OH)2',thr:8.6,n:2},
  {m:'Mg2+',p:'Mg(OH)2',thr:9.6,n:2},
  {m:'Ca2+',p:'Ca(OH)2',thr:null,n:2}, // concentration dependent (Ksp)
];
const NH3CPLX = {'Cu2+':{k:4,thr:0.12,col:[30,50,190],eps:60},'Zn2+':{k:4,thr:0.12},'Ag+':{k:2,thr:0.04}};
// salt precipitates [cation, a, anion, b, product, condition]
const SALTS = [
  ['Ag+',1,'Cl-',1,'AgCl',(v,x)=>x.nh3<0.25],
  ['Ag+',1,'Br-',1,'AgBr',(v,x)=>x.nh3<1.2],
  ['Ag+',1,'I-',1,'AgI',()=>true],
  ['Ba2+',1,'SO4',1,'BaSO4',()=>true],
  ['Pb2+',1,'SO4',1,'PbSO4',()=>true],
  ['Pb2+',1,'I-',2,'PbI2',(v,x)=>v.T<72&&x.conc('Pb2+')*x.conc('I-')**2>2e-7],
  ['Pb2+',1,'Cl-',2,'PbCl2',(v,x)=>v.T<70&&x.conc('Pb2+')*x.conc('Cl-')**2>3e-4],
  ['Ca2+',1,'C2O4',1,'CaC2O4',(v,x)=>x.pH0>3.5],
  ['Ca2+',1,'SO4',1,'CaSO4',(v,x)=>x.conc('Ca2+')*x.conc('SO4')>2.5e-3],
  ['Ba2+',1,'St',1,'BaSO3',()=>true,5],
  ['Ba2+',1,'Ct',1,'BaCO3',()=>true,7.2],
  ['Ca2+',1,'Ct',1,'CaCO3',()=>true,7.7],
  ['Ca2+',1,'St',1,'CaSO3',()=>true,7.0],
  ['Pb2+',1,'Ct',1,'PbCO3',()=>true,6.5],
  ['Zn2+',1,'Ct',1,'ZnCO3',()=>true,7.0],
  ['Cu2+',1,'Ct',1,'CuCO3',()=>true,7.0],
  ['Cu2+',2,'Fe(CN)6^4',1,'Cu2[Fe(CN)6]',()=>true],
  ['Fe3+',4,'Fe(CN)6^4',3,'Fe4[Fe(CN)6]3',()=>true],
  ['Fe2+',3,'Fe(CN)6^3',2,'Fe3[Fe(CN)6]2',()=>true],
  ['Zn2+',2,'Fe(CN)6^4',1,'Zn2[Fe(CN)6]',()=>true],
  ['Fe2+',2,'Fe(CN)6^4',1,'Fe2[Fe(CN)6]',()=>true],
  ['Ca2+',1,'soap',2,'scum',()=>true],
  ['Mg2+',1,'soap',2,'scum',()=>true],
];
// solubility (mol dm⁻³) vs temperature → crystals
const SOLUB=[
  ['Cu2+',1,'SO4',1,'CuSO4cr',T=>1.35*Math.exp(0.016*(T-25))],
  ['K+',1,'NO3-',1,'KNO3cr',T=>3.1*Math.exp(0.022*(T-20))],
  ['Na+',1,'Cl-',1,'NaClcr',T=>6.1],
];

/* ---------- gases ---------- */
const GASES = {
  H2:{n:'hydrogen',f:'H₂',colour:'colourless',smell:'odourless',blue:'b',red:'r',burn:'pop',glow:'no',lime:0,dich:0,rodHCl:0,rodNH3:0,comp:null},
  O2:{n:'oxygen',f:'O₂',colour:'colourless',smell:'odourless',blue:'b',red:'r',burn:'bright',glow:'relight',lime:0,dich:0},
  CO2:{n:'carbon(IV) oxide',f:'CO₂',colour:'colourless',smell:'odourless',blue:'faint',red:'r',burn:'out',glow:'no',lime:1,dich:0,comp:{Ct:1,Hn:2}},
  SO2:{n:'sulphur(IV) oxide',f:'SO₂',colour:'colourless',smell:'choking (burning sulphur)',blue:'red',red:'r',burn:'out',glow:'no',lime:1,dich:1,comp:{St:1,Hn:2}},
  NH3:{n:'ammonia',f:'NH₃',colour:'colourless',smell:'pungent, choking',blue:'b',red:'blue',burn:'out',glow:'no',lime:0,dich:0,rodHCl:1,comp:{NHt:1}},
  HCl:{n:'hydrogen chloride',f:'HCl',colour:'colourless (misty white fumes in moist air)',smell:'sharp, irritating',blue:'red',red:'r',burn:'out',glow:'no',lime:0,dich:0,rodNH3:1,comp:{'Cl-':1,Hn:1},fume:[250,250,250]},
  NO2:{n:'nitrogen(IV) oxide',f:'NO₂',colour:'reddish-brown',smell:'pungent, irritating',blue:'red',red:'r',burn:'out',glow:'relight-weak',lime:0,dich:0,comp:{'NO3-':1,Hn:1},fume:[170,75,20]},
  H2O:{n:'steam (water vapour)',f:'H₂O',colour:'colourless; condenses as droplets on the cool part of the tube',smell:'odourless',blue:'b',red:'r',burn:'out',glow:'no',lime:0,dich:0,water:1},
};

/* ---------- stock chemicals ---------- */
// hz: C corrosive, T toxic, F flammable, O oxidiser, X irritant/harmful, E environmental
const HZ = {C:['Corrosive','#b42318'],T:['Toxic','#7c2d12'],F:['Flammable','#c2410c'],O:['Oxidiser','#a16207'],X:['Harmful/irritant','#9a6700'],E:['Harmful to aquatic life','#166534'],N:['Low hazard','#475569']};
const CHEMS = [
 // ---- acids
 {id:'hcl2',cat:'Acids',n:'Dilute hydrochloric acid',f:'HCl',conc:'2.0 mol dm⁻³',st:'sol',comp:{'Cl-':2,Hn:2},bot:[230,240,245],hz:['C'],
  use:'General bench acid. Liberates CO₂ from carbonates, SO₂ from trioxosulphates(IV) and H₂ from reactive metals. Used to acidify and to dissolve precipitates. Industrially: pickling steel, food processing; it is the acid in your stomach.',rx:'HCl + NaOH → NaCl + H₂O;  CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂;  Zn + 2HCl → ZnCl₂ + H₂'},
 {id:'hcl01',cat:'Acids',n:'Hydrochloric acid (standard)',f:'HCl',conc:'0.100 mol dm⁻³',st:'sol',comp:{'Cl-':.1,Hn:.1},bot:[230,240,245],hz:['X'],use:'Standard acid for volumetric analysis (titration).',rx:'Monobasic strong acid: 1 mol HCl ≡ 1 mol H⁺.'},
 {id:'h2so4d',cat:'Acids',n:'Dilute tetraoxosulphate(VI) acid',f:'H₂SO₄',conc:'1.0 mol dm⁻³',st:'sol',comp:{SO4:1,Hn:2},bot:[230,240,245],hz:['C'],use:'Acidifies KMnO₄ and K₂Cr₂O₇ in redox work (HCl would be oxidised). Battery acid; fertiliser manufacture.',rx:'Dibasic: H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O'},
 {id:'h2so4c',cat:'Acids',n:'Concentrated tetraoxosulphate(VI) acid',f:'H₂SO₄',conc:'18 mol dm⁻³ (98%)',st:'sol',comp:{SO4:18,Hn:36},bot:[245,245,240],hz:['C'],conc_:'h2so4',
  use:'Dehydrating and oxidising agent. Used in the brown ring test, to liberate HCl from chlorides, as a catalyst in esterification. Always add acid to water, never water to acid.',rx:'NaCl + H₂SO₄ → NaHSO₄ + HCl(g);  C₂H₅OH + CH₃COOH ⇌ CH₃COOC₂H₅ + H₂O (conc. H₂SO₄ catalyst)'},
 {id:'hno3d',cat:'Acids',n:'Dilute trioxonitrate(V) acid',f:'HNO₃',conc:'2.0 mol dm⁻³',st:'sol',comp:{'NO3-':2,Hn:2},bot:[230,240,245],hz:['C','O'],use:'Acidifies AgNO₃ in the chloride test (removes CO₃²⁻ and SO₃²⁻ interference). Fertiliser and explosive manufacture.',rx:'HNO₃ + KOH → KNO₃ + H₂O'},
 {id:'hno3c',cat:'Acids',n:'Concentrated trioxonitrate(V) acid',f:'HNO₃',conc:'16 mol dm⁻³',st:'sol',comp:{'NO3-':16,Hn:16},bot:[250,245,220],hz:['C','O'],use:'Xanthoproteic test for proteins (turns them yellow). Strong oxidising agent.',rx:'Protein + conc. HNO₃ → yellow nitro-compounds; turns orange with NH₃.'},
 {id:'ch3cooh',cat:'Acids',n:'Ethanoic acid',f:'CH₃COOH',conc:'2.0 mol dm⁻³',st:'sol',comp:{Act:2,Hn:2},bot:[240,240,235],hz:['C'],smell:'vinegar',use:'A weak alkanoic acid; vinegar contains 4–6% ethanoic acid. Used in esterification and food preservation.',rx:'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂;  weak acid → titrate with phenolphthalein.'},
 {id:'hcl1',cat:'Acids',n:'Hydrochloric acid',f:'HCl',conc:'1.0 mol dm⁻³',st:'sol',comp:{'Cl-':1,Hn:1},bot:[230,240,245],hz:['C'],use:'Strong acid for heat of neutralisation experiments.',rx:'H⁺ + OH⁻ → H₂O  ΔH = −57.3 kJ mol⁻¹'},
 {id:'ch3cooh1',cat:'Acids',n:'Ethanoic acid',f:'CH₃COOH',conc:'1.0 mol dm⁻³',st:'sol',comp:{Act:1,Hn:1},bot:[240,240,235],hz:['X'],smell:'vinegar',use:'Weak acid for heat of neutralisation comparison.',rx:'Weak acid: ΔH(neutralisation) less exothermic than −57 kJ mol⁻¹'},
 // ---- bases
 {id:'naoh2',cat:'Bases',n:'Sodium hydroxide solution',f:'NaOH',conc:'2.0 mol dm⁻³',st:'sol',comp:{'Na+':2,Hn:-2},bot:[235,240,245],hz:['C'],use:'Main group reagent for cations: precipitates insoluble hydroxides. Soap making, paper and aluminium industries.',rx:'M²⁺ + 2OH⁻ → M(OH)₂(s);  Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻ (amphoteric);  NH₄⁺ + OH⁻ → NH₃ + H₂O (on warming)'},
 {id:'naoh01',cat:'Bases',n:'Sodium hydroxide (standard)',f:'NaOH',conc:'0.100 mol dm⁻³',st:'sol',comp:{'Na+':.1,Hn:-.1},bot:[235,240,245],hz:['X'],use:'Standard alkali for titrations.',rx:'NaOH + HCl → NaCl + H₂O (1 : 1)'},
 {id:'koh01',cat:'Bases',n:'Potassium hydroxide (standard)',f:'KOH',conc:'0.100 mol dm⁻³',st:'sol',comp:{'K+':.1,Hn:-.1},bot:[235,240,245],hz:['X'],use:'Standard alkali; soft soaps and alkaline batteries.',rx:'KOH + HNO₃ → KNO₃ + H₂O'},
 {id:'naoh1',cat:'Bases',n:'Sodium hydroxide solution',f:'NaOH',conc:'1.0 mol dm⁻³',st:'sol',comp:{'Na+':1,Hn:-1},bot:[235,240,245],hz:['C'],use:'Strong alkali for heat of neutralisation experiments.',rx:'NaOH + HCl → NaCl + H₂O'},
 {id:'nh3aq',cat:'Bases',n:'Aqueous ammonia',f:'NH₃(aq)',conc:'2.0 mol dm⁻³',st:'sol',comp:{NHt:2},bot:[235,240,245],hz:['C','X'],smell:'ammonia',use:'Second group reagent for cations. Forms soluble ammine complexes with Cu²⁺, Zn²⁺ and Ag⁺. Fertilisers, household cleaners.',rx:'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ (deep blue) + 2OH⁻'},
 {id:'na2co3s',cat:'Bases',n:'Sodium trioxocarbonate(IV) (standard)',f:'Na₂CO₃',conc:'0.0500 mol dm⁻³',st:'sol',comp:{'Na+':.1,Ct:.05},bot:[235,240,245],hz:['X'],use:'Primary standard base for standardising acids (washing soda). Glass making, water softening.',rx:'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂ (methyl orange end point)'},
 {id:'limew',cat:'Bases',n:'Lime water',f:'Ca(OH)₂(aq)',conc:'saturated (~0.02 mol dm⁻³)',st:'sol',comp:{'Ca2+':.02,Hn:-.04},bot:[240,245,245],hz:['X'],use:'Test for CO₂: turns milky (CaCO₃). Prolonged CO₂ makes it clear again (soluble Ca(HCO₃)₂).',rx:'Ca(OH)₂ + CO₂ → CaCO₃(s) + H₂O;  CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂'},
 // ---- salt solutions (cations)
 {id:'nh4cl',cat:'Salt solutions',n:'Ammonium chloride solution',f:'NH₄Cl',conc:'0.5 mol dm⁻³',st:'sol',comp:{NHt:.5,Hn:.5,'Cl-':.5},bot:[240,245,245],hz:['X'],use:'Source of NH₄⁺ ions. Used in dry cells and as a fertiliser.',rx:'NH₄Cl + NaOH → NaCl + H₂O + NH₃ (on warming)'},
 {id:'cacl2',cat:'Salt solutions',n:'Calcium chloride solution',f:'CaCl₂',conc:'0.2 mol dm⁻³',st:'sol',comp:{'Ca2+':.2,'Cl-':.4},bot:[240,245,245],hz:['X'],use:'Drying agent; road de-icing. Source of Ca²⁺ (hard water ion).',rx:'Ca²⁺ + 2OH⁻ → Ca(OH)₂ (white, insoluble in excess NaOH; no ppt with NH₃)'},
 {id:'pbno3',cat:'Salt solutions',n:'Lead(II) trioxonitrate(V) solution',f:'Pb(NO₃)₂',conc:'0.1 mol dm⁻³',st:'sol',comp:{'Pb2+':.1,'NO3-':.2,Hn:.002},bot:[240,245,245],hz:['T','E'],use:'Source of Pb²⁺. Lead compounds are toxic, so wash your hands after use.',rx:'Pb²⁺ + 2I⁻ → PbI₂ (yellow; dissolves when hot, golden spangles on cooling)'},
 {id:'cuso4',cat:'Salt solutions',n:'Copper(II) tetraoxosulphate(VI) solution',f:'CuSO₄',conc:'0.1 mol dm⁻³',st:'sol',comp:{'Cu2+':.1,SO4:.1,Hn:.002},bot:[90,150,230],hz:['X','E'],use:'Blue vitriol. Fungicide (Bordeaux mixture), electroplating, the Biuret test.',rx:'Cu²⁺ + 2OH⁻ → Cu(OH)₂ (blue);  excess NH₃ → [Cu(NH₃)₄]²⁺ (deep blue)'},
 {id:'cuso4d',cat:'Salt solutions',n:'Copper(II) tetraoxosulphate(VI), dilute (1%)',f:'CuSO₄',conc:'0.04 mol dm⁻³',st:'sol',comp:{'Cu2+':.04,SO4:.04,Hn:.001},bot:[150,190,235],hz:['X'],use:'Biuret reagent component: NaOH(aq) then a few drops of dilute CuSO₄.',rx:'Protein + Cu²⁺ in alkali → violet complex'},
 {id:'feso4',cat:'Salt solutions',n:'Iron(II) tetraoxosulphate(VI) solution',f:'FeSO₄',conc:'0.1 mol dm⁻³ (acidified)',st:'sol',comp:{'Fe2+':.1,SO4:.11,Hn:.02},bot:[180,215,160],hz:['X'],use:'Source of Fe²⁺; brown ring test for NO₃⁻; iron supplements for anaemia.',rx:'Fe²⁺ + 2OH⁻ → Fe(OH)₂ (green, turns brown on standing as it is oxidised)'},
 {id:'fecl3',cat:'Salt solutions',n:'Iron(III) chloride solution',f:'FeCl₃',conc:'0.1 mol dm⁻³',st:'sol',comp:{'Fe3+':.1,'Cl-':.32,Hn:.02},bot:[210,150,50],hz:['C','X'],use:'Source of Fe³⁺. Etching copper circuit boards; water treatment (coagulant).',rx:'Fe³⁺ + 3OH⁻ → Fe(OH)₃ (reddish-brown);  Fe³⁺ + SCN⁻ → blood-red complex'},
 {id:'al2so43',cat:'Salt solutions',n:'Aluminium tetraoxosulphate(VI) solution',f:'Al₂(SO₄)₃',conc:'0.05 mol dm⁻³',st:'sol',comp:{'Al3+':.1,SO4:.15,Hn:.01},bot:[240,245,245],hz:['X'],use:'Alum is used in water purification at Guma Valley (coagulates fine particles); also as a paper sizing agent.',rx:'Al³⁺ + 3OH⁻ → Al(OH)₃ (white gelatinous); dissolves in excess NaOH → [Al(OH)₄]⁻'},
 {id:'znso4',cat:'Salt solutions',n:'Zinc tetraoxosulphate(VI) solution',f:'ZnSO₄',conc:'0.1 mol dm⁻³',st:'sol',comp:{'Zn2+':.1,SO4:.1,Hn:.002},bot:[240,245,245],hz:['X','E'],use:'Source of Zn²⁺; zinc supplements; galvanising and electroplating.',rx:'Zn(OH)₂ dissolves in excess NaOH AND in excess NH₃.'},
 {id:'agno3',cat:'Salt solutions',n:'Silver trioxonitrate(V) solution',f:'AgNO₃',conc:'0.1 mol dm⁻³',st:'sol',comp:{'Ag+':.1,'NO3-':.1},bot:[230,230,225],hz:['C','E'],use:'Test for halide ions (acidify with dil. HNO₃ first). Photography, mirrors.',rx:'Ag⁺ + Cl⁻ → AgCl (white, soluble in NH₃);  AgBr cream;  AgI yellow'},
 {id:'bacl2',cat:'Salt solutions',n:'Barium chloride solution',f:'BaCl₂',conc:'0.2 mol dm⁻³',st:'sol',comp:{'Ba2+':.2,'Cl-':.4},bot:[240,245,245],hz:['T'],use:'Test for SO₄²⁻ (white ppt insoluble in dil. HCl) and for SO₃²⁻/CO₃²⁻ (ppts soluble in acid).',rx:'Ba²⁺ + SO₄²⁻ → BaSO₄(s)'},
 {id:'ki',cat:'Salt solutions',n:'Potassium iodide solution',f:'KI',conc:'0.5 mol dm⁻³',st:'sol',comp:{'K+':.5,'I-':.5},bot:[240,245,245],hz:['N'],use:'Confirms Pb²⁺ (yellow PbI₂). Iodide source in halogen displacement and iodometric titrations. Added to table salt (iodised salt).',rx:'Cl₂ + 2I⁻ → 2Cl⁻ + I₂ (brown)'},
 {id:'kbr',cat:'Salt solutions',n:'Potassium bromide solution',f:'KBr',conc:'0.5 mol dm⁻³',st:'sol',comp:{'K+':.5,'Br-':.5},bot:[240,245,245],hz:['N'],use:'Bromide source for halogen displacement.',rx:'Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂ (orange)'},
 {id:'kcl',cat:'Salt solutions',n:'Potassium chloride solution',f:'KCl',conc:'0.5 mol dm⁻³',st:'sol',comp:{'K+':.5,'Cl-':.5},bot:[240,245,245],hz:['N'],use:'Chloride source; potash fertiliser.',rx:'No halogen except F₂ can displace Cl⁻.'},
 {id:'nacl',cat:'Salt solutions',n:'Sodium chloride solution',f:'NaCl',conc:'0.5 mol dm⁻³',st:'sol',comp:{'Na+':.5,'Cl-':.5},bot:[240,245,245],hz:['N'],use:'Common salt; food seasoning and preservation; brine electrolysis gives NaOH, Cl₂ and H₂.',rx:'Cl⁻ + Ag⁺ → AgCl(s) white'},
 {id:'na2so4',cat:'Salt solutions',n:'Sodium tetraoxosulphate(VI) solution',f:'Na₂SO₄',conc:'0.2 mol dm⁻³',st:'sol',comp:{'Na+':.4,SO4:.2},bot:[240,245,245],hz:['N'],use:'Glauber\'s salt; detergent filler.',rx:'SO₄²⁻ + Ba²⁺ → BaSO₄ (insoluble in dil. HCl)'},
 {id:'na2so3',cat:'Salt solutions',n:'Sodium trioxosulphate(IV) solution',f:'Na₂SO₃',conc:'0.2 mol dm⁻³',st:'sol',comp:{'Na+':.4,St:.2},bot:[240,245,245],hz:['X'],use:'Food preservative (E221); reducing agent.',rx:'SO₃²⁻ + 2H⁺ → SO₂ + H₂O; decolourises KMnO₄, turns K₂Cr₂O₇ green'},
 {id:'na2co3',cat:'Salt solutions',n:'Sodium trioxocarbonate(IV) solution',f:'Na₂CO₃',conc:'0.5 mol dm⁻³',st:'sol',comp:{'Na+':1,Ct:.5},bot:[240,245,245],hz:['X'],use:'Washing soda: softens hard water; glass making.',rx:'CO₃²⁻ + 2H⁺ → CO₂ + H₂O (effervescence)'},
 {id:'nahco3',cat:'Salt solutions',n:'Sodium hydrogentrioxocarbonate(IV) solution',f:'NaHCO₃',conc:'0.5 mol dm⁻³',st:'sol',comp:{'Na+':.5,Ct:.5,Hn:.5},bot:[240,245,245],hz:['N'],use:'Baking soda; antacids; test for alkanoic acids (effervescence).',rx:'RCOOH + NaHCO₃ → RCOONa + H₂O + CO₂'},
 {id:'nano3',cat:'Salt solutions',n:'Sodium trioxonitrate(V) solution',f:'NaNO₃',conc:'0.5 mol dm⁻³',st:'sol',comp:{'Na+':.5,'NO3-':.5},bot:[240,245,245],hz:['O'],use:'Fertiliser (Chile saltpetre); meat preservation.',rx:'Brown ring test: NO₃⁻ + FeSO₄ + conc. H₂SO₄ → brown ring'},
 {id:'kscn',cat:'Salt solutions',n:'Potassium thiocyanate solution',f:'KSCN',conc:'0.1 mol dm⁻³',st:'sol',comp:{'K+':.1,'SCN-':.1},bot:[240,245,245],hz:['X'],use:'Confirmatory test for Fe³⁺.',rx:'Fe³⁺ + SCN⁻ → [Fe(SCN)]²⁺ (blood red)'},
 {id:'k3fecn6',cat:'Salt solutions',n:'Potassium hexacyanoferrate(III)',f:'K₃Fe(CN)₆',conc:'0.1 mol dm⁻³',st:'sol',comp:{'K+':.3,'Fe(CN)6^3':.1},bot:[230,200,60],hz:['X'],use:'Confirms Fe²⁺: dark blue precipitate (Turnbull\'s blue).',rx:'3Fe²⁺ + 2[Fe(CN)₆]³⁻ → Fe₃[Fe(CN)₆]₂ (dark blue)'},
 {id:'k4fecn6',cat:'Salt solutions',n:'Potassium hexacyanoferrate(II)',f:'K₄Fe(CN)₆',conc:'0.1 mol dm⁻³',st:'sol',comp:{'K+':.4,'Fe(CN)6^4':.1},bot:[240,230,150],hz:['X'],use:'Confirms Fe³⁺ (Prussian blue) and Cu²⁺ (chocolate-brown precipitate).',rx:'4Fe³⁺ + 3[Fe(CN)₆]⁴⁻ → Fe₄[Fe(CN)₆]₃ (Prussian blue)'},
 {id:'nh4ox',cat:'Salt solutions',n:'Ammonium ethanedioate (oxalate)',f:'(NH₄)₂C₂O₄',conc:'0.25 mol dm⁻³',st:'sol',comp:{NHt:.5,Hn:.5,C2O4:.25},bot:[240,245,245],hz:['X'],use:'Confirms Ca²⁺: white CaC₂O₄ precipitate (insoluble in ethanoic acid).',rx:'Ca²⁺ + C₂O₄²⁻ → CaC₂O₄(s)'},
 // ---- redox
 {id:'kmno4',cat:'Redox reagents',n:'Potassium tetraoxomanganate(VII)',f:'KMnO₄',conc:'0.0200 mol dm⁻³',st:'sol',comp:{'K+':.02,'MnO4-':.02},bot:[110,20,120],hz:['O','X','E'],use:'Strong oxidising agent and self-indicator in titrations. Disinfectant. Decolourised by Fe²⁺, C₂O₄²⁻, SO₂ and alkenes.',rx:'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O'},
 {id:'k2cr2o7',cat:'Redox reagents',n:'Acidified potassium heptaoxodichromate(VI)',f:'K₂Cr₂O₇/H⁺',conc:'0.05 mol dm⁻³',st:'sol',comp:{'K+':.1,Cr2O7:.05,SO4:.5,Hn:1},bot:[238,130,30],hz:['T','O','C'],use:'Oxidising agent. Test for SO₂ (orange → green) and alkanols (orange → green). Used in old breathalysers.',rx:'Cr₂O₇²⁻ + 3SO₂ + 2H⁺ → 2Cr³⁺ + 3SO₄²⁻ + H₂O'},
 {id:'na2s2o3',cat:'Redox reagents',n:'Sodium thiosulphate (standard)',f:'Na₂S₂O₃',conc:'0.100 mol dm⁻³',st:'sol',comp:{'Na+':.2,S2O3:.1},bot:[240,245,245],hz:['N'],use:'Titrant for iodine (iodometry). "Hypo" fixer in photography.',rx:'I₂ + 2S₂O₃²⁻ → 2I⁻ + S₄O₆²⁻'},
 {id:'na2s2o3r',cat:'Redox reagents',n:'Sodium thiosulphate (rates)',f:'Na₂S₂O₃',conc:'0.150 mol dm⁻³',st:'sol',comp:{'Na+':.3,S2O3:.15},bot:[240,245,245],hz:['N'],use:'Rate experiments: forms a sulphur precipitate with acid.',rx:'S₂O₃²⁻ + 2H⁺ → S(s) + SO₂ + H₂O'},
 {id:'i2ki',cat:'Redox reagents',n:'Iodine solution (I₂ in KI)',f:'I₂/KI',conc:'0.05 mol dm⁻³ I₂',st:'sol',comp:{I2:.05,'I-':.3,'K+':.3},bot:[150,80,25],hz:['X'],use:'Test for starch (blue-black). Antiseptic (tincture of iodine). Halogen comparisons.',rx:'I₂ + starch → blue-black complex'},
 {id:'cl2aq',cat:'Redox reagents',n:'Chlorine water',f:'Cl₂(aq)',conc:'~0.05 mol dm⁻³',st:'sol',comp:{Cl2:.05},bot:[210,230,150],hz:['T','O'],smell:'chlorine',use:'Most reactive of the three halogens here. Water treatment and bleach.',rx:'Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂;  Cl₂ + 2I⁻ → 2Cl⁻ + I₂'},
 {id:'br2aq',cat:'Redox reagents',n:'Bromine water',f:'Br₂(aq)',conc:'~0.02 mol dm⁻³',st:'sol',comp:{Br2:.02},bot:[225,125,35],hz:['T','C'],smell:'bromine',use:'Test for unsaturation: decolourised by alkenes. Displaces I₂ from iodides.',rx:'C=C + Br₂ → C(Br)–C(Br) (colourless)'},
 {id:'h2o2',cat:'Redox reagents',n:'Hydrogen peroxide',f:'H₂O₂',conc:'10-volume (~0.9 mol dm⁻³)',st:'sol',comp:{H2O2:.9},bot:[240,245,245],hz:['O','X'],use:'Laboratory preparation of oxygen with MnO₂ catalyst. Antiseptic; hair bleach.',rx:'2H₂O₂ → 2H₂O + O₂ (MnO₂ catalyst)'},
 // ---- indicators
 {id:'mo',cat:'Indicators',n:'Methyl orange',f:'indicator',conc:'0.1%',st:'sol',comp:{MO:1},bot:[240,150,40],hz:['X'],use:'pH 3.1 (red) – 4.4 (yellow). Use for strong acid vs strong or weak base (e.g. HCl vs Na₂CO₃ or NH₃).',rx:'Yellow in alkali → orange at end point → red in acid'},
 {id:'mr',cat:'Indicators',n:'Methyl red',f:'indicator',conc:'0.1%',st:'sol',comp:{MR:1},bot:[220,60,70],hz:['X'],use:'pH 4.4 (red) – 6.2 (yellow). Strong acid vs strong/weak base.',rx:'Yellow in alkali → red in acid'},
 {id:'pp',cat:'Indicators',n:'Phenolphthalein',f:'indicator',conc:'1% in ethanol',st:'sol',comp:{PP:1},bot:[245,245,240],hz:['F','X'],use:'pH 8.2 (colourless) – 10 (pink). Use for weak acid vs strong base (e.g. ethanoic acid vs NaOH).',rx:'Pink in alkali → colourless in acid'},
 {id:'ui',cat:'Indicators',n:'Universal indicator',f:'indicator',conc:'—',st:'sol',comp:{UI:1},bot:[60,160,70],hz:['F'],use:'Gives a colour for each pH (red 1 → green 7 → violet 13). Determination of pH by colorimetry.',rx:'Compare the colour with the pH chart.'},
 {id:'lit',cat:'Indicators',n:'Litmus solution',f:'indicator',conc:'—',st:'sol',comp:{LIT:1},bot:[110,70,170],hz:['N'],use:'Red in acid, blue in alkali. Used in the aluminium "blue lake" test.',rx:'Al(OH)₃ adsorbs litmus → blue lake'},
 {id:'starchi',cat:'Indicators',n:'Starch indicator',f:'(C₆H₁₀O₅)ₙ',conc:'1%',st:'sol',comp:{starch:.2},bot:[245,245,238],hz:['N'],use:'Indicator for iodine titrations. Add near the end point when the solution is pale yellow.',rx:'I₂ + starch → blue-black'},
 // ---- food & organic test reagents
 {id:'fehling',cat:'Food/organic test reagents',n:"Fehling's solution (A + B)",f:'Cu²⁺/tartrate/NaOH',conc:'—',st:'sol',comp:{cuCplx:.07,'Na+':1,Hn:-.6},bot:[40,90,220],hz:['C'],use:'Test for reducing sugars: brick-red Cu₂O on warming.',rx:'Reducing sugar + Cu²⁺(complex) → Cu₂O (brick red)'},
 {id:'benedict',cat:'Food/organic test reagents',n:"Benedict's solution",f:'Cu²⁺/citrate/Na₂CO₃',conc:'—',st:'sol',comp:{cuCplx:.03,'Na+':.5,Ct:.25},bot:[70,130,225],hz:['X'],use:'Gentler test for reducing sugars. Green → yellow → orange → brick-red as sugar increases.',rx:'Reducing sugar → Cu₂O (brick red)'},
 {id:'ninhydrin',cat:'Food/organic test reagents',n:'Ninhydrin solution',f:'C₉H₆O₄',conc:'0.2%',st:'sol',comp:{ninh:1},bot:[245,245,235],hz:['X'],use:'Detects amino acids and proteins: purple on warming. Used by forensic scientists to reveal fingerprints.',rx:'Amino acid + ninhydrin → Ruhemann\'s purple'},
 {id:'millons',cat:'Food/organic test reagents',n:"Millon's reagent",f:'Hg/HNO₃',conc:'—',st:'sol',comp:{millon:1,'NO3-':1,Hn:1},bot:[245,245,235],hz:['T','C','E'],use:'Test for proteins (tyrosine): white precipitate turning brick red on warming. Contains mercury, so it is very toxic.',rx:'Protein + Millon\'s → white ppt → red on heating'},
 {id:'ethanol',cat:'Organic compounds',n:'Ethanol',f:'C₂H₅OH',conc:'absolute',st:'sol',comp:{ethanol:17},bot:[245,248,250],hz:['F','X'],smell:'alcohol',flam:1,use:'Alkanol. Solvent, fuel, disinfectant; the alcohol in palm wine (omole/poyo).',rx:'Oxidised by acidified K₂Cr₂O₇ (orange → green); iodoform test: yellow CHI₃'},
 {id:'hexene',cat:'Organic compounds',n:'Hex-1-ene',f:'C₆H₁₂',conc:'liquid',st:'org',comp:{hexene:8},bot:[245,248,250],hz:['F','X'],smell:'petrol',flam:1,use:'Alkene (unsaturated). Alkenes make polymers like polythene.',rx:'Decolourises bromine water and acidified KMnO₄'},
 {id:'hexane',cat:'Organic compounds',n:'Hexane',f:'C₆H₁₄',conc:'liquid',st:'org',comp:{hexane:7.6},bot:[245,248,250],hz:['F','X','E'],smell:'petrol',flam:1,use:'Alkane (saturated). Non-polar solvent: extracts halogens into a coloured upper layer.',rx:'No reaction with bromine water in the dark.'},
 {id:'glucose',cat:'Organic compounds',n:'Glucose solution',f:'C₆H₁₂O₆',conc:'0.2 mol dm⁻³',st:'sol',comp:{glucose:.2},bot:[245,245,240],hz:['N'],use:'Reducing sugar. Energy drinks, drips in hospitals.',rx:"Fehling's/Benedict's: brick-red precipitate"},
 {id:'sucrose',cat:'Organic compounds',n:'Sucrose solution',f:'C₁₂H₂₂O₁₁',conc:'0.2 mol dm⁻³',st:'sol',comp:{sucrose:.2},bot:[245,245,240],hz:['N'],use:'Table sugar (from sugar cane). Non-reducing sugar.',rx:"No change with Fehling's until hydrolysed by boiling with dil. HCl"},
 {id:'starchs',cat:'Organic compounds',n:'Starch solution (cassava)',f:'(C₆H₁₀O₅)ₙ',conc:'1%',st:'sol',comp:{starch:1},bot:[240,240,232],hz:['N'],use:'Polysaccharide from cassava, rice and maize, the staple carbohydrates.',rx:'Iodine → blue-black;  acid hydrolysis → glucose'},
 {id:'albumen',cat:'Organic compounds',n:'Egg albumen (protein)',f:'protein',conc:'1%',st:'sol',comp:{protein:1},bot:[245,240,215],hz:['N'],use:'Protein from egg white. Proteins are made of amino acids joined by peptide links.',rx:'Biuret violet; xanthoproteic yellow; Millon\'s red; coagulates on heating'},
 {id:'water',cat:'General',n:'Distilled water',f:'H₂O',conc:'—',st:'sol',comp:{},bot:[225,240,250],hz:['N'],use:'Solvent for dissolving samples and rinsing apparatus.',rx:'Turns anhydrous CuSO₄ from white to blue'},
 // ---- solids
 {id:'s_nacl',M:58.5,per:8.5,cat:'Solids',n:'Sodium chloride crystals',f:'NaCl(s)',st:'solid',comp:{'Na+':8.5,'Cl-':8.5},bot:[250,250,250],hz:['N'],solid:[250,250,250],use:'Table salt. Conc. H₂SO₄ liberates HCl gas from it.',rx:'NaCl + H₂SO₄(conc) → NaHSO₄ + HCl(g)'},
 {id:'s_na2co3',M:106,per:4.7,cat:'Solids',n:'Anhydrous sodium trioxocarbonate(IV)',f:'Na₂CO₃(s)',st:'solid',comp:{'Na+':9.4,Ct:4.7},bot:[250,250,250],hz:['X'],solid:[250,250,250],use:'Soda ash. Stable to heat (Group 1 carbonate).',rx:'Does not decompose on heating with a Bunsen flame.'},
 {id:'s_nahco3',M:84,per:6,cat:'Solids',n:'Sodium hydrogentrioxocarbonate(IV)',f:'NaHCO₃(s)',st:'solid',comp:{'Na+':6,Ct:6,Hn:6},bot:[250,250,250],hz:['N'],solid:[250,250,250],use:'Baking powder: releases CO₂ when heated, making bread rise.',rx:'2NaHCO₃ → Na₂CO₃ + H₂O + CO₂ (on heating)',heat:'nahco3'},
 {id:'s_na2so3',cat:'Solids',n:'Sodium trioxosulphate(IV)',f:'Na₂SO₃(s)',st:'solid',comp:{'Na+':8,St:4},bot:[250,250,250],hz:['X'],solid:[250,250,250],use:'Preparation of SO₂ with dilute acid.',rx:'Na₂SO₃ + 2HCl → 2NaCl + H₂O + SO₂'},
 {id:'s_nano3',M:85,per:6,cat:'Solids',n:'Sodium trioxonitrate(V)',f:'NaNO₃(s)',st:'solid',comp:{'Na+':6,'NO3-':6},bot:[250,250,250],hz:['O'],solid:[250,250,250],use:'Oxidiser; fertiliser. On heating gives O₂ (relights glowing splint).',rx:'2NaNO₃ → 2NaNO₂ + O₂',heat:'nano3'},
 {id:'s_na2so4',M:142,per:3.5,cat:'Solids',n:'Sodium tetraoxosulphate(VI)',f:'Na₂SO₄(s)',st:'solid',comp:{'Na+':7,SO4:3.5},bot:[250,250,250],hz:['N'],solid:[250,250,250],use:'Sample salt for the SO₄²⁻ test.',rx:'Stable to heat.'},
 {id:'s_nh4cl',M:53.5,per:9.3,cat:'Solids',n:'Ammonium chloride',f:'NH₄Cl(s)',st:'solid',comp:{NHt:9.3,Hn:9.3,'Cl-':9.3},bot:[250,250,250],hz:['X'],solid:[250,250,250],use:'Sal ammoniac. Sublimes on heating. With Ca(OH)₂ gives NH₃ (laboratory preparation).',rx:'NH₄Cl ⇌ NH₃ + HCl (heat);  2NH₄Cl + Ca(OH)₂ → CaCl₂ + 2H₂O + 2NH₃',heat:'nh4cl',enth:15},
 {id:'s_caco3',cat:'Solids',n:'Marble chips (calcium trioxocarbonate(IV))',f:'CaCO₃(s)',st:'solid',comp:{'Ca2+':5,Ct:5},bot:[245,245,240],hz:['N'],solid:[240,240,235],use:'Limestone/marble: lab preparation of CO₂ with dil. HCl; cement and lime manufacture.',rx:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂'},
 {id:'s_caoh2',cat:'Solids',n:'Calcium hydroxide (slaked lime)',f:'Ca(OH)₂(s)',st:'solid',comp:{'Ca2+':6.7,Hn:-13.4},bot:[250,250,250],hz:['C'],solid:[250,250,250],use:'Neutralises acidic soils; whitewash; NH₃ preparation with NH₄Cl.',rx:'Ca(OH)₂ + 2NH₄Cl → CaCl₂ + 2NH₃ + 2H₂O'},
 {id:'s_naoh',M:40,per:12.5,cat:'Solids',n:'Sodium hydroxide pellets',f:'NaOH(s)',st:'solid',comp:{'Na+':12.5,Hn:-12.5},bot:[250,250,250],hz:['C'],solid:[252,252,252],enth:-44.5,use:'Caustic soda. Dissolves very exothermically (heat of solution).',rx:'NaOH(s) → Na⁺(aq) + OH⁻(aq)  ΔH = −44.5 kJ mol⁻¹'},
 {id:'s_cuso4',M:249.7,per:2,cat:'Solids',n:'Copper(II) tetraoxosulphate(VI) crystals',f:'CuSO₄·5H₂O(s)',st:'solid',comp:{'Cu2+':2,SO4:2,Hn:.03},bot:[60,120,220],hz:['X','E'],solid:[50,110,210],use:'Blue vitriol. Loses water of crystallisation on heating (blue → white).',rx:'CuSO₄·5H₂O → CuSO₄ + 5H₂O (heat)',heat:'cuso4'},
 {id:'s_cuso4a',M:159.6,per:3.1,cat:'Solids',n:'Anhydrous copper(II) tetraoxosulphate(VI)',f:'CuSO₄(s)',st:'solid',comp:{'Cu2+':3.1,SO4:3.1,Hn:.04},bot:[245,245,240],hz:['X','E'],solid:[240,240,232],enth:-66,use:'Test for water: white → blue.',rx:'CuSO₄ + 5H₂O → CuSO₄·5H₂O (blue), exothermic'},
 {id:'s_pbno3',cat:'Solids',n:'Lead(II) trioxonitrate(V)',f:'Pb(NO₃)₂(s)',st:'solid',comp:{'Pb2+':1.5,'NO3-':3,Hn:.02},bot:[250,250,250],hz:['T','O','E'],solid:[250,250,250],use:'Thermal decomposition demo: brown NO₂ and O₂.',rx:'2Pb(NO₃)₂ → 2PbO + 4NO₂ + O₂',heat:'pbno3'},
 {id:'s_zno',cat:'Solids',n:'Zinc oxide',f:'ZnO(s)',st:'solid',comp:{'Zn2+':6,Hn:-12},bot:[250,250,250],hz:['E'],solid:[250,250,250],use:'Amphoteric oxide; sunscreen; rubber vulcanisation. Yellow when hot, white when cold.',rx:'ZnO + 2HCl → ZnCl₂ + H₂O;  ZnO + 2NaOH + H₂O → Na₂[Zn(OH)₄]',heat:'zno'},
 {id:'s_zn',cat:'Solids',n:'Zinc granules',f:'Zn(s)',st:'solid',comp:{'Zn(s)':7.6},bot:[170,175,180],hz:['N'],solid:[150,155,160],metal:1,use:'Laboratory preparation of hydrogen with dilute acid. Galvanising iron roofing sheets.',rx:'Zn + 2HCl → ZnCl₂ + H₂'},
 {id:'s_mg',cat:'Solids',n:'Magnesium ribbon',f:'Mg(s)',st:'solid',comp:{'Mg(s)':4},bot:[200,205,210],hz:['F'],solid:[205,210,215],metal:1,use:'Reacts rapidly with dilute acids (H₂). Burns with a dazzling white flame.',rx:'Mg + 2HCl → MgCl₂ + H₂'},
 {id:'s_cu',cat:'Solids',n:'Copper turnings',f:'Cu(s)',st:'solid',comp:{'Cu(s)':7.8},bot:[190,110,60],hz:['N'],solid:[185,105,55],metal:1,use:'With conc. H₂SO₄ and a nitrate gives brown NO₂ (nitrate test). Electrical wiring.',rx:'Cu + 4HNO₃(conc) → Cu(NO₃)₂ + 2NO₂ + 2H₂O'},
 {id:'s_mno2',cat:'Solids',n:'Manganese(IV) oxide',f:'MnO₂(s)',st:'solid',comp:{'MnO2(s)':2},bot:[60,55,55],hz:['X'],solid:[45,40,40],metal:1,use:'Catalyst for the decomposition of H₂O₂ (oxygen preparation). Used in dry cells.',rx:'2H₂O₂ → 2H₂O + O₂ (MnO₂ unchanged)'},
 // ---- equilibrium, hardness, purification, melting point
 {id:'fe3dil',cat:'Equilibrium',n:'Iron(III) trioxonitrate(V), dilute',f:'Fe(NO₃)₃ in HNO₃',conc:'0.00200 mol dm⁻³',st:'sol',comp:{'Fe3+':.002,'NO3-':.506,Hn:.5},bot:[240,235,215],hz:['C'],use:'Source of Fe³⁺ for equilibrium measurements (acidified to stop hydrolysis).',rx:'Fe³⁺ + SCN⁻ ⇌ [Fe(SCN)]²⁺ (blood red)  ΔH < 0'},
 {id:'scndil',cat:'Equilibrium',n:'Potassium thiocyanate, dilute',f:'KSCN',conc:'0.00200 mol dm⁻³',st:'sol',comp:{'K+':.002,'SCN-':.002},bot:[240,245,245],hz:['X'],use:'Source of SCN⁻ for equilibrium measurements.',rx:'Fe³⁺ + SCN⁻ ⇌ [Fe(SCN)]²⁺'},
 {id:'soap',short:'soap solution',cat:'Water hardness',n:'Soap solution (standard)',f:'C₁₇H₃₅COONa',conc:'0.0200 mol dm⁻³',st:'sol',comp:{soap:.02,'Na+':.02},bot:[245,240,225],hz:['N'],use:'Measures water hardness: Ca²⁺/Mg²⁺ use up soap as scum before a lasting lather forms.',rx:'Ca²⁺ + 2C₁₇H₃₅COO⁻ → (C₁₇H₃₅COO)₂Ca (scum)'},
 {id:'w_rain',cat:'Water hardness',n:'Rain water',f:'H₂O (soft)',conc:'—',st:'sol',comp:{'Ca2+':.0001,Ct:.0002,Hn:.0003},bot:[225,240,250],hz:['N'],use:'Soft water collected from a zinc roof in Freetown.',rx:''},
 {id:'w_tap',cat:'Water hardness',n:'Tap water (Guma)',f:'H₂O',conc:'—',st:'sol',comp:{'Ca2+':.0008,SO4:.0003,Ct:.001,Hn:.0011},bot:[225,240,250],hz:['N'],use:'Treated water from Guma Valley reservoir.',rx:''},
 {id:'w_well',cat:'Water hardness',n:'Well water (Kissy)',f:'H₂O + Ca(HCO₃)₂',conc:'—',st:'sol',comp:{'Ca2+':.004,Ct:.0085,Hn:.0095},bot:[225,240,250],hz:['N'],use:'Hand-dug well water. Contains dissolved calcium hydrogentrioxocarbonate(IV).',rx:'Ca(HCO₃)₂ → CaCO₃ + H₂O + CO₂ (on boiling)'},
 {id:'w_bore',cat:'Water hardness',n:'Borehole water (Makeni)',f:'H₂O + CaSO₄',conc:'—',st:'sol',comp:{'Ca2+':.003,SO4:.003},bot:[225,240,250],hz:['N'],use:'Deep borehole water. Contains dissolved calcium tetraoxosulphate(VI).',rx:'CaSO₄ is not removed by boiling'},
 {id:'s_cuso4imp',cat:'Solids',n:'Impure copper(II) tetraoxosulphate(VI) (with sand)',f:'CuSO₄·5H₂O + SiO₂',st:'solid',comp:{'Cu2+':1.6,SO4:1.6,Hn:.03,sand:.6},bot:[110,140,190],hz:['X','E'],solid:[95,130,190],M:249.7,per:1.6,use:'Crude blue vitriol from a market, contaminated with sand.',rx:'Purify by dissolving, filtering, evaporating and crystallising.'},
 {id:'s_kno3',cat:'Solids',n:'Potassium trioxonitrate(V)',f:'KNO₃(s)',st:'solid',comp:{'K+':4.95,'NO3-':4.95},bot:[250,250,250],hz:['O'],solid:[252,252,252],enth:34.9,M:101,use:'Saltpetre. Dissolves endothermically (used in cold packs).',rx:'KNO₃(s) → K⁺(aq) + NO₃⁻(aq)  ΔH = +34.9 kJ mol⁻¹'},
 {id:'s_naph',cat:'Melting point samples',n:'Naphthalene',f:'C₁₀H₈(s)',st:'solid',comp:{},bot:[250,250,250],hz:['X','E'],solid:[252,252,250],mp:[80.0,80.6],use:'Mothballs. Pure naphthalene melts sharply at 80 °C.',rx:''},
 {id:'s_naphimp',cat:'Melting point samples',n:'Naphthalene (impure)',f:'C₁₀H₈ + impurity',st:'solid',comp:{},bot:[250,250,250],hz:['X','E'],solid:[245,245,236],mp:[73.5,77.8],use:'Naphthalene contaminated during storage.',rx:''},
 {id:'s_benz',cat:'Melting point samples',n:'Benzoic acid',f:'C₆H₅COOH(s)',st:'solid',comp:{},bot:[250,250,250],hz:['X'],solid:[252,252,252],mp:[121.8,122.6],use:'Food preservative (E210). Pure benzoic acid melts at 122 °C.',rx:''},
];
const CHEM = Object.fromEntries(CHEMS.map(c=>[c.id,c]));

/* ---------- glassware & tools ---------- */
const GLASS = [
  {id:'tube',n:'Test tube',cap:20,w:56,h:200,use:'Small-scale qualitative tests. Fill no more than one third if heating.'},
  {id:'btube',n:'Boiling tube',cap:40,w:66,h:210,use:'Larger tube for heating and gas preparations.'},
  {id:'beaker',n:'Beaker (250 cm³)',cap:250,w:130,h:150,use:'Holding and mixing liquids. Not accurate for measuring volumes.'},
  {id:'flask',n:'Conical flask (250 cm³)',cap:250,w:130,h:165,use:'Titrations: the sloping sides let you swirl without spilling.'},
  {id:'cup',n:'Polystyrene cup (calorimeter)',cap:200,w:110,h:140,use:'Insulated container for measuring heats of reaction.'},
  {id:'burette',n:'Burette (50 cm³) on stand',cap:50,w:150,h:470,use:'Delivers accurately measured volumes (to ±0.05 cm³). Read at eye level from the bottom of the meniscus.'},
  {id:'burner',n:'Bunsen burner',w:90,h:150,use:'Heat source. Use the blue (non-luminous) flame for heating. Click to light or turn off.'},
  {id:'bath',n:'Water bath (hot plate)',w:150,h:120,use:'Beaker of hot water kept at about 80 °C. Warm tubes containing flammable liquids (ethanol, hexane) here, never over a naked flame. Click to switch on/off.'},
  {id:'volflask',n:'Volumetric flask (250 cm³)',cap:251,w:110,h:210,use:'Makes up an accurate volume (250.0 cm³) when filled exactly to the graduation mark. Invert to mix.'},
  {id:'balance',n:'Electronic balance (0.01 g)',w:140,h:90,use:'Weigh solids. Drop a solid bottle on it to add solid; drag the balance onto a container to tip the weighed solid in.'},
  {id:'funnel',n:'Filter funnel + filter paper',w:90,h:90,use:'Drop it onto a beaker or flask, then pour a mixture into the funnel. The residue stays on the paper; the filtrate runs through.'},
  {id:'dish',n:'Evaporating dish',cap:60,w:120,h:60,use:'Evaporate a solution on a Bunsen burner to its crystallisation point, then cool it to get crystals.'},
  {id:'mpapp',n:'Melting-point apparatus',w:150,h:210,use:'Drop a solid onto it to load a capillary tube, then heat slowly and record the temperature range over which it melts.'},
  {id:'crosspaper',n:'White tile with cross (×)',w:150,h:40,use:'Place a flask on it for the disappearing-cross rate experiment.'},
];
const TOOLS = [
  {id:'blue',n:'Damp blue litmus paper',ic:'paper',col:[60,90,200],use:'Turns red with acidic gases/solutions.'},
  {id:'red',n:'Damp red litmus paper',ic:'paper',col:[210,50,50],use:'Turns blue with alkaline gases (NH₃)/solutions.'},
  {id:'dich',n:'Acidified K₂Cr₂O₇ paper',ic:'paper',col:[238,130,30],use:'Turns green with SO₂ (reducing gas).'},
  {id:'burn',n:'Burning splint',ic:'splint',use:'H₂ burns with a pop; O₂ makes it burn brighter; most gases put it out.'},
  {id:'glow',n:'Glowing splint',ic:'splint',use:'Relights (rekindles) in oxygen.'},
  {id:'rodHCl',n:'Glass rod dipped in conc. HCl',ic:'rod',use:'Dense white fumes (NH₄Cl) with ammonia.'},
  {id:'rodNH3',n:'Glass rod dipped in conc. NH₃',ic:'rod',use:'Dense white fumes (NH₄Cl) with hydrogen chloride.'},
  {id:'waft',n:'Waft to smell',ic:'hand',use:'Waft the vapour towards your nose with your hand. Never sniff directly.'},
  {id:'thermo',n:'Thermometer (0–110 °C)',ic:'thermo',use:'Drop onto a vessel to insert it and read the temperature.'},
  {id:'wire',n:'Nichrome wire (flame test)',ic:'wire',use:'Dip into a sample, then drag into a lit Bunsen flame to see the flame colour.'},
  {id:'uipaper',n:'Universal indicator paper',ic:'paper',col:[60,170,60],use:'Dip into a solution and compare the colour with the pH chart in the Inspector.'},
  {id:'colorimeter',n:'Colorimeter (450 nm)',ic:'clock',use:'Measures the absorbance of a coloured solution. A = ε × c × l (for [Fe(SCN)]²⁺, ε = 4700 dm³ mol⁻¹ cm⁻¹, l = 1 cm).'},
  {id:'stopwatch',n:'Stopwatch',ic:'clock',use:'Drop onto the bench to place a stopwatch for timing reactions.'},
];
