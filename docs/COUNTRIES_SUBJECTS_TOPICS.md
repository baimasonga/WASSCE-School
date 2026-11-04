# Country → examination profile → subject → topic

WASSCE School is a multi-subject learning platform for Sierra Leone, Liberia and The Gambia. Mathematics is the first populated subject; the initial catalog contains 38 subject entries, not 38 populated banks and not a complete verified registration list for every country/series. Other entries are explicitly labelled content planned and contain editorial topic outlines pending syllabus review. Never display mathematics questions under an unpopulated subject.

## Model

Country codes are SL, LR and GM. An exam profile includes country, year and school/private series. Subjects have stable IDs, names, categories and topic outlines. Questions inherit subject/country/year/series from their pack. Within a subject they retain sections, topics, family IDs, four answer options and worked solutions. `exam_year: null` means original practice offered across years, not a claim to be a past paper from a particular year. Countries are distribution/alignment tags and do not certify a candidate's registration eligibility. Country-marked portions of the original Mathematics syllabus remain separately flagged and excluded from mixed practice by default.

Version 2 question packs add:

```
"format_version": 2,
"subject_id": "english-language",
"countries": ["SL", "LR", "GM"],
"exam_year": null,
"exam_series": "both"
```

All other fields retain the earlier question-pack shape. Series is school, private or both. Each pack and session contains one subject only. Question IDs remain stable and pack namespacing prevents collisions. Legacy version 1 packs without new metadata default to Mathematics for all three countries; metadata on a version 1 pack is rejected to prevent silent misclassification. All new non-mathematics packs must use version 2. Android 0.3.0 supports version 2; earlier versions only support legacy packs. `examples/english-language-sample.json` is a small original grammar test pack, not a published bank or official WAEC paper.

The web database adds nullable subject_id, country and exam_year columns to attempts through an appended migration. Historical rows and local-browser attempts without subject metadata are interpreted as Mathematics. No destructive migration or question-ID rewrite is required. Android retains existing progress and question IDs.

## Country-list evidence (checked 4 November 2026)

- Sierra Leone national-office WASSCE page lists 26 subjects in a general description. It is not a full year/series-specific registration schedule. The catalog marks these as national-office listed, with a prompt to confirm the chosen year/series. https://www.waecsierraleone.org/examinations/wassce
- The Gambia national-office page identifies 35 subjects for Private Candidates, 2026 Second Series. This evidence is not applied as blanket approval for school candidates or later years. https://new.waecgambia.org/wassce/
- Liberia's Ministry announced 39 additional subjects for 2026. The exact expanded names/series mapping was not established from accessible official material. The older LSHSCE subject page is not relabelled as a current WASSCE list. All Liberia catalog eligibility labels remain pending local confirmation. https://moe.gov.lr/waec-liberia-releases-2025-exam-results-introduces-new-subjects-for-2026/
- Sierra Leone's national senior-secondary curriculum lists a larger future subject menu; curriculum membership alone is not proof that a subject is examined in a given WASSCE year. https://mbsse.pubpub.org/pub/l914qw91/release/1

Financial Accounting, Clothing and Textiles, and Music are additional planning entries without a verified country/series mapping in this research. The other 35 names are the union of the two retrieved national-office subject lists. Further subjects and renamed/new-curriculum aliases should be added when their country, year, series and syllabus are confirmed. Do not transplant Nigerian or Ghanaian compulsory/trade-subject rules to these three countries.

## Exam presets and limits

Subject filtering is enforced before selecting practice/mock questions and the selection helper rejects mixed-subject pools. Empty subjects cannot start an exam. The existing 50-question/90-minute preset comes from the uploaded Mathematics syllabus; it is labelled as a practice simulation for other subjects, not their official paper pattern. Subject-specific timings, paper numbers, practical, essay, oral and listening components require verified syllabuses and separate implementation.

## Content work remaining

Only the original 1,000 Mathematics questions are in the live core bank. Populate and review each other subject with its country-specific syllabus and paper requirements before advertising a complete question bank. Topic outlines are not exhaustive or officially validated. Preserve source/licensing details for any future past-paper content.
