/* =========================================================
   Class connection (standalone build): join a class, save
   results to Supabase, see assignments. Works offline-first:
   results are queued on the device until a connection exists.
   ========================================================= */
"use strict";
const CL={sb:null,me:null,data:null,ready:false,queueKey:'wassce-queue',meKey:'wassce-student'};
const CLERR={class_not_found:'No class with that code. Check the code your teacher gave you.',bad_pin:'The PIN must be 4–6 digits.',bad_details:'Enter your full name and index number.',already_joined:'You have already joined this class. Use “I have joined before” to sign in.',class_full:'This class is full. Ask your teacher.',not_found:'Index number or PIN is incorrect.',wrong_pin:'Index number or PIN is incorrect.',locked:'Too many wrong PINs. Try again in 15 minutes, or ask your teacher to reset your PIN.',bad_token:'You were signed out (on another device or after a PIN reset). Please sign in again.',rate_limited:'Too many submissions in the last hour. Try later.'};
function clErr(e){const m=(e&&(e.message||e.msg))||String(e);for(const k in CLERR)if(m.includes(k))return CLERR[k];if(/fetch|network|Failed/i.test(m))return 'No internet connection. Your results are saved on this device and will be sent later.';return m;}
function clEnabled(){return !!(window.WASSCE_CLOUD&&!window.claude);}
/* Exact version + Subresource Integrity: the browser refuses the script if the CDN serves different bytes.
   Keep in step with teacher.html; check with scripts/validate_lab.py. */
const SUPABASE_JS={src:'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',integrity:'sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK'};
function clLoadLib(){return new Promise((res,rej)=>{if(window.supabase)return res();const s=document.createElement('script');s.src=SUPABASE_JS.src;s.integrity=SUPABASE_JS.integrity;s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=()=>res();s.onerror=()=>rej(new Error('network'));document.head.appendChild(s);});}
async function clInit(){
  if(!clEnabled())return;
  try{CL.me=JSON.parse(localStorage.getItem(CL.meKey)||'null');}catch(e){CL.me=null;}
  clButton();
  try{await clLoadLib();CL.sb=window.supabase.createClient(WASSCE_CLOUD.url,WASSCE_CLOUD.key,{auth:{persistSession:false}});CL.ready=true;}catch(e){clButton();return;}
  if(CL.me)await clRefresh();
  clFlush();window.addEventListener('online',()=>{clFlush();clRefresh();});
}
// Some failures (e.g. a wrong PIN) come back as {error} so the server can record them; treat them as errors.
async function clRpc(fn,args){const {data,error}=await CL.sb.rpc(fn,args);if(error)throw error;if(data&&typeof data==='object'&&typeof data.error==='string')throw new Error(data.error);return data;}
async function clRefresh(){
  if(!CL.ready||!CL.me)return;
  try{CL.data=await clRpc('student_me',{p_token:CL.me.token});CL.me={...CL.me,...CL.data.me};localStorage.setItem(CL.meKey,JSON.stringify(CL.me));}
  catch(e){if(/bad_token/.test(e.message||'')){CL.me=null;localStorage.removeItem(CL.meKey);}}
  clButton();
}
function clButton(){
  let b=$('#btnclass');if(!b){b=document.createElement('button');b.id='btnclass';b.className='btn sm';$('#btnhelp').before(b);b.onclick=clModal;}
  const q=clQueue().length;
  b.innerHTML=CL.me?`👤 ${esc(CL.me.name.split(' ')[0])} · ${esc(CL.me.class_name||CL.me.code)}${q?` <span title="Results waiting to be sent">⏳${q}</span>`:''}`:'👤 Join your class';
}
function clQueue(){try{return JSON.parse(localStorage.getItem(CL.queueKey)||'[]');}catch(e){return [];}}
function clSetQueue(q){try{localStorage.setItem(CL.queueKey,JSON.stringify(q));}catch(e){}clButton();}
async function clSubmit(rec){
  if(!CL.me)return;rec.token=CL.me.token;rec.at=new Date().toISOString();const q=clQueue();q.push(rec);clSetQueue(q);await clFlush();
}
async function clFlush(){
  if(!CL.ready||CL.flushing)return;CL.flushing=true;
  let q=clQueue();const keep=[];
  for(const r of q){try{await clRpc('submit_attempt',{p_token:r.token,p_kind:r.kind,p_mission:r.mission,p_title:r.title,p_score:r.score,p_max:r.max,p_grade:r.grade||null,p_detail:r.detail||{},p_at:r.at});}
    catch(e){const m=e.message||'';if(/bad_token|rate_limited|violates|invalid/.test(m))continue;keep.push(r);}}
  clSetQueue(keep);CL.flushing=false;if(q.length!==keep.length){mentor(`✓ ${q.length-keep.length} result(s) sent to your teacher.`);clRefresh();}
}

