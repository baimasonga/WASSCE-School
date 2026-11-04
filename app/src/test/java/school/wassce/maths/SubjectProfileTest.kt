package school.wassce.maths
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
class SubjectProfileTest {
 private fun pack() = JSONObject("""{"format_version":2,"pack_id":"english-2027","title":"English sample","version":"1.0","subject_id":"english-language","countries":["LR","GM"],"exam_year":2027,"exam_series":"private","questions":[{"id":"Q1","family_id":"plurals","section":"Grammar","topic":"Plural nouns","syllabus_scope":"unmarked","question":"Choose the plural of child.","options":{"A":"childs","B":"children","C":"childes","D":"childrens"},"correct_option":"B","solution_steps":[{"step":1,"text":"Child has the irregular plural children."}]}]}""")
 @Test fun readsSubjectAndCountryMetadata() {
  val p=parseQuestionPack(pack().toString());val q=p.questions.single()
  assertEquals("english-language",q.subjectId);assertEquals(setOf("LR","GM"),q.countries);assertEquals(2027,q.examYear);assertEquals("private",q.examSeries)
  assertTrue(q.matchesProfile("LR","english-language",2027,"private"))
  assertFalse(q.matchesProfile("SL","english-language",2027,"private"))
  assertFalse(q.matchesProfile("LR","mathematics",2027,"private"))
  assertFalse(q.matchesProfile("LR","english-language",2026,"private"))
  assertFalse(q.matchesProfile("LR","english-language",2027,"school"))
 }
 @Test fun rejectsInvalidCountry() { val p=pack().put("countries",listOf("XX"));assertThrows(Exception::class.java) { parseQuestionPack(p.toString()) } }
 @Test fun rejectsUnknownSubject() { assertThrows(Exception::class.java) { parseQuestionPack(pack().put("subject_id","unknown").toString()) } }
 @Test fun rejectsFractionalYear() { assertThrows(Exception::class.java) { parseQuestionPack(pack().put("exam_year",2027.5).toString()) } }
 @Test fun neverMixesSubjectsInAMock() {
  val english=parseQuestionPack(pack().toString()).questions.single()
  val maths=english.copy(id="M1",family="math-family",subjectId="mathematics")
  assertThrows(IllegalArgumentException::class.java) { chooseQuestions(listOf(english,maths),50) }
 }
 @Test fun legacyQuestionDefaultsToMathematics() {
  val q=Question("old","A","Numbers","F",false,"Question",mapOf("A" to "1"),"A",listOf("Working"))
  assertEquals("mathematics",q.subjectId);assertTrue(q.matchesProfile("SL","mathematics",2026,"school"))
 }
 @Test fun catalogHasThreeCountryProfilesAndUniqueSubjectIds() { assertEquals(3,COUNTRY_NAMES.size);assertEquals(38,SUBJECT_IDS.size) }
}
