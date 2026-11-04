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
    val revealed: Set<String> = emptySet(), val finished: Boolean = false
)
data class Score(val total: Int = 0, val correct: Int = 0)
class StudyStore(context: Context) {
    private val prefs = context.getSharedPreferences("study", Context.MODE_PRIVATE)
    fun profile(key: String, fallback: String): String = prefs.getString("profile_$key", fallback) ?: fallback
    fun saveProfile(country: String, subject: String, year: String, series: String) { prefs.edit().putString("profile_country",country).putString("profile_subject",subject).putString("profile_year",year).putString("profile_series",series).apply() }
    fun bookmarks(): Set<String> = prefs.getStringSet("bookmarks", emptySet())!!.toSet()
    fun bookmark(id: String) {
        val values = bookmarks().toMutableSet()
        if (!values.add(id)) values.remove(id)
        prefs.edit().putStringSet("bookmarks", values).apply()
    }
    fun stats(): JSONObject = JSONObject(prefs.getString("stats", "{}")!!)
    fun mistakes(): Set<String> {
        val s = stats()
        return s.keys().asSequence().filter { !s.getJSONObject(it).optBoolean("lastCorrect") }.toSet()
    }
    fun score(): Score {
        val s = stats(); var total = 0; var correct = 0
        s.keys().forEach { id -> total += s.getJSONObject(id).getInt("total"); correct += s.getJSONObject(id).getInt("correct") }
        return Score(total, correct)
    }
    // A token+question key prevents duplicate scoring after rotation, resume or double taps.
    fun record(token: String, questions: List<Question>, responses: Map<String, String>) {
        val stats = stats(); val recorded = JSONObject(prefs.getString("recorded", "{}")!!)
        questions.forEach { q ->
            val key = "$token/${q.id}"
            if (!recorded.has(key)) {
                val ok = responses[q.id] == q.answer
                val row = stats.optJSONObject(q.id) ?: JSONObject().put("total", 0).put("correct", 0)
                row.put("total", row.getInt("total") + 1).put("correct", row.getInt("correct") + if (ok) 1 else 0).put("lastCorrect", ok)
                stats.put(q.id, row); recorded.put(key, true)
            }
        }
        prefs.edit().putString("stats", stats.toString()).putString("recorded", recorded.toString()).apply()
    }
    fun save(s: Session?) {
        if (s == null) { prefs.edit().remove("session").apply(); return }
        val j = JSONObject().put("token", s.token).put("ids", JSONArray(s.ids)).put("exam", s.exam)
            .put("deadline", s.deadline).put("index", s.index).put("responses", JSONObject(s.responses))
            .put("revealed", JSONArray(s.revealed.toList())).put("finished", s.finished)
        prefs.edit().putString("session", j.toString()).apply()
    }
    fun restore(): Session? {
      val raw = prefs.getString("session", null) ?: return null
      return runCatching {
        val j = JSONObject(raw)
        fun strings(key: String): List<String> = j.getJSONArray(key).let { a -> List(a.length()) { a.getString(it) } }
        val r = j.getJSONObject("responses")
        Session(j.getString("token"), strings("ids"), j.getBoolean("exam"), j.getLong("deadline"),
            j.getInt("index"), r.keys().asSequence().associateWith { r.getString(it) }, strings("revealed").toSet(), j.getBoolean("finished"))
      }.getOrNull()
    }
}

fun chooseQuestions(pool: List<Question>, limit: Int): List<Question> {
    require(pool.map { it.subjectId }.distinct().size <= 1) { "Choose one subject before starting a session." }
    return pool.shuffled().distinctBy { it.family }.take(limit)
}