/* ---------- modal ---------- */
function clModal(){
  $('#clmodal')?.remove();const m=document.createElement('div');m.className='modal';m.id='clmodal';
  const me=CL.me;
  m.innerHTML=`<div class="box" style="max-width:620px"><div class="row" style="justify-content:space-between"><h2>${me?'My class':'Join your class'}</h2><button class="btn" data-x>Close</button></div><div id="clbody"></div></div>`;
  document.body.appendChild(m);$('[data-x]',m).onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)m.remove();});
  me?clMine():clJoinForm('join');
}
function clJoinForm(mode){
  const b=$('#clbody');const join=mode==='join';
  b.innerHTML=`<div class="tabs" style="margin:8px 0 12px"><button class="${join?'on':''}" data-m="join">New: join with class code</button><button class="${join?'':'on'}" data-m="login">I have joined before</button></div>
   ${!CL.ready?`<div class="note warn">Can't reach the class server right now. Check your internet connection and try again.</div>`:''}
   <div class="exgrid" style="grid-template-columns:1fr 1fr">
    <label>Class code<input id="clcode" class="mono" maxlength="8" placeholder="e.g. K7Q2MX" style="text-transform:uppercase"></label>
    <label>Index / admission number<input id="clidx" placeholder="e.g. 4250123045"></label>
    ${join?`<label style="grid-column:1/-1">Full name<input id="clname" placeholder="e.g. Fatmata Kamara"></label>`:''}
    <label>${join?'Choose a PIN (4–6 digits)':'PIN'}<input id="clpin" type="password" inputmode="numeric" maxlength="6" placeholder="••••"></label>
    <div id="clprev" class="sub" style="align-self:end"></div></div>
   <div class="note" id="clmsg"></div>
   <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn pri" id="clgo">${join?'Join class':'Sign in'}</button></div>
   <p class="sub" style="color:var(--muted)">Your results from missions and mock exams will be sent to your teacher. Remember your PIN; your teacher can reset it if you forget. Signing out signs you out on every device.</p>`;
  $$('[data-m]',b).forEach(x=>x.onclick=()=>clJoinForm(x.dataset.m));
  const code=$('#clcode');let t=null;code.oninput=()=>{clearTimeout(t);const v=code.value.trim();if(v.length<6||!CL.ready)return;t=setTimeout(async()=>{try{const r=await clRpc('class_lookup',{p_code:v});$('#clprev').textContent=r?`✓ ${r.name}${r.school?' · '+r.school:''}`:'No class with this code';}catch(e){}},300);};
  $('#clgo').onclick=async()=>{const msg=$('#clmsg');if(!CL.ready){msg.className='note warn';msg.textContent='No connection to the class server.';return;}
    const p={p_code:code.value.trim(),p_index:$('#clidx').value.trim(),p_pin:$('#clpin').value.trim()};
    try{const r=join?await clRpc('student_join',{...p,p_name:$('#clname').value.trim()}):await clRpc('student_login',p);
      CL.me=r;localStorage.setItem(CL.meKey,JSON.stringify(r));await clRefresh();clFlush();mentor(`Welcome, ${esc(r.name.split(' ')[0])}! You are in ${esc(r.class_name)}.`);clMine();}
    catch(e){msg.className='note bad';msg.textContent=clErr(e);}};
}
function clMine(){
  const h2=$('#clmodal h2');if(h2)h2.textContent='My class';
  const b=$('#clbody');const me=CL.me,d=CL.data||{assignments:[],attempts:[]};const q=clQueue();
  const done=id=>d.attempts.some(a=>a.mission_id===id);
  const title=id=>(SCENARIOS.find(s=>s.id===id)||{}).title||id;
  b.innerHTML=`<div class="look"><b>${esc(me.name)}</b> · ${esc(me.index_no||'')}<br>${esc(me.class_name||'')}${me.school?' · '+esc(me.school):''} · code <span class="mono">${esc(me.code)}</span></div>
   ${q.length?`<div class="note warn">${q.length} result(s) are waiting on this device and will be sent when you are online.</div>`:''}
   <h3 style="margin-top:14px">Assigned by your teacher</h3>${d.assignments.length?`<table class="obs"><tr><th>Mission</th><th>Due</th><th></th></tr>${d.assignments.map(a=>`<tr><td><b>${esc(a.title)}</b>${a.note?`<div class="sub">${esc(a.note)}</div>`:''}</td><td>${a.due?new Date(a.due).toLocaleDateString():'—'}</td><td>${done(a.mission_id)?'<span style="color:var(--good)">✓ done</span>':`<button class="btn sm pri" data-go="${esc(a.mission_id)}">Start</button>`}</td></tr>`).join('')}</table>`:'<div class="sub">No assignments yet.</div>'}
   <h3 style="margin-top:14px">My results</h3>${d.attempts.length?`<div class="obswrap" style="max-height:260px"><table class="obs"><tr><th>Date</th><th>Activity</th><th>Score</th></tr>${d.attempts.map(a=>`<tr><td>${new Date(a.at).toLocaleDateString()}</td><td>${esc(a.title||title(a.mission_id))}</td><td class="mono">${+a.score}/${+a.max}${a.grade?` · <b>${esc(a.grade)}</b>`:''}</td></tr>`).join('')}</table></div>`:'<div class="sub">Submit a mission report or a mock exam to see your results here.</div>'}
   <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn sm" id="clref">↻ Refresh</button><button class="btn sm" id="clout">Sign out (all devices)</button></div>`;
  $$('[data-go]',b).forEach(x=>x.onclick=()=>{$('#clmodal').remove();loadScenario(SCENARIOS.find(s=>s.id===x.dataset.go));});
  $('#clref').onclick=async()=>{await clRefresh();await clFlush();clMine();};
  $('#clout').onclick=async()=>{await clFlush();if(clQueue().length&&!confirmInline())return;const tok=CL.me&&CL.me.token;
    // Revoke the token on the server so a copy left on this device stops working. Best effort when offline.
    if(CL.ready&&tok){try{await clRpc('student_logout',{p_token:tok});}catch(e){}}
    CL.me=null;CL.data=null;localStorage.removeItem(CL.meKey);clSetQueue([]);clJoinForm('login');};
  function confirmInline(){const o=$('#clout');if(o.dataset.armed)return true;o.dataset.armed=1;o.textContent='Results not yet sent will be lost. Click again';return false;}
}

