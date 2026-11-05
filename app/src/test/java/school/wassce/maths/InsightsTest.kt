package school.wassce.maths

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.time.ZoneOffset
import kotlin.random.Random

class InsightsTest {
    private val now = 1_800_000_000_000L
    private fun q(id: String, family: String = id, section: String = "A. Number", topic: String = "Fractions") =
        Question(id, section, topic, family, false, "Q$id", mapOf("A" to "1", "B" to "2", "C" to "3", "D" to "4"), "A", listOf("Step"))

    @Test fun correctAnswersSpaceOutReviewAndWrongOnesResetIt() {
        val once = QStat().after(true, now)
        assertEquals(1, once.box); assertEquals(now + DAY_MS, once.due); assertFalse(once.isDue(now)); assertTrue(once.isDue(now + DAY_MS))
        val twice = once.after(true, now)
        assertEquals(now + 3 * DAY_MS, twice.due)
        val wrong = twice.after(false, now)
        assertEquals(0, wrong.box); assertTrue(wrong.isDue(now)); assertEquals(3, wrong.total); assertEquals(2, wrong.correct); assertFalse(wrong.lastCorrect)
        var top = QStat(); repeat(20) { top = top.after(true, now) }
        assertEquals(REVIEW_DAYS.lastIndex, top.box)
    }

    @Test fun unseenQuestionsAreNeverDue() = assertFalse(QStat().isDue(now))

    @Test fun smartSelectionPutsMistakesThenDueThenUnseenFirst() {
        val pool = (1..40).map { q("$it") }
        val stats = mapOf(
            "1" to QStat().after(false, now),                    // mistake
            "2" to QStat().after(true, now - 2 * DAY_MS),        // correct, due again
        ) + (3..30).associate { "$it" to QStat().after(true, now) } // correct, not due
        val picked = chooseSmart(pool, 12, stats, now, Random(7)).map { it.id }.toSet()
        assertTrue("mistake first", "1" in picked)
        assertTrue("due review next", "2" in picked)
        assertTrue("then unseen questions", (31..40).all { "$it" in picked })
        assertEquals(12, picked.size)
    }

    @Test fun smartSelectionKeepsOneQuestionPerFamilyAndOneSubject() {
        val pool = (1..30).map { q("$it", family = "f${it % 5}") }
        assertEquals(5, chooseSmart(pool, 20, emptyMap(), now).map { it.family }.distinct().size)
        assertEquals(5, chooseSmart(pool, 20, emptyMap(), now).size)
        assertTrue(chooseSmart(emptyList(), 10, emptyMap(), now).isEmpty())
        assertThrows(IllegalArgumentException::class.java) { chooseSmart(listOf(q("1"), q("2").copy(subjectId = "physics")), 10, emptyMap(), now) }
    }

    @Test fun weakTopicsNeedEnoughAttemptsAndAreSortedWeakestFirst() {
        val pool = listOf(q("1", topic = "Fractions"), q("2", topic = "Indices"), q("3", topic = "Surds"), q("4", topic = "Sets"))
        val stats = mapOf(
            "1" to QStat(total = 4, correct = 1), "2" to QStat(total = 5, correct = 3),
            "3" to QStat(total = 2, correct = 0), "4" to QStat(total = 5, correct = 5))
        val topics = topicStats(pool, stats)
        assertEquals(listOf("Fractions", "Indices"), weakTopics(topics).map { it.topic })
        assertEquals(0.25f, topics.first { it.topic == "Fractions" }.accuracy, 0.001f)
    }

    @Test fun streakCountsBackFromTodayOrYesterday() {
        assertEquals(3, streak(setOf(10L, 11L, 12L), 12L))
        assertEquals(3, streak(setOf(10L, 11L, 12L), 13L))
        assertEquals(0, streak(setOf(10L, 11L, 12L), 14L))
        assertEquals(1, streak(setOf(8L, 12L), 12L))
        assertEquals(0, streak(emptySet(), 12L))
        assertEquals(epochDay(0L, ZoneOffset.UTC) + 1, epochDay(DAY_MS, ZoneOffset.UTC))
    }

    @Test fun examsMarkEveryQuestionPracticeOnlyAnsweredOnes() {
        val chosen = listOf(q("1", section = "A"), q("2", section = "A"), q("3", section = "B"), q("4", section = "B"))
        val responses = mapOf("1" to "A", "2" to "B", "3" to "A")
        val exam = summarize(Session(ids = chosen.map { it.id }, exam = true, responses = responses, startedAt = now - 60_000), chosen, now)
        assertEquals(2, exam.correct); assertEquals(4, exam.outOf); assertEquals(50, exam.percent); assertEquals(60_000, exam.durationMs)
        assertEquals(listOf(SectionScore("A", 1, 2), SectionScore("B", 1, 2)), exam.sections)
        val practice = summarize(Session(ids = chosen.map { it.id }, exam = false, responses = responses, label = "Fractions"), chosen, now)
        assertEquals(3, practice.outOf); assertEquals(67, practice.percent); assertEquals("Fractions", practice.label)
        assertEquals(listOf(SectionScore("A", 1, 2), SectionScore("B", 1, 1)), practice.sections)
    }

    @Test fun historyAndStatsSurviveJsonRoundTrip() {
        val r = SessionResult(now, true, "Mock exam", "mathematics", 30, 50, 48, 3_600_000, listOf(SectionScore("A", 10, 15)))
        assertEquals(r, sessionResultFromJson(JSONObject(r.toJson().toString())))
        val s = QStat(3, 2, true, 2, now, now - 5)
        assertEquals(s, qStatFromJson(JSONObject(s.toJson().toString())))
        // Rows written by v0.4 have no review fields: they read as box 0 and due for review.
        val legacy = qStatFromJson(JSONObject("""{"total":2,"correct":1,"lastCorrect":true}"""))
        assertEquals(QStat(2, 1, true, 0, 0L, 0L), legacy); assertTrue(legacy.isDue(now))
    }
}
