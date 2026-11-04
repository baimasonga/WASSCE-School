import { env } from "cloudflare:workers";
import { and,eq,desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { attempts,bookmarks,packs,settings } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import {namespacePack,validatePack,type Pack} from "../../../lib/questions";
import {corePack,coreQuestions} from "../../../lib/bank";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function adminId(){return (await getDb().select().from(settings).where(eq(settings.key,"admin_id")).limit(1))[0]?.value;}
async function library(){const rows=await getDb().select().from(packs).where(eq(packs.status,"published"));return {rows,questions:[...coreQuestions,...rows.flatMap(r=>namespacePack(JSON.parse(r.content) as Pack))]};}
export async function GET(request:Request){
 try{
  const action=new URL(request.url).searchParams.get("action")||"library";
  const user=await getChatGPTUser();
  if(action==="library"){
   const {rows,questions}=await library();
   return json({questions,packs:[{id:corePack.pack_id,title:corePack.title,version:corePack.version,count:coreQuestions.length,status:"published"},...rows.map(r=>({id:r.id,title:r.title,version:r.version,count:JSON.parse(r.content).questions.length,status:r.status}))]});
  }
  if(action==="download"){
   const id=new URL(request.url).searchParams.get("id");
   const p=id===corePack.pack_id?corePack:(await getDb().select().from(packs).where(and(eq(packs.id,id||""),eq(packs.status,"published"))).limit(1))[0];
   if(!p)return json({error:"Pack not found."},404);
   const raw="content" in p?p.content:JSON.stringify(p);
   return new Response(raw,{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${id}.json"`,"Cache-Control":"no-store"}});
  }
  if(action==="me")return json({user:user?{name:user.displayName,email:user.email}:null,admin:!!user&&user.userId===await adminId(),canSetup:!!user&&env.SCHOOL_PRIVATE_ADMIN==="1"&&!await adminId()});
  if(!user)return json({error:"Sign in to save and manage your learning."},401);
  if(action==="progress")return json({attempts:await getDb().select().from(attempts).where(eq(attempts.userId,user.userId)).orderBy(desc(attempts.createdAt)).limit(5000),bookmarks:(await getDb().select().from(bookmarks).where(eq(bookmarks.userId,user.userId))).map(b=>b.questionId)});
  if(action==="publishing"){
   if(user.userId!==await adminId())return json({error:"Publishing access is required."},403);
   return json({packs:(await getDb().select().from(packs).orderBy(desc(packs.updatedAt))).map(r=>({...r,count:JSON.parse(r.content).questions.length,content:undefined}))});
  }
  return json({error:"Not found."},404);
 }catch(error){console.error(error);return json({error:"The learning service is temporarily unavailable. Please try again."},500);}
}
export async function POST(request:Request){
 try{
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Invalid request origin."},403);
  const user=await getChatGPTUser();if(!user)return json({error:"Sign in to save and manage your learning."},401);
  const reader=request.body?.getReader();let raw="";let bytes=0;const decoder=new TextDecoder();
  if(reader){while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>800000){await reader.cancel();return json({error:"File too large. Maximum publishing size is 750 KB."},413);}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}
  const body=JSON.parse(raw),db=getDb();
  if(body.action==="setup"){
   if(env.SCHOOL_PRIVATE_ADMIN!=="1")return json({error:"Publishing setup is not available."},403);
   await db.insert(settings).values({key:"admin_id",value:user.userId}).onConflictDoNothing();
   return user.userId===await adminId()?json({ok:true}):json({error:"Publishing has already been assigned."},403);
  }
  if(body.action==="bookmark"){
   const {questions}=await library();if(!questions.some(q=>q.id===body.questionId))return json({error:"Question not found."},404);
   if(body.saved)await db.insert(bookmarks).values({userId:user.userId,questionId:body.questionId}).onConflictDoNothing();
   else await db.delete(bookmarks).where(and(eq(bookmarks.userId,user.userId),eq(bookmarks.questionId,body.questionId)));
   return json({ok:true});
  }
  if(body.action==="attempt"){
   if(typeof body.token!=="string"||!/^[a-f0-9-]{36}$/i.test(body.token)||!Array.isArray(body.answers)||body.answers.length<1||body.answers.length>50)return json({error:"Invalid practice session."},400);
   const {questions}=await library(),map=new Map(questions.map(q=>[q.id,q]));
   const unique=new Set<string>();
   const records=body.answers.map((a:{questionId:string;answer:string})=>{
    const q=map.get(a.questionId);if(!q||unique.has(a.questionId)||!(["A","B","C","D",""] as unknown[]).includes(a.answer))throw Error("Invalid answer submission.");unique.add(a.questionId);
    return {userId:user.userId,key:`${body.token}/${q.id}`,questionId:q.id,answer:a.answer,correct:a.answer===q.correct_option?1:0,section:q.section,createdAt:Date.now()};
   });
   await db.insert(attempts).values(records).onConflictDoNothing();return json({ok:true,correct:records.filter((r:{correct:number})=>r.correct).length});
  }
  if(user.userId!==await adminId())return json({error:"Publishing access is required."},403);
  if(body.action==="upload"){
   const pack=validatePack(body.pack);
   await db.insert(packs).values({id:pack.pack_id,title:pack.title,version:pack.version,content:JSON.stringify(pack),status:"draft",updatedAt:Date.now()}).onConflictDoUpdate({target:packs.id,set:{title:pack.title,version:pack.version,content:JSON.stringify(pack),status:"draft",updatedAt:Date.now()}});
   return json({ok:true});
  }
  if(body.action==="publish"||body.action==="unpublish"){
   const row=(await db.select().from(packs).where(eq(packs.id,String(body.id))).limit(1))[0];if(!row)return json({error:"Pack not found."},404);
   validatePack(JSON.parse(row.content));
   await db.update(packs).set({status:body.action==="publish"?"published":"draft",updatedAt:Date.now()}).where(eq(packs.id,row.id));return json({ok:true});
  }
  return json({error:"Unknown action."},400);
 }catch(error){return json({error:error instanceof Error?error.message:"Could not save your changes."},400);}
}
