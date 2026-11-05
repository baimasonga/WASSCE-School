package school.wassce.maths

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class Question(
    val id: String, val section: String, val topic: String, val family: String,
    val marked: Boolean, val text: String, val options: Map<String, String>,
    val answer: String, val steps: List<String>, val packId: String = "builtin", val subjectId: String = "mathematics",
    val countries: Set<String> = setOf("SL", "LR", "GM"), val examYear: Int? = null, val examSeries: String = "both"
)
fun loadQuestions(context: Context): List<Question> {
    val root = JSONObject(context.assets.open("questions.json").bufferedReader().use { it.readText() })
    val data = root.getJSONArray("questions")
    return List(data.length()) { i ->
        val q = data.getJSONObject(i)
        val opts = q.getJSONObject("options")
        val steps = q.getJSONArray("solution_steps")
        Question(q.getString("id"), q.getString("section"), q.getString("topic"),
            q.getString("family_id"), q.getString("syllabus_scope") == "marked",
            q.getString("question"), listOf("A", "B", "C", "D").associateWith { opts.getString(it) },
            q.getString("correct_option"), List(steps.length()) { steps.getJSONObject(it).getString("text") })
    }.also { require(it.size == 1000 && it.map { q -> q.id }.distinct().size == 1000) }
}
data class Session(
    val token: String = UUID.randomUUID().toString(), val ids: List<String>, val exam: Boolean,
    val deadline: Long = 0L, val index: Int = 0, val responses: Map<String, String> = emptyMap(),
    val revealed: Set<String> = emptySet(), val finished: Boolean = false,
    val flagged: Set<String> = emptySet(), val startedAt: Long = 0L, val finishedAt: Long = 0L, val label: String = ""
)
data class Score(val total: Int = 0, val correct: Int = 0)

private const val MAX_HISTORY = 50

fun QStat.toJson(): JSONObject = JSONObject().put("total", total).put("correct", correct).put("lastCorrect", lastCorrect)
    .put("box", box).put("due", due).put("lastAt", lastAt)
fun qStatFromJson(r: JSONObject): QStat = QStat(r.optInt("total"), r.optInt("correct"), r.optBoolean("lastCorrect"),
    r.optInt("box", 0), r.optLong("due", 0L), r.optLong("lastAt", 0L))

fun SessionResult.toJson(): JSONObject = JSONObject().put("at", at).put("exam", exam).put("label", label).put("subjectId", subjectId)
    .put("correct", correct).put("total", total).put("answered", answered).put("durationMs", durationMs)
    .put("sections", JSONArray(sections.map { JSONObject().put("section", it.section).put("correct", it.correct).put("total", it.total) }))
fun sessionResultFromJson(j: JSONObject): SessionResult {
    val rows = j.optJSONArray("sections") ?: JSONArray()
    return SessionResult(j.getLong("at"), j.getBoolean("exam"), j.optString("label"), j.optString("subjectId", "mathematics"),
        j.getInt("correct"), j.getInt("total"), j.optInt("answered", j.getInt("total")), j.optLong("durationMs"),
        List(rows.length()) { i -> rows.getJSONObject(i).let { SectionScore(it.getString("section"), it.getInt("correct"), it.getInt("total")) } })
}

class StudyStore(context: Context) {
    private val prefs = context.getSharedPreferences("study", Context.MODE_PRIVATE)
    fun profile(key: String, fallback: String): String = prefs.getString("profile_$key", fallback) ?: fallback
    fun saveProfile(country: String, subject: String, year: String, series: String) { prefs.edit().putString("profile_country",country).putString("profile_subject",subject).putString("profile_year",year).putString("profile_series",series).apply() }
    fun flag(key: String, fallback: Boolean): Boolean = prefs.getBoolean("flag_$key", fallback)
    fun setFlag(key: String, value: Boolean) { prefs.edit().putBoolean("flag_$key", value).apply() }
    fun bookmarks(): Set<String> = prefs.getStringSet("bookmarks", emptySet())!!.toSet()
    fun bookmark(id: String) {
        val values = bookmarks().toMutableSet()
        if (!values.add(id)) values.remove(id)
        prefs.edit().putStringSet("bookmarks", values).apply()
    }
    private fun stats(): JSONObject = runCatching { JSONObject(prefs.getString("stats", "{}")!!) }.getOrDefault(JSONObject())
    fun statsMap(): Map<String, QStat> { val s = stats(); return s.keys().asSequence().associateWith { qStatFromJson(s.getJSONObject(it)) } }
    fun mistakes(): Set<String> = statsMap().filterValues { !it.lastCorrect }.keys
    fun score(): Score = statsMap().values.let { v -> Score(v.sumOf { it.total }, v.sumOf { it.correct }) }
    fun practiceDays(): Set<Long> = runCatching { JSONArray(prefs.getString("days", "[]")!!).let { a -> List(a.length()) { a.getLong(it) }.toSet() } }.getOrDefault(emptySet())
    fun history(): List<SessionResult> = runCatching {
        JSONArray(prefs.getString("history", "[]")!!).let { a -> List(a.length()) { sessionResultFromJson(a.getJSONObject(it)) } }
    }.getOrDefault(emptyList())

