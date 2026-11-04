import core from "./core.json";
import type {Question,Pack} from "./questions";
export const coreQuestions=core.questions as Question[];
export const corePack:Pack={format_version:1,pack_id:"wassce-mathematics-core",title:"WASSCE Mathematics · Core",version:"1.1.0",questions:coreQuestions};
