"use strict";
const T={sb:null,user:null,teacher:null,classes:[],cur:null,students:[],attempts:[],assigns:[],tab:'overview'};
const GR=['A1','B2','B3','C4','C5','C6','D7','E8','F9'];
const MISSIONS=SCENARIOS.filter(s=>s.id!=='free').map(s=>({id:s.id,title:s.title}));
const mTitle=id=>(MISSIONS.find(m=>m.id===id)||{}).title||id;
const fmtD=d=>d?new Date(d).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—';
const ago=d=>{if(!d)return '—';const s=(Date.now()-new Date(d))/1000;if(s<3600)return Math.max(1,Math.round(s/60))+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';return Math.round(s/86400)+' days ago';};
function note(el,cls,t){el.className='note '+cls;el.textContent=t;}

async function boot(){
  T.sb=window.supabase.createClient(WASSCE_CLOUD.url,WASSCE_CLOUD.key);
  const {data:{session}}=await T.sb.auth.getSession();
  T.sb.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_OUT'){T.user=null;authView();}});
  if(session){T.user=session.user;await afterLogin();}else authView();
  $('#tout').onclick=async()=>{await T.sb.auth.signOut();location.reload();};
}
function authView(mode='in'){
  $('#tout').hidden=true;
  $('#app').innerHTML=`<div class="panel auth" style="padding:20px"><h2 style="margin-top:0">${mode==='in'?'Teacher sign in':'Create a teacher account'}</h2>
   <p class="sub" style="color:var(--muted)">Create classes, give students a class code, assign missions and follow their mock exam results.</p>
   ${mode==='up'?`<label>Your name<input id="an" placeholder="e.g. Mr Mohamed Bangura"></label><label>School<input id="as" placeholder="e.g. Prince of Wales School"></label>`:''}
   <label>Email<input id="ae" type="email" autocomplete="email"></label><label>Password<input id="ap" type="password" autocomplete="${mode==='in'?'current-password':'new-password'}" placeholder="${mode==='up'?'at least 8 characters':''}"></label>
   <div class="note" id="amsg"></div><div class="row" style="justify-content:space-between;margin-top:8px"><button class="btn" id="aswap">${mode==='in'?'New teacher? Create an account':'I already have an account'}</button><button class="btn pri" id="ago">${mode==='in'?'Sign in':'Create account'}</button></div>
   ${mode==='in'?'<p style="margin-top:12px"><a href="#" id="aforgot" class="sub">Forgot password?</a></p>':''}</div>`;
  $('#aswap').onclick=()=>authView(mode==='in'?'up':'in');
  $('#aforgot')?.addEventListener('click',async e=>{e.preventDefault();const em=$('#ae').value.trim();if(!em)return note($('#amsg'),'warn','Type your email above first.');const {error}=await T.sb.auth.resetPasswordForEmail(em,{redirectTo:location.href.split('#')[0]});note($('#amsg'),error?'bad':'good',error?error.message:'Check your email for a reset link.');});
  $('#ago').onclick=async()=>{const em=$('#ae').value.trim(),pw=$('#ap').value;const msg=$('#amsg');
    if(mode==='up'){const name=$('#an').value.trim(),school=$('#as').value.trim();if(!name||pw.length<8)return note(msg,'warn','Enter your name and a password of at least 8 characters.');
      const {data,error}=await T.sb.auth.signUp({email:em,password:pw,options:{data:{name,school},emailRedirectTo:location.href.split('#')[0]}});
      if(error)return note(msg,'bad',error.message);if(!data.session)return note(msg,'good','Account created. Check your email and click the confirmation link, then sign in.');T.user=data.user;afterLogin();}
    else{const {data,error}=await T.sb.auth.signInWithPassword({email:em,password:pw});if(error)return note(msg,'bad',error.message==='Invalid login credentials'?'Wrong email or password (or the email is not confirmed yet).':error.message);T.user=data.user;afterLogin();}};
}
async function afterLogin(){
  $('#tout').hidden=false;
  let {data:t}=await T.sb.from('teachers').select('*').eq('id',T.user.id).maybeSingle();
  if(!t){const md=T.user.user_metadata||{};const ins={id:T.user.id,name:md.name||T.user.email.split('@')[0],school:md.school||null};await T.sb.from('teachers').insert(ins);t=ins;}
  T.teacher=t;await loadClasses();
  if(T.classes.length)await openClass(T.classes.find(c=>c.id===localStorage.getItem('wassce-tclass'))||T.classes[0]);else render();
  clearInterval(T._iv);T._iv=setInterval(()=>{if(T.cur&&document.visibilityState==='visible')loadClassData().then(renderMain);},60000);
}
async function loadClasses(){const {data}=await T.sb.from('classes').select('*').order('created_at');T.classes=data||[];}
async function openClass(c){T.cur=c;try{localStorage.setItem('wassce-tclass',c.id);}catch(e){}await loadClassData();render();}
async function loadClassData(){
  const id=T.cur.id;
  const [s,a,g]=await Promise.all([T.sb.from('students').select('id,name,index_no,created_at,last_seen,fails,locked_until').eq('class_id',id).order('name'),
    T.sb.from('attempts').select('*').eq('class_id',id).order('created_at',{ascending:false}).limit(3000),
    T.sb.from('assignments').select('*').eq('class_id',id).order('created_at',{ascending:false})]);
  T.students=s.data||[];T.attempts=a.data||[];T.assigns=g.data||[];
}
function render(){
  $('#app').innerHTML=`<div class="tgrid"><aside><div class="sub" style="margin-bottom:6px">Signed in as <b>${esc(T.teacher.name)}</b>${T.teacher.school?' · '+esc(T.teacher.school):''}</div>
   <div id="clist">${T.classes.map(c=>`<button class="cls ${T.cur&&T.cur.id===c.id?'on':''}" data-c="${c.id}"><b>${esc(c.name)}</b><span>Code ${esc(c.code)}${c.archived?' · archived':''}</span></button>`).join('')}</div>
   <div class="panel" style="padding:12px"><h3 style="margin:0 0 6px">New class</h3><input id="ncn" class="search" style="margin:0 0 6px;width:100%" placeholder="e.g. SS3 Science A"><input id="ncs" class="search" style="margin:0 0 6px;width:100%" placeholder="School" value="${esc(T.teacher.school||'')}"><button class="btn pri sm" id="ncgo">Create class</button><div class="note" id="ncmsg"></div></div></aside>
   <section id="main"></section></div>`;
  $$('[data-c]').forEach(b=>b.onclick=()=>openClass(T.classes.find(c=>c.id===b.dataset.c)));
  $('#ncgo').onclick=async()=>{const name=$('#ncn').value.trim();if(!name)return note($('#ncmsg'),'warn','Give the class a name.');const {data,error}=await T.sb.from('classes').insert({name,school:$('#ncs').value.trim()||null}).select().single();if(error)return note($('#ncmsg'),'bad',error.message);T.classes.push(data);openClass(data);};
  renderMain();
}
function latestExamByStudent(){const m={};for(const a of T.attempts){if(a.kind!=='exam')continue;if(!m[a.student_id])m[a.student_id]=a;}return m;}
function renderMain(){
  const box=$('#main');if(!box)return;
  if(!T.cur){box.innerHTML=`<div class="panel" style="padding:20px"><h2 style="margin-top:0">Welcome!</h2><p>Create your first class on the left. You'll get a 6-character <b>class code</b>. Students open the lab, tap <b>“Join your class”</b>, and enter the code, their index number and a PIN. Their mission reports and mock exam results then appear here.</p></div>`;return;}
  const c=T.cur;const site=location.href.replace(/teacher\.html.*$/,'');
  const tabs=[['overview','Overview'],['students',`Students (${T.students.length})`],['results',`Results (${T.attempts.length})`],['assign',`Assignments (${T.assigns.length})`]];
  box.innerHTML=`<div class="panel" style="padding:16px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0">${esc(c.name)}</h2><div class="sub">${esc(c.school||'')}</div></div>
     <div style="text-align:right"><div class="sub">Class code</div><div class="codebig">${esc(c.code)}</div></div></div>
    <div class="note info">Tell students: open <b>${esc(site)}</b> → tap <b>Join your class</b> → enter code <b class="mono">${esc(c.code)}</b>, their index number and a 4-digit PIN. <button class="btn sm" id="cpy">Copy instructions</button></div>
    <div class="tabs" style="margin:12px -16px 0">${tabs.map(([k,l])=>`<button data-t="${k}" class="${T.tab===k?'on':''}">${l}</button>`).join('')}</div><div id="tbody" style="padding-top:14px"></div>
    <div class="row" style="justify-content:space-between;margin-top:14px;border-top:1px solid var(--line);padding-top:10px"><div class="row"><button class="btn sm" id="ref">↻ Refresh</button><button class="btn sm" id="csv">Export results (CSV)</button></div><div class="row"><button class="btn sm" id="arch">${c.archived?'Re-open class':'Archive class (stop new joins)'}</button><button class="btn sm" id="del" style="color:var(--bad)">Delete class</button></div></div></div>`;
  $$('[data-t]',box).forEach(b=>b.onclick=()=>{T.tab=b.dataset.t;renderMain();});
  $('#cpy').onclick=async()=>{const t=`Chemistry virtual lab: open ${site} and tap "Join your class". Class code: ${c.code}. Enter your index number and choose a 4-digit PIN (remember it!).`;try{await navigator.clipboard.writeText(t);$('#cpy').textContent='Copied ✓';}catch(e){prompt('Copy this:',t);}};
  $('#ref').onclick=async()=>{await loadClassData();renderMain();};
  $('#csv').onclick=exportCSV;
  $('#arch').onclick=async()=>{const {data}=await T.sb.from('classes').update({archived:!c.archived}).eq('id',c.id).select().single();if(data){Object.assign(c,data);render();}};
  $('#del').onclick=async e=>{const b=e.currentTarget;if(!b.dataset.armed){b.dataset.armed=1;b.textContent='Deletes all students and results. Click again';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Delete class';}},4000);return;}
    await T.sb.from('classes').delete().eq('id',c.id);T.classes=T.classes.filter(x=>x.id!==c.id);T.cur=null;if(T.classes.length)openClass(T.classes[0]);else render();};
  ({overview:tabOverview,students:tabStudents,results:tabResults,assign:tabAssign})[T.tab]();
}
function tabOverview(){
  const b=$('#tbody');const lx=latestExamByStudent();const exams=Object.values(lx);const week=Date.now()-7*864e5;
  const active=T.students.filter(s=>new Date(s.last_seen)>week).length;const avg=exams.length?exams.reduce((t,a)=>t+a.score/a.max_score,0)/exams.length*100:null;
  const dist=GR.map(g=>exams.filter(a=>a.grade===g).length);const mx=Math.max(1,...dist);
  const credit=exams.filter(a=>GR.indexOf(a.grade)<=5).length;
  const miss={};for(const a of T.attempts){if(a.kind!=='exam')continue;for(const l of (a.detail&&a.detail.lost)||[]){const k=l.replace(/\(b\)\((i|ii|iii|iv)\)/,'(b) calculation').replace(/^\(([a-f])\) /,'');miss[k]=(miss[k]||0)+1;}}
  const top=Object.entries(miss).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const ms={};for(const a of T.attempts){if(a.kind!=='mission')continue;const m=ms[a.mission_id]=ms[a.mission_id]||{st:new Set(),sum:0,n:0};m.st.add(a.student_id);m.sum+=a.score/a.max_score*100;m.n++;}
  b.innerHTML=`<div class="kpis"><div class="kpi"><b>${T.students.length}</b><span>students joined</span></div><div class="kpi"><b>${active}</b><span>active in the last 7 days</span></div><div class="kpi"><b>${T.attempts.filter(a=>a.kind==='exam').length}</b><span>mock papers sat</span></div><div class="kpi"><b>${avg==null?'—':avg.toFixed(0)+'%'}</b><span>average latest mock score</span></div><div class="kpi"><b>${exams.length?Math.round(credit/exams.length*100)+'%':'—'}</b><span>at credit level (A1–C6)</span></div></div>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
    <div><h3>Grades (latest mock per student)</h3>${exams.length?`<div class="bars">${dist.map(n=>`<div style="height:${n/mx*100}%;background:${'#0e6d64'}"><span>${n||''}</span></div>`).join('')}</div><div class="blab">${GR.map(g=>`<span>${g}</span>`).join('')}</div>`:'<div class="sub">No mock exams submitted yet.</div>'}</div>
    <div><h3>Most-missed marking points</h3>${top.length?`<table class="obs">${top.map(([k,n])=>`<tr><td>${esc(k)}</td><td class="mono" style="text-align:right">${n}×</td></tr>`).join('')}</table><div class="sub" style="margin-top:4px">Use these to plan revision lessons.</div>`:'<div class="sub">Appears once students submit mock exams.</div>'}</div></div>
   <h3 style="margin-top:16px">Missions</h3>${Object.keys(ms).length?`<table class="obs"><tr><th>Mission</th><th>Students</th><th>Average score</th></tr>${Object.entries(ms).sort((a,b)=>b[1].st.size-a[1].st.size).map(([id,m])=>`<tr><td>${esc(mTitle(id))}</td><td>${m.st.size} / ${T.students.length}</td><td>${(m.sum/m.n).toFixed(0)}%</td></tr>`).join('')}</table>`:'<div class="sub">No mission reports yet.</div>'}`;
}
function tabStudents(){
  const b=$('#tbody');const lx=latestExamByStudent();
  const rows=T.students.map(s=>{const at=T.attempts.filter(a=>a.student_id===s.id);const ex=at.filter(a=>a.kind==='exam');const best=ex.reduce((m,a)=>!m||a.score>m.score?a:m,null);const mis=new Set(at.filter(a=>a.kind==='mission').map(a=>a.mission_id)).size;const l=lx[s.id];
    return `<tr class="clickrow" data-s="${s.id}"><td><b>${esc(s.name)}</b><div class="sub">${esc(s.index_no)}</div></td><td>${ago(s.last_seen)}</td><td>${mis}</td><td>${ex.length}</td><td>${l?`${+l.score}/50 <b>${esc(l.grade||'')}</b>`:'—'}</td><td>${best?`${+best.score}/50 <b>${esc(best.grade||'')}</b>`:'—'}</td>
     <td onclick="event.stopPropagation()"><button class="btn sm" data-pin="${s.id}">Reset PIN</button> <button class="btn sm" data-rm="${s.id}">Remove</button>${s.locked_until&&new Date(s.locked_until)>new Date()?' <span class="pill">locked</span>':''}</td></tr>`;}).join('');
  b.innerHTML=T.students.length?`<div style="overflow:auto"><table class="obs"><tr><th>Student</th><th>Last active</th><th>Missions done</th><th>Mocks sat</th><th>Latest mock</th><th>Best mock</th><th></th></tr>${rows}</table></div><div class="note" id="smsg"></div>`:'<div class="sub">No students yet. Share the class code above.</div>';
  $$('[data-s]',b).forEach(r=>r.onclick=()=>studentModal(T.students.find(s=>s.id===r.dataset.s)));
  $$('[data-pin]',b).forEach(x=>x.onclick=async()=>{const p=String(Math.floor(1000+Math.random()*9000));const {error}=await T.sb.rpc('teacher_reset_pin',{p_student:x.dataset.pin,p_pin:p});const s=T.students.find(s=>s.id===x.dataset.pin);note($('#smsg'),error?'bad':'good',error?error.message:`New PIN for ${s.name}: ${p}. Give it to the student privately. They have been signed out on every device and must sign in again with the new PIN.`);});
  $$('[data-rm]',b).forEach(x=>x.onclick=async()=>{if(!x.dataset.armed){x.dataset.armed=1;x.textContent='Click to confirm';return;}await T.sb.from('students').delete().eq('id',x.dataset.rm);await loadClassData();renderMain();});
}
function attemptRow(a,showName=true){const s=T.students.find(s=>s.id===a.student_id);return `<tr class="clickrow" data-a="${a.id}"><td>${fmtD(a.created_at)}</td>${showName?`<td>${esc(s?s.name:'(removed)')}</td>`:''}<td>${a.kind==='exam'?'📝 ':''}${esc(a.title||mTitle(a.mission_id))}</td><td class="mono">${+a.score}/${+a.max_score}</td><td><b>${esc(a.grade||'')}</b></td></tr>`;}
function tabResults(){
  const b=$('#tbody');const f=T.rf||'all';
  const list=T.attempts.filter(a=>f==='all'||(f==='exam'&&a.kind==='exam')||(f==='mission'&&a.kind==='mission')||a.mission_id===f);
  b.innerHTML=`<div class="row" style="margin-bottom:8px"><select id="rf" class="btn sm"><option value="all">All results</option><option value="exam">Mock exams only</option><option value="mission">Missions only</option>${MISSIONS.filter(m=>m.id!=='exam').map(m=>`<option value="${m.id}" ${f===m.id?'selected':''}>${esc(m.title)}</option>`).join('')}</select></div>
   ${list.length?`<div class="obswrap" style="max-height:520px"><table class="obs"><tr><th>Date</th><th>Student</th><th>Activity</th><th>Score</th><th>Grade</th></tr>${list.map(a=>attemptRow(a)).join('')}</table></div>`:'<div class="sub">No results yet.</div>'}`;
  $('#rf').value=f;$('#rf').onchange=e=>{T.rf=e.target.value;tabResults();};
  $$('[data-a]',b).forEach(r=>r.onclick=()=>attemptModal(T.attempts.find(a=>String(a.id)===r.dataset.a)));
}
function tabAssign(){
  const b=$('#tbody');
  b.innerHTML=`<div class="panel" style="padding:12px;margin-bottom:12px"><h3 style="margin:0 0 8px">Assign a mission</h3><div class="exgrid"><label>Mission<select id="am" class="search" style="margin:0">${MISSIONS.map(m=>`<option value="${m.id}">${esc(m.title)}</option>`).join('')}</select></label><label>Due date<input id="ad" type="date"></label><label style="grid-column:1/-1">Note to students (optional)<input id="an2" placeholder="e.g. Complete before Thursday's practical"></label></div><button class="btn pri sm" id="ago2">Assign</button><div class="note" id="amsg2"></div></div>
   ${T.assigns.length?`<table class="obs"><tr><th>Mission</th><th>Due</th><th>Completed</th><th></th></tr>${T.assigns.map(a=>{const done=new Set(T.attempts.filter(t=>t.mission_id===a.mission_id&&new Date(t.created_at)>=new Date(a.created_at)).map(t=>t.student_id)).size;return `<tr><td><b>${esc(a.title)}</b>${a.note?`<div class="sub">${esc(a.note)}</div>`:''}</td><td>${fmtD(a.due)}</td><td>${done} / ${T.students.length}</td><td><button class="btn sm" data-del="${a.id}">Remove</button></td></tr>`;}).join('')}</table>`:'<div class="sub">Nothing assigned yet. Students see assignments when they open the lab.</div>'}`;
  $('#ago2').onclick=async()=>{const mid=$('#am').value;const {error}=await T.sb.from('assignments').insert({class_id:T.cur.id,mission_id:mid,title:mTitle(mid),due:$('#ad').value||null,note:$('#an2').value.trim()||null});if(error)return note($('#amsg2'),'bad',error.message);await loadClassData();renderMain();};
  $$('[data-del]',b).forEach(x=>x.onclick=async()=>{await T.sb.from('assignments').delete().eq('id',x.dataset.del);await loadClassData();renderMain();});
}
function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="box" style="max-width:760px">${html}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-x>Close</button></div></div>`;document.body.appendChild(m);$('[data-x]',m).onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove();};return m;}
function studentModal(s){const at=T.attempts.filter(a=>a.student_id===s.id);
  const m=modal(`<h2 style="margin:0">${esc(s.name)}</h2><div class="sub">Index ${esc(s.index_no)} · joined ${fmtD(s.created_at)} · last active ${ago(s.last_seen)}</div>
   ${at.length?`<table class="obs" style="margin-top:10px"><tr><th>Date</th><th>Activity</th><th>Score</th><th>Grade</th></tr>${at.map(a=>attemptRow(a,false)).join('')}</table>`:'<p class="sub">No results yet.</p>'}`);
  $$('[data-a]',m).forEach(r=>r.onclick=()=>attemptModal(at.find(a=>String(a.id)===r.dataset.a)));}
function attemptModal(a){const s=T.students.find(s=>s.id===a.student_id);const d=a.detail||{};
  const KIND={hcl_na2co3:'HCl vs Na₂CO₃',h2so4_naoh:'H₂SO₄ vs NaOH',ch3cooh_naoh:'CH₃COOH vs NaOH',kmno4_fe:'KMnO₄ vs Fe²⁺',mp:'melting point',ph:'pH colorimetry',heatsol:'heat of solution',equil:'equilibrium'};
  const body=a.kind==='exam'?`<div class="kpis"><div class="kpi"><b>${d.q1??'—'}/20</b><span>Q1 ${esc(KIND[d.q1kind]||'')}</span></div><div class="kpi"><b>${d.q2??'—'}/18</b><span>Q2 salt ${esc((d.salt||'').toUpperCase())}</span></div><div class="kpi"><b>${d.q3??'—'}/12</b><span>Q3 ${esc(KIND[d.q3kind]||'')}</span></div><div class="kpi"><b>${esc(a.grade||'')}</b><span>${+a.score}/50${d.pen?` (−${d.pen} safety)`:''}</span></div></div>${(d.lost||[]).length?`<h3>Marks lost on</h3><ul>${d.lost.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:''}`
   :`<div class="kpis"><div class="kpi"><b>${+a.score}/100</b><span>score</span></div><div class="kpi"><b>${esc(d.objectives||'—')}</b><span>objectives done</span></div><div class="kpi"><b>${esc(d.questions||'—')}</b><span>questions correct</span></div><div class="kpi"><b>${d.penalties||0}</b><span>safety warnings</span></div></div>${(d.missed||[]).length?`<h3>Objectives not completed</h3><ul>${d.missed.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:''}`;
  modal(`<h2 style="margin:0">${esc(a.title||mTitle(a.mission_id))}</h2><div class="sub">${esc(s?s.name:'')} · ${new Date(a.created_at).toLocaleString()}</div>${body}`);}
function exportCSV(){
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const rows=[['Date','Student','Index','Type','Activity','Score','Max','Grade','Q1','Q2','Q3'].map(q).join(',')];
  for(const a of T.attempts){const s=T.students.find(s=>s.id===a.student_id)||{};const d=a.detail||{};rows.push([new Date(a.created_at).toISOString().slice(0,16).replace('T',' '),s.name,s.index_no,a.kind,a.title||mTitle(a.mission_id),+a.score,+a.max_score,a.grade||'',d.q1??'',d.q2??'',d.q3??''].map(q).join(','));}
  const blob=new Blob(['﻿'+rows.join('\r\n')],{type:'text/csv'});const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download=`${T.cur.name.replace(/\W+/g,'_')}_results.csv`;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
boot();