    // A token+question key prevents duplicate scoring after rotation, resume or double taps.
    fun record(token: String, questions: List<Question>, responses: Map<String, String>, now: Long = System.currentTimeMillis()) {
        val stats = stats(); val recorded = JSONObject(prefs.getString("recorded", "{}")!!)
        var changed = false
        questions.forEach { q ->
            val key = "$token/${q.id}"
            if (!recorded.has(key)) {
                val previous = stats.optJSONObject(q.id)?.let(::qStatFromJson) ?: QStat()
                stats.put(q.id, previous.after(responses[q.id] == q.answer, now).toJson()); recorded.put(key, true); changed = true
            }
        }
        if (!changed) return
        val days = (practiceDays() + epochDay(now)).sorted().takeLast(400)
        prefs.edit().putString("stats", stats.toString()).putString("recorded", recorded.toString()).putString("days", JSONArray(days).toString()).apply()
    }
    /** Scores a session once: every question for exams, only answered ones for practice. */
    fun finish(s: Session, chosen: List<Question>, now: Long = System.currentTimeMillis()): SessionResult {
        record(s.token, if (s.exam) chosen else chosen.filter { it.id in s.responses }, s.responses, now)
        val result = summarize(s, chosen, now)
        val rows = JSONArray((listOf(result) + history()).take(MAX_HISTORY).map { it.toJson() })
        prefs.edit().putString("history", rows.toString()).apply()
        forget(s.token)
        return result
    }
    /** Drops a session's duplicate-scoring keys once it can no longer be scored, so they don't pile up. */
    fun forget(token: String) {
        val recorded = JSONObject(prefs.getString("recorded", "{}")!!)
        recorded.keys().asSequence().filter { it.startsWith("$token/") }.toList().forEach { recorded.remove(it) }
        prefs.edit().putString("recorded", recorded.toString()).apply()
    }
    fun save(s: Session?) {
        if (s == null) { prefs.edit().remove("session").apply(); return }
        val j = JSONObject().put("token", s.token).put("ids", JSONArray(s.ids)).put("exam", s.exam)
            .put("deadline", s.deadline).put("index", s.index).put("responses", JSONObject(s.responses))
            .put("revealed", JSONArray(s.revealed.toList())).put("finished", s.finished)
            .put("flagged", JSONArray(s.flagged.toList())).put("startedAt", s.startedAt).put("finishedAt", s.finishedAt).put("label", s.label)
        prefs.edit().putString("session", j.toString()).apply()
    }
    fun restore(): Session? {
      val raw = prefs.getString("session", null) ?: return null
      return runCatching {
        val j = JSONObject(raw)
        fun strings(key: String): List<String> = (j.optJSONArray(key) ?: JSONArray()).let { a -> List(a.length()) { a.getString(it) } }
        val r = j.getJSONObject("responses")
        Session(j.getString("token"), strings("ids"), j.getBoolean("exam"), j.getLong("deadline"),
            j.getInt("index"), r.keys().asSequence().associateWith { r.getString(it) }, strings("revealed").toSet(), j.getBoolean("finished"),
            strings("flagged").toSet(), j.optLong("startedAt"), j.optLong("finishedAt"), j.optString("label"))
      }.getOrNull()
    }
}

fun chooseQuestions(pool: List<Question>, limit: Int): List<Question> {
    require(pool.map { it.subjectId }.distinct().size <= 1) { "Choose one subject before starting a session." }
    return pool.shuffled().distinctBy { it.family }.take(limit)
}
