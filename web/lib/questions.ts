export type Question = {id:string;section:string;topic:string;family_id:string;syllabus_scope:string;question:string;options:Record<string,string>;correct_option:string;solution_steps:{step:number;text:string}[];pack_id?:string};
export type Pack = {format_version:1;pack_id:string;title:string;version:string;questions:Question[]};
const safeId=/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export function validatePack(value:unknown):Pack {
 const p=value as Pack;
 if(!p||p.format_version!==1||!safeId.test(p.pack_id)||["builtin","wassce-mathematics-core"].includes(p.pack_id))throw Error("Choose a unique pack ID using letters, numbers, dots, hyphens or underscores.");
 if(typeof p.title!=="string"||!p.title.trim()||p.title.length>120||typeof p.version!=="string"||!p.version.trim()||p.version.length>32)throw Error("A title and version are required.");
 if(!Array.isArray(p.questions)||p.questions.length<1||p.questions.length>1000)throw Error("Each pack must contain 1–1,000 questions.");
 const seen=new Set<string>();
 const nonempty=(x:unknown,max:number)=>typeof x==="string"&&!!x.trim()&&x.length<=max;
 for(const q of p.questions){
  if(!q||!safeId.test(q.id)||!safeId.test(q.family_id)||seen.has(q.id))throw Error("Question and family IDs must be valid; question IDs must be unique.");seen.add(q.id);
  if(!nonempty(q.question,8000)||!nonempty(q.section,160)||!nonempty(q.topic,160)||!["marked","unmarked"].includes(q.syllabus_scope))throw Error(`Check the text and syllabus fields in ${q.id}.`);
  if(!q.options||Object.keys(q.options).sort().join("")!=="ABCD"||Object.values(q.options).some(v=>!nonempty(v,2000))||new Set(Object.values(q.options).map(v=>v.trim())).size!==4||!Object.keys(q.options).includes(q.correct_option))throw Error(`Question ${q.id} needs four distinct options and a valid answer key.`);
  if(!Array.isArray(q.solution_steps)||q.solution_steps.length<1||q.solution_steps.length>20||q.solution_steps.some((s,i)=>!s||s.step!==i+1||!nonempty(s.text,4000)))throw Error(`Number the solution steps for ${q.id} consecutively from 1.`);
 }
 if(new TextEncoder().encode(JSON.stringify(p)).length>750000)throw Error("The pack is larger than the 750 KB publishing limit.");
 return p;
}
export function namespacePack(p:Pack):Question[]{return p.questions.map(q=>({...q,id:`${p.pack_id}/${q.id}`,family_id:`${p.pack_id}/${q.family_id}`,pack_id:p.pack_id}));}
export function selectQuestions(pool:Question[],limit:number,random=()=>Math.random()):Question[]{
 const values=[...pool];for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 const seen=new Set<string>();return values.filter(q=>{if(seen.has(q.family_id))return false;seen.add(q.family_id);return true;}).slice(0,limit);
}
