package school.wassce.maths.screenshots

import androidx.compose.runtime.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.github.takahirom.roborazzi.ExperimentalRoborazziApi
import com.github.takahirom.roborazzi.captureScreenRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import school.wassce.maths.*
import java.io.File
import kotlin.random.Random

/**
 * Renders the main screens with sample progress and writes PNGs to docs/screenshots.
 * Run: gradle testDebugUnitTest -Pscreenshots
 */
@OptIn(ExperimentalRoborazziApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w400dp-h860dp-xxhdpi")
class ScreenshotTest {
    @get:Rule val compose = createComposeRule()

    private val app get() = RuntimeEnvironment.getApplication()
    private val bank by lazy { loadQuestions(app) }
    private val subjects by lazy { loadSubjectCatalog(app) }
    private val maths get() = subjects.first { it.id == "mathematics" }
    private val now = 1_793_000_000_000L  // a fixed instant so dates and timers are stable

    private fun out(name: String) = File(System.getProperty("screenshot.dir") ?: "build/screenshots", "$name.png").absolutePath

    /** A student a few weeks in: good on numbers, weak on two topics, some reviews due, two mocks taken. */
    private fun sampleStats(visible: List<Question>): Map<String, QStat> {
        val rnd = Random(3)
        val stats = mutableMapOf<String, QStat>()
        visible.filter { it.section.startsWith("A.") || it.section.startsWith("B.") }.take(260).forEach { q ->
            val weak = q.topic.contains("Indices", true) || q.topic.contains("Logarithm", true)
            val ok = if (weak) rnd.nextFloat() < 0.4f else rnd.nextFloat() < 0.85f
            val daysAgo = rnd.nextInt(1, 20)
            stats[q.id] = QStat().after(ok, now - daysAgo * DAY_MS).let { if (rnd.nextBoolean()) it.after(ok, now - (daysAgo / 2) * DAY_MS) else it }
        }
        visible.filter { it.section.startsWith("H.") }.take(40).forEach { q -> stats[q.id] = QStat().after(rnd.nextFloat() < 0.7f, now - 3 * DAY_MS) }
        return stats
    }

    private fun sampleHistory() = listOf(
        SessionResult(now - 1 * DAY_MS, true, "Mock exam", "mathematics", 36, 50, 49, 78 * 60_000L,
            listOf(SectionScore("A. Number and numeration", 15, 17), SectionScore("B. Algebraic processes", 7, 10))),
        SessionResult(now - 2 * DAY_MS, false, "Indices and logarithms", "mathematics", 6, 15, 15, 14 * 60_000L, emptyList()),
        SessionResult(now - 4 * DAY_MS, false, "Quick practice", "mathematics", 9, 10, 10, 7 * 60_000L, emptyList()),
        SessionResult(now - 8 * DAY_MS, true, "Mock exam", "mathematics", 31, 50, 50, 86 * 60_000L, emptyList()),
    )

    private fun state(session: Session? = null): StudyState {
        val visible = bank.filter { !it.marked }
        val stats = sampleStats(visible)
        val saved = visible.drop(5).take(12).map { it.id }.toSet()
        val day = epochDay(now)
        return StudyState(maths, "Mathematics · Sierra Leone · 2026 school candidates", bank, visible, stats, saved,
            sampleHistory(), streak(setOf(day, day - 1, day - 2, day - 3, day - 4), day), session,
            session?.ids?.mapNotNull { id -> bank.firstOrNull { it.id == id } } ?: emptyList(), now, false)
    }

    private fun tab(dest: Dest, body: @Composable (StudyState) -> Unit) {
        val st = state(Session(ids = bank.take(20).map { it.id }, exam = false, index = 6, label = "Quick practice",
            responses = bank.take(6).associate { it.id to it.answer }, startedAt = now - 600_000))
        compose.setContent { SchoolTheme { MainTabs(dest, onDest = {}) { body(st) } } }
    }

    @Composable private fun HomeScreen(st: StudyState) = HomeTab(st, {}, {}, {}, {}, {}, {}, {}, {}, {})

    @Test fun home() { tab(Dest.Home) { HomeScreen(it) }; compose.waitForIdle(); captureScreenRoboImage(out("01-home")) }

    @Test fun homeDark() {
        RuntimeEnvironment.setQualifiers("+night")
        tab(Dest.Home) { HomeScreen(it) }; compose.waitForIdle(); captureScreenRoboImage(out("09-home-dark"))
    }

    @Test fun practice() {
        tab(Dest.Practice) { PracticeTab(it, {}, { _, _ -> }, {}) }
        compose.onNodeWithText("A. Number and numeration").performClick()
        compose.waitForIdle(); captureScreenRoboImage(out("02-practice"))
    }

    @Test fun progress() {
        tab(Dest.Progress) { ProgressTab(it) {} }
        compose.waitForIdle(); captureScreenRoboImage(out("03-progress"))
    }

    @Test fun more() {
        tab(Dest.More) {
            MoreTab(COUNTRY_NAMES, "SL", {}, "2026", {}, "school", {}, subjects, maths, {},
                listOf("All packs for this subject", "Built-in mathematics"), "All packs for this subject", {}, emptyList(), false, {}, {}, {})
        }
        compose.waitForIdle(); captureScreenRoboImage(out("04-more"))
    }

    private fun session(s: Session) {
        val chosen = s.ids.map { id -> bank.first { it.id == id } }
        compose.setContent {
            var current by remember { mutableStateOf(s) }
            SchoolTheme {
                SessionScreen(current, chosen, subjects, now, setOf(chosen[current.index].id),
                    onUpdate = { current = it }, onCheck = {}, onFinish = {}, onBookmark = {}, onLeave = {}, onDone = {})
            }
        }
    }

    @Test fun practiceAnswerChecked() {
        val qs = bank.filter { it.steps.size >= 3 && it.text.length < 160 }.take(10)
        val q = qs[3]; val wrong = q.options.keys.first { it != q.answer }
        session(Session(ids = qs.map { it.id }, exam = false, index = 3, label = "Quick practice",
            responses = qs.take(4).associate { it.id to it.answer } + (q.id to wrong), revealed = qs.take(4).map { it.id }.toSet()))
        compose.onNodeWithText("Show all", substring = true).performClick()
        compose.waitForIdle(); captureScreenRoboImage(out("05-practice-checked"))
    }

    // Fixed selection (not random) so screenshots only change when the UI does.
    private val examQs by lazy { chooseSmart(bank.filter { !it.marked }, 50, emptyMap(), now, Random(11)).sortedBy { it.section } }
    private fun exam(answered: Int) = Session(ids = examQs.map { it.id }, exam = true, index = answered, label = "Mock exam",
        deadline = now + 4 * 60_000 + 32_000, startedAt = now - 85 * 60_000,
        responses = examQs.take(answered).mapIndexed { i, q -> q.id to if (i % 4 == 0) q.options.keys.first { it != q.answer } else q.answer }.toMap(),
        flagged = setOf(examQs[7].id, examQs[19].id))

    @Test fun examInProgress() { session(exam(31)); compose.waitForIdle(); captureScreenRoboImage(out("06-exam")) }

    @Test fun examGrid() {
        session(exam(31))
        compose.onNodeWithContentDescription("All questions").performClick()
        compose.waitForIdle(); captureScreenRoboImage(out("07-exam-grid"))
    }

    @Test fun examSubmitConfirm() {
        session(exam(46).copy(index = 49))
        compose.onNodeWithText("Submit exam").performClick()
        compose.waitForIdle(); captureScreenRoboImage(out("08-exam-submit"))
    }

    @Test fun examResults() {
        session(exam(48).copy(finished = true, finishedAt = now))
        compose.waitForIdle(); captureScreenRoboImage(out("10-exam-results"))
    }
}
