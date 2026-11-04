import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const catalog=ts.transpileModule(fs.readFileSync('lib/catalog.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const catalogUrl='data:text/javascript;base64,'+Buffer.from(catalog).toString('base64');
const source=fs.readFileSync('lib/questions.ts','utf8').replace('from "./catalog"','from '+JSON.stringify(catalogUrl));const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {validatePack,namespacePack,selectQuestions}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const core=JSON.parse(fs.readFileSync('lib/core.json','utf8')).questions;
assert.equal(core.length,1000);assert.equal(new Set(core.map(q=>q.id)).size,1000);
const valid=()=>({format_version:1,pack_id:'teacher-maths',title:'Teacher maths pack',version:'1.0',questions:structuredClone(core.slice(0,2))});
assert.equal(validatePack(valid()).questions.length,2);
for(const mutate of [p=>p.pack_id='../bad',p=>p.pack_id='builtin',p=>p.pack_id='wassce-mathematics-core',p=>p.format_version=2,p=>p.questions=[],p=>p.questions.push(p.questions[0]),p=>p.questions[0].correct_option='E',p=>p.questions[0].options.A=p.questions[0].options.B,p=>delete p.questions[0].options.D,p=>p.questions[0].solution_steps[0].step=3,p=>p.questions[0].solution_steps=[],p=>p.questions[0].question='']){const p=valid();mutate(p);assert.throws(()=>validatePack(p));}
const namespaced=namespacePack(valid());assert(namespaced.every(q=>q.id.startsWith('teacher-maths/')));assert.equal(new Set([...core,...namespaced].map(q=>q.id)).size,1002);
const mock=selectQuestions(core,50,()=>.43);assert.equal(mock.length,50);assert.equal(new Set(mock.map(q=>q.family_id)).size,50);
assert.equal(selectQuestions(core.slice(0,8),20).length,1);assert.equal(selectQuestions([],20).length,0);
console.log('PASS: content integrity, pack validation, ID isolation, unique-family exam selection (19 checks).');

const v2={...valid(),format_version:2,subject_id:'biology',countries:['LR','GM'],exam_year:2027,exam_series:'school'};
const bio=namespacePack(validatePack(v2));assert(bio.every(q=>q.subject_id==='biology'&&q.countries.join(',')==='LR,GM'&&q.exam_year===2027));
assert.throws(()=>selectQuestions([...core.slice(0,1),...bio],10));
assert.throws(()=>validatePack({...v2,countries:['XX']}));assert.throws(()=>validatePack({...v2,countries:[]}));assert.throws(()=>validatePack({...v2,subject_id:'not-a-subject'}));assert.throws(()=>validatePack({...v2,exam_series:'other'}));assert.throws(()=>validatePack({...v2,exam_year:1990}));
assert(namespacePack(valid()).every(q=>q.subject_id==='mathematics'));
const {SUBJECTS,COUNTRIES,countryApplies,subjectStatus}=await import(catalogUrl);assert.equal(COUNTRIES.length,3);assert.equal(SUBJECTS.length,38);assert.equal(new Set(SUBJECTS.map(s=>s.id)).size,38);assert(SUBJECTS.every(s=>s.topics.length>0));assert(!countryApplies(['SL'],'LR'));assert(countryApplies(undefined,'LR'));assert(!subjectStatus(SUBJECTS[1],'LR',2026,'school').startsWith('Listed'));
console.log('PASS: multi-subject packs, country filtering, legacy mathematics defaults, catalog integrity and mixed-subject exam rejection.');