/* ---------- hooks: send results ---------- */
const _clEmit=emit;
emit=function(e){_clEmit(e);
  if(e.type==='submit'&&!L.exam&&L.scen&&CL.me){const s=L.scen;const now=Date.now();if(CL._last&&now-CL._last<4000)return;CL._last=now;
    const ob=s.objectives.filter(o=>o.done).length,qs=(s.questions||[]);
    clSubmit({kind:'mission',mission:s.id,title:s.title,score:L.scoreVal||0,max:100,grade:null,detail:{objectives:`${ob}/${s.objectives.length}`,questions:`${qs.filter(q=>q.correct).length}/${qs.length}`,penalties:L.penalties.length,missed:s.objectives.filter(o=>!o.done).map(o=>o.t).slice(0,10)}});}
};
const _clExamSubmit=EXAM.submit;
EXAM.submit=function(){const was=L.exam&&L.exam.submitted;_clExamSubmit.call(EXAM);const E=L.exam;if(was||!E||!E.result)return;if(!CL.me){if(clEnabled())mentor('Join your class (top bar) to send mock results to your teacher.');return;}const R=E.result;
  const lost=[...R.items1,...R.items2,...R.items3].filter(x=>x.got<x.max).map(x=>x.label.slice(0,80));
  clSubmit({kind:'exam',mission:'exam',title:'Mock Paper 3 (Practical)',score:R.total,max:50,grade:R.grade,detail:{q1:R.q1,q2:R.q2,q3:R.q3,pen:R.pen,q1kind:E.V.kind,salt:E.salt.id,q3kind:E.act.kind,lost:lost.slice(0,40)}});};
const _clOpenScen=openScenarios;
openScenarios=function(){_clOpenScen();if(!CL.me||!CL.data||!CL.data.assignments.length)return;const box=$('#scenlist');const done=id=>CL.data.attempts.some(a=>a.mission_id===id);
  const h=document.createElement('div');h.style.gridColumn='1/-1';h.innerHTML=`<div class="note info"><b>Assigned by your teacher:</b> ${CL.data.assignments.map(a=>`${esc(a.title)}${a.due?` (due ${new Date(a.due).toLocaleDateString()})`:''} ${done(a.mission_id)?'✓':'○'}`).join(' · ')}</div>`;box.prepend(h);};

window.addEventListener('load',()=>setTimeout(clInit,50));
