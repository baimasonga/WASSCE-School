package school.wassce.maths

import android.content.Context
import org.json.JSONObject
import java.io.InputStream
import java.io.File

const val MAX_PACK_BYTES = 5 * 1024 * 1024
private val SAFE_ID = Regex("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
data class QuestionPack(val id: String, val title: String, val version: String, val questions: List<Question>, val raw: String, val subjectId: String = "mathematics", val countries: Set<String> = setOf("SL","LR","GM"), val examYear: Int? = null, val examSeries: String = "both")

fun readPackText(input: InputStream): String {
    val out = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    var total = 0
    while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        total += count
        require(total <= MAX_PACK_BYTES) { "This pack exceeds the 5 MB limit." }
        out.write(buffer, 0, count)
    }
    return out.toByteArray().toString(Charsets.UTF_8)
}
private fun JSONObject.text(key: String, max: Int): String {
    val value = opt(key)
    require(value is String && value.isNotBlank() && value.length <= max) { "Invalid or missing $key." }
    return value.trim()
}
fun parseQuestionPack(raw: String): QuestionPack {
    require(raw.toByteArray(Charsets.UTF_8).size <= MAX_PACK_BYTES) { "This pack exceeds the 5 MB limit." }
    val root = JSONObject(raw)
    val format = root.optInt("format_version", 0)
    require(format in 1..2) { "Use WASSCE School question-pack format version 1 or 2." }
    if (format == 1) require(!root.has("subject_id") && !root.has("countries") && !root.has("exam_year") && !root.has("exam_series")) { "Subject and country metadata require format version 2." }
    val subjectId = if (format == 2) root.text("subject_id", 64) else "mathematics"
    require(subjectId in SUBJECT_IDS) { "Choose a recognised subject_id." }
    val countries = if (format == 2) root.getJSONArray("countries").let { a ->
        require(a.length() in 1..3) { "Choose countries SL, LR or GM." }
        List(a.length()) { a.getString(it) }.also { require(it.toSet().size == it.size && it.all { c -> c in COUNTRY_NAMES }) { "Invalid country list." } }.toSet()
    } else setOf("SL","LR","GM")
    val examYear = if (format == 2 && root.has("exam_year") && !root.isNull("exam_year")) {
        require(root.opt("exam_year") is Number) { "Invalid exam_year." }
        root.getInt("exam_year").also { require(it in 2000..2100 && (root.opt("exam_year") as Number).toDouble() == it.toDouble()) { "Invalid exam_year." } }
    } else null
    val examSeries = if (format == 2) root.text("exam_series", 16) else "both"
    require(examSeries in setOf("school", "private", "both")) { "Invalid exam_series." }
    val id = root.text("pack_id", 64)
    require(SAFE_ID.matches(id) && !id.equals("builtin", ignoreCase = true)) { "Invalid pack ID." }
    val title = root.text("title", 120)
    val version = root.text("version", 32)
    val data = root.getJSONArray("questions")
    require(data.length() in 1..5000) { "A pack must contain 1 to 5,000 questions." }
    val questions = List(data.length()) { index ->
        val q = data.getJSONObject(index)
        require(!q.has("subject_id") || q.getString("subject_id") == subjectId) { "All questions in a pack must have the same subject." }
        val localId = q.text("id", 64)
        val family = q.text("family_id", 64)
        require(SAFE_ID.matches(localId) && SAFE_ID.matches(family)) { "Invalid question or family ID." }
        val options = q.getJSONObject("options")
        require(options.keys().asSequence().toSet() == setOf("A", "B", "C", "D")) { "Each question needs exactly A, B, C and D." }
        val choices = listOf("A", "B", "C", "D").associateWith { options.text(it, 2000) }
        require(choices.values.toSet().size == 4) { "Answer options must be distinct." }
        val answer = q.text("correct_option", 1)
        require(answer in choices) { "Answer key must be A, B, C or D." }
        val steps = q.getJSONArray("solution_steps")
        require(steps.length() in 1..20) { "Each question needs 1 to 20 solution steps." }
        val working = List(steps.length()) { i ->
            val step = steps.getJSONObject(i)
            require(step.getInt("step") == i+1) { "Solution step numbers must start at 1 and be consecutive." }
            step.text("text", 4000)
        }
        val scope = q.text("syllabus_scope", 16)
        require(scope == "marked" || scope == "unmarked") { "Invalid syllabus_scope." }
        Question("$id/$localId", q.text("section", 160), q.text("topic", 160), "$id/$family",
            scope == "marked", q.text("question", 8000), choices, answer, working, id, subjectId, countries, examYear, examSeries)
    }
    require(questions.map { it.id }.distinct().size == questions.size) { "Question IDs must be unique within a pack." }
    return QuestionPack(id, title, version, questions, raw, subjectId, countries, examYear, examSeries)
}
class PackStore(context: Context) {
    private val directory = File(context.filesDir, "question-packs").apply { mkdirs() }
    fun installed(): List<QuestionPack> = directory.listFiles().orEmpty().filter { it.extension == "json" }
        .sortedBy { it.name }.mapNotNull { file -> runCatching { file.inputStream().use { parseQuestionPack(readPackText(it)) } }.getOrNull() }
    fun install(pack: QuestionPack) {
        // Revalidate on write; imported identifiers never become arbitrary paths.
        val checked = parseQuestionPack(pack.raw)
        val target = File(directory, "${checked.id}.json")
        require(target.exists() || directory.listFiles().orEmpty().count { it.extension == "json" } < 20) { "Remove a pack before adding another. Limit: 20 packs." }
        val otherBytes = directory.listFiles().orEmpty().filter { it.extension == "json" && it != target }.sumOf { it.length() }
        require(otherBytes + checked.raw.toByteArray(Charsets.UTF_8).size <= 20L * 1024 * 1024) { "Downloaded packs exceed the 20 MB library limit. Remove a pack first." }
        val atomic = android.util.AtomicFile(target)
        val stream = atomic.startWrite()
        try {
            stream.write(checked.raw.toByteArray(Charsets.UTF_8)); atomic.finishWrite(stream)
        } catch (e: Exception) { atomic.failWrite(stream); throw e }
    }
    fun remove(id: String) {
        require(SAFE_ID.matches(id) && id != "builtin")
        val file = File(directory, "$id.json")
        require(!file.exists() || file.delete()) { "Could not remove this pack." }
    }
}
enum class AnswerFeedback { NEUTRAL, CORRECT, INCORRECT }
fun answerFeedback(option: String, answer: String, selected: String?, revealed: Boolean): AnswerFeedback = when {
    !revealed -> AnswerFeedback.NEUTRAL
    option == answer -> AnswerFeedback.CORRECT
    option == selected -> AnswerFeedback.INCORRECT
    else -> AnswerFeedback.NEUTRAL
}
