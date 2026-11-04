export const COUNTRIES=[{id:"SL",name:"Sierra Leone"},{id:"LR",name:"Liberia"},{id:"GM",name:"The Gambia"}] as const;
export type Country=typeof COUNTRIES[number]["id"];
export type Subject={id:string;name:string;category:string;topics:string[];slListed:boolean;gmListed:boolean};
const rows:[string,string,string,string,boolean?,boolean?][]=[
["mathematics","Mathematics","Mathematics","Number and numeration|Algebra|Mensuration|Geometry|Trigonometry|Statistics and probability|Vectors and transformations",true,true],
["english-language","English Language","Languages","Comprehension|Summary|Grammar and structure|Vocabulary|Essay writing|Speech and listening",true,true],
["biology","Biology","Sciences","Cells and organisation|Nutrition|Transport|Respiration|Reproduction|Ecology|Genetics and evolution",true,true],
["chemistry","Chemistry","Sciences","Atomic structure|Chemical bonding|Chemical calculations|Acids, bases and salts|Rates and equilibrium|Organic chemistry|Practical chemistry",true,true],
["physics","Physics","Sciences","Measurement|Mechanics|Heat|Waves and optics|Electricity|Magnetism|Atomic physics|Practical physics",true,true],
["agricultural-science","Agricultural Science","Agriculture","Agricultural ecology|Soil science|Crop production|Animal production|Farm management|Agricultural engineering",true,true],
["further-mathematics","Further Mathematics","Mathematics","Sets and functions|Polynomials|Matrices|Coordinate geometry|Calculus|Mechanics|Statistics",true,true],
["geography","Geography","Humanities","Map work|Physical geography|Weather and climate|Population|Economic geography|Regional geography|Fieldwork",true,true],
["economics","Economics","Business","Basic economic concepts|Demand and supply|Production|Market structures|Money and banking|National income|International trade|Development",true,true],
["history","History","Humanities","Historical sources|Pre-colonial societies|Colonial rule|Nationalism and independence|National history|West African history|International relations",true,true],
["literature-in-english","Literature-in-English","Languages","Literary appreciation|Prose|Drama|Poetry|Literary devices|Prescribed texts",true,true],
["government","Government","Humanities","Political concepts|Constitutions|Institutions of government|Electoral systems|Political development|International relations",true,true],
["commerce","Commerce","Business","Trade|Retail and wholesale|Business organisations|Transport|Communication|Banking|Insurance|Consumer protection",true,true],
["business-management","Business Management","Business","Business environment|Management functions|Human resources|Finance|Marketing|Operations|Entrepreneurship",true,true],
["financial-accounting","Financial Accounting","Business","Accounting principles|Double entry|Trial balance|Financial statements|Bank reconciliation|Partnerships|Company accounts",false,false],
["cost-accounting","Principles of Cost Accounting","Business","Cost classification|Materials|Labour|Overheads|Costing methods|Budgeting|Marginal costing",true,true],
["ict","Information and Communication Technology","Technology","Computer systems|Data and information|Office applications|Networks and internet|Databases|Digital safety|Problem solving",true,true],
["christian-religious-studies","Christian Religious Studies","Humanities","Old Testament themes|Life and teachings of Jesus|Early church|Christian values|Religious texts",true,true],
["islamic-studies","Islamic Studies","Humanities","Quran studies|Hadith|Life of the Prophet|Beliefs and worship|Islamic history|Ethics",true,true],
["french","French","Languages","Reading comprehension|Grammar|Vocabulary|Written expression|Listening|Speaking",true,true],
["arabic","Arabic","Languages","Reading comprehension|Grammar|Vocabulary|Translation|Composition|Literature",true,true],
["civic-education","Civic Education","Humanities","Citizenship|Rights and responsibilities|Democracy|Rule of law|Public institutions|Community participation",true,true],
["health-science","Health Science","Health and wellbeing","Human body systems|Nutrition|Personal health|Disease prevention|Community health|First aid",true,true],
["physical-education","Physical Education","Health and wellbeing","Anatomy and physiology|Fitness|Athletics|Games|Training principles|Sports safety",true,true],
["home-management","Home Management","Home economics","Family living|Resource management|Housing|Consumer education|Household equipment|Home safety",true,true],
["foods-and-nutrition","Foods and Nutrition","Home economics","Nutrients|Meal planning|Food preparation|Food preservation|Hygiene|Practical cookery",false,true],
["clothing-and-textiles","Clothing and Textiles","Home economics","Fibres and fabrics|Fabric care|Clothing design|Pattern making|Garment construction",false,false],
["technical-drawing","Technical Drawing","Technical and vocational","Drawing instruments|Geometrical construction|Orthographic projection|Pictorial drawing|Building drawing|Engineering drawing",true,true],
["visual-arts","Visual Arts","Creative arts","Art elements and principles|Drawing|Painting|Design|Sculpture|Art history and appreciation",true,true],
["music","Music","Creative arts","Music theory|Rhythm|Melody and harmony|Aural skills|Music history|Performance",false,false],
["animal-husbandry","Animal Husbandry","Agriculture","Animal breeds|Feeding|Housing|Reproduction|Animal health|Livestock management",false,true],
["crop-husbandry","Crop Husbandry","Agriculture","Crop ecology|Crop propagation|Soil fertility|Pests and diseases|Harvesting|Storage",false,true],
["entrepreneurship","Entrepreneurship","Business","Business opportunities|Business plans|Enterprise finance|Marketing|Operations|Enterprise growth",false,true],
["insurance","Insurance","Business","Risk|Insurance principles|Life insurance|General insurance|Claims|Insurance markets",false,true],
["marketing","Marketing","Business","Market research|Consumer behaviour|Product|Pricing|Distribution|Promotion|Sales",false,true],
["metalwork","Metalwork","Technical and vocational","Workshop safety|Materials|Tools|Metal forming|Joining|Machining|Finishing",false,true],
["science","Science","Sciences","Scientific enquiry|Living things|Matter|Energy|Environment|Practical science",false,true],
["woodwork","Woodwork","Technical and vocational","Workshop safety|Timber|Tools and machines|Joints|Construction|Finishing",false,true],
];
export const SUBJECTS:Subject[]=rows.map(([id,name,category,topics,slListed=false,gmListed=false])=>({id,name,category,topics:topics.split("|"),slListed,gmListed}));
export const subjectName=(id?:string)=>SUBJECTS.find(s=>s.id===(id||"mathematics"))?.name||id||"Mathematics";
export function subjectStatus(s:Subject,country:string,year:number,series:string){
 if(country==="SL"&&s.slListed)return "National-office subject list · confirm year/series";
 if(country==="GM"&&s.gmListed&&year===2026&&series==="private")return "Listed · 2026 private candidates";
 if(country==="GM"&&s.gmListed)return "Listed for private 2026 · confirm this series";
 if(country==="LR")return "Expanded subject list · local confirmation needed";
 return "Country/series confirmation needed";
}
export const COUNTRY_NOTES:Record<Country,string>={SL:"The national-office page is a general list, not a complete year-specific registration schedule. Subject names and availability during curriculum transition need school/WAEC confirmation.",LR:"Liberia’s Ministry announced 39 additional WASSCE subjects for 2026. The full current names and series eligibility were not independently verified; the older LSHSCE list is not used as the WASSCE list.",GM:"The national-office list checked covers private candidates, 2026 Second Series. School-candidate and other-year offerings need separate confirmation."};
export const CATALOG_SOURCES=[{label:"WAEC Sierra Leone · WASSCE",url:"https://www.waecsierraleone.org/examinations/wassce"},{label:"WAEC The Gambia · private 2026",url:"https://new.waecgambia.org/wassce/"},{label:"Liberia Ministry · 2026 expansion",url:"https://moe.gov.lr/waec-liberia-releases-2025-exam-results-introduces-new-subjects-for-2026/"}];
export const countryApplies=(countries:readonly string[]|undefined,country:string)=>!countries||countries.includes(country);
export const questionSubject=(q:{subject_id?:string})=>q.subject_id||"mathematics";
