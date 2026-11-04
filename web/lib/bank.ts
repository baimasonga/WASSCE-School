import core from "./core.json";
import type {Question,Pack} from "./questions";
export const coreQuestions=core.questions.map(q=>({...q,subject_id:"mathematics",countries:["SL","LR","GM"],exam_year:null,exam_series:"both" as const})) as Question[];
export const corePack:Pack={format_version:2,subject_id:"mathematics",countries:["SL","LR","GM"],exam_year:null,exam_series:"both",pack_id:"wassce-mathematics-core",title:"WASSCE Mathematics · Core",version:"1.1.0",questions:coreQuestions};
