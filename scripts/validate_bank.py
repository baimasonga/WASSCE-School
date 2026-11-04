"""Validate the bundled content contract before every Android build."""
import json
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'app/src/main/assets/questions.json'
bank = json.loads(p.read_text())
rows = bank['questions']
assert len(rows) == 1000
assert len({q['id'] for q in rows}) == 1000
assert len({q['family_id'] for q in rows}) == 139
for q in rows:
    assert set(q['options']) == set('ABCD')
    assert len(set(q['options'].values())) == 4
    assert q['correct_option'] in q['options']
    assert len(q['solution_steps']) >= 3
    assert [s['step'] for s in q['solution_steps']] == list(range(1,len(q['solution_steps'])+1))
    assert all(s['text'].strip() for s in q['solution_steps'])
assert sum(q['syllabus_scope']=='marked' for q in rows) == 197
print('PASS: 1,000 questions, 139 families and all numbered solution steps verified.')
