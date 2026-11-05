package school.wassce.maths

import java.time.Instant
import java.time.ZoneId
import kotlin.random.Random

/** Days until a question comes back for review, by Leitner box. Box 0 = got it wrong: due now. */
val REVIEW_DAYS = listOf(0L, 1L, 3L, 7L, 16L, 35L)
const val DAY_MS = 86_400_000L

/** Per-question history. [due] is when spaced review should show the question again. */
data class QStat(
    val total: Int = 0, val correct: Int = 0, val lastCorrect: Boolean = false,
    val box: Int = 0, val due: Long = 0L, val lastAt: Long = 0L
) {
    fun after(ok: Boolean, now: Long): QStat {
        val nextBox = if (ok) (box + 1).coerceAtMost(REVIEW_DAYS.lastIndex) else 0
        return QStat(total + 1, correct + if (ok) 1 else 0, ok, nextBox, now + REVIEW_DAYS[nextBox] * DAY_MS, now)
    }
    fun isDue(now: Long): Boolean = total > 0 && due <= now
}

data class SectionScore(val section: String, val correct: Int, val total: Int)

/** A finished practice session or mock exam, kept for the progress history. */
data class SessionResult(
    val at: Long, val exam: Boolean, val label: String, val subjectId: String,
    val correct: Int, val total: Int, val answered: Int, val durationMs: Long,
    val sections: List<SectionScore>
) {
    /** Exams are marked out of every question; practice only out of the questions answered. */
    val outOf: Int get() = if (exam) total else answered
    val percent: Int get() = if (outOf == 0) 0 else (correct * 100 + outOf / 2) / outOf
}

fun summarize(s: Session, chosen: List<Question>, now: Long): SessionResult {
    val graded = if (s.exam) chosen else chosen.filter { it.id in s.responses }
    val sections = graded.groupBy { it.section }.map { (section, qs) ->
        SectionScore(section, qs.count { s.responses[it.id] == it.answer }, qs.size)
    }.sortedBy { it.section }
    return SessionResult(
        at = now, exam = s.exam, label = s.label.ifBlank { if (s.exam) "Mock exam" else "Practice" },
        subjectId = chosen.firstOrNull()?.subjectId ?: "mathematics",
        correct = graded.count { s.responses[it.id] == it.answer }, total = chosen.size,
        answered = chosen.count { it.id in s.responses },
        durationMs = if (s.startedAt > 0) (now - s.startedAt).coerceAtLeast(0) else 0L,
        sections = sections
    )
}

data class TopicStat(val section: String, val topic: String, val questions: Int, val seen: Int, val attempts: Int, val correct: Int) {
    val accuracy: Float get() = if (attempts == 0) 0f else correct.toFloat() / attempts
}

fun topicStats(pool: List<Question>, stats: Map<String, QStat>): List<TopicStat> =
    pool.groupBy { it.section to it.topic }.map { (key, qs) ->
        val seen = qs.mapNotNull { stats[it.id] }
        TopicStat(key.first, key.second, qs.size, seen.size, seen.sumOf { it.total }, seen.sumOf { it.correct })
    }.sortedWith(compareBy({ it.section }, { it.topic }))

/** Topics with enough attempts to judge, answered correctly less than [below] of the time; weakest first. */
fun weakTopics(topics: List<TopicStat>, minAttempts: Int = 3, below: Float = 0.7f): List<TopicStat> =
    topics.filter { it.attempts >= minAttempts && it.accuracy < below }
        .sortedWith(compareBy<TopicStat> { it.accuracy }.thenByDescending { it.attempts })

fun epochDay(ms: Long, zone: ZoneId = ZoneId.systemDefault()): Long =
    Instant.ofEpochMilli(ms).atZone(zone).toLocalDate().toEpochDay()

/** Consecutive practice days ending today, or yesterday if today has no practice yet. */
fun streak(days: Set<Long>, today: Long): Int {
    var day = when { today in days -> today; today - 1 in days -> today - 1; else -> return 0 }
    var count = 0
    while (day in days) { count++; day-- }
    return count
}

/**
 * Practice selection that favours what helps most: past mistakes, then questions due for spaced
 * review, then unseen questions, then the rest. One question per family; final order is shuffled.
 */
fun chooseSmart(pool: List<Question>, limit: Int, stats: Map<String, QStat>, now: Long, random: Random = Random.Default): List<Question> {
    require(pool.map { it.subjectId }.distinct().size <= 1) { "Choose one subject before starting a session." }
    fun rank(q: Question): Int = stats[q.id].let { st ->
        when { st == null || st.total == 0 -> 2; !st.lastCorrect -> 0; st.due <= now -> 1; else -> 3 }
    }
    return pool.shuffled(random).sortedBy(::rank).distinctBy { it.family }.take(limit).shuffled(random)
}
