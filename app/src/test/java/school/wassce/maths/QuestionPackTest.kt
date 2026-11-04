package school.wassce.maths

import java.io.ByteArrayInputStream
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class QuestionPackTest {
    private fun sample(): JSONObject = JSONObject("""{
      "format_version":1,"pack_id":"paid-maths","title":"Maths extension","version":"1.0",
      "questions":[{"id":"Q1","family_id":"F1","section":"A","topic":"Addition","syllabus_scope":"unmarked",
        "question":"What is 2 + 3?","options":{"A":"4","B":"5","C":"6","D":"7"},"correct_option":"B",
        "solution_steps":[{"step":1,"text":"Add 2 and 3 to get 5."}]}]}
      """)
    private fun reject(change: (JSONObject) -> Unit) {
        val root = sample(); change(root)
        assertThrows(Exception::class.java) { parseQuestionPack(root.toString()) }
    }
    @Test fun validPackGetsNamespacedIdsAndWorking() {
        val pack = parseQuestionPack(sample().toString())
        assertEquals("paid-maths/Q1", pack.questions.single().id)
        assertEquals("paid-maths/F1", pack.questions.single().family)
        assertEquals("paid-maths", pack.questions.single().packId)
        assertEquals("B", pack.questions.single().answer)
        assertEquals(listOf("Add 2 and 3 to get 5."), pack.questions.single().steps)
    }
    @Test fun rejectsTraversal() = reject { it.put("pack_id", "../escape") }
    @Test fun rejectsBuiltinReplacement() = reject { it.put("pack_id", "builtin") }
    @Test fun rejectsUnknownFormat() = reject { it.put("format_version", 2) }
    @Test fun rejectsEmptyPack() = reject { it.put("questions", JSONArray()) }
    @Test fun rejectsDuplicateIds() = reject { it.getJSONArray("questions").put(it.getJSONArray("questions").getJSONObject(0)) }
    @Test fun rejectsWrongKey() = reject { it.getJSONArray("questions").getJSONObject(0).put("correct_option", "E") }
    @Test fun rejectsDuplicateOptions() = reject { it.getJSONArray("questions").getJSONObject(0).getJSONObject("options").put("A", "5") }
    @Test fun rejectsMissingOption() = reject { it.getJSONArray("questions").getJSONObject(0).getJSONObject("options").remove("D") }
    @Test fun rejectsNonSequentialSteps() = reject { it.getJSONArray("questions").getJSONObject(0).getJSONArray("solution_steps").getJSONObject(0).put("step", 2) }
    @Test fun rejectsMissingSolution() = reject { it.getJSONArray("questions").getJSONObject(0).put("solution_steps", JSONArray()) }
    @Test fun rejectsOversizedFileBeforeParsing() {
        assertThrows(IllegalArgumentException::class.java) { readPackText(ByteArrayInputStream(ByteArray(MAX_PACK_BYTES+1))) }
    }
    @Test fun decodesUtf8() {
        val text = "π and √ are supported"
        assertEquals(text, readPackText(ByteArrayInputStream(text.toByteArray(Charsets.UTF_8))))
    }
    @Test fun feedbackIsHiddenBeforeReveal() {
        listOf("A","B","C","D").forEach { assertEquals(AnswerFeedback.NEUTRAL, answerFeedback(it,"B","A",false)) }
    }
    @Test fun marksCorrectAndSelectedWrong() {
        assertEquals(AnswerFeedback.CORRECT,answerFeedback("B","B","A",true))
        assertEquals(AnswerFeedback.INCORRECT,answerFeedback("A","B","A",true))
        assertEquals(AnswerFeedback.NEUTRAL,answerFeedback("C","B","A",true))
    }
    @Test fun correctSelectionNeverMarkedWrong() {
        assertEquals(AnswerFeedback.CORRECT,answerFeedback("B","B","B",true))
        assertEquals(AnswerFeedback.NEUTRAL,answerFeedback("A","B","B",true))
    }
}
