package school.wassce.maths

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = StudyStore(this)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF14665D), secondary = Color(0xFF97601D))) {
                val questions by produceState<List<Question>?>(null) {
                    value = withContext(Dispatchers.IO) { runCatching { loadQuestions(this@MainActivity) }.getOrDefault(emptyList()) }
                }
                Surface(Modifier.fillMaxSize()) {
                    when {
                        questions == null -> Box(Modifier.safeDrawingPadding().padding(24.dp)) { Text("Loading your offline library…") }
                        questions!!.isEmpty() -> Box(Modifier.safeDrawingPadding().padding(24.dp)) { Text("The question bank could not be loaded. Please reinstall the app.") }
                        else -> School(questions!!, store)
                    }
                }
            }
        }
    }
}
@Composable
private fun School(bank: List<Question>, store: StudyStore) {
    var session by remember { mutableStateOf(store.restore()?.takeIf { s -> s.ids.isNotEmpty() && s.index in s.ids.indices && s.ids.all { id -> bank.any { it.id == id } } }) }
    var screen by rememberSaveable { mutableStateOf("Home") }
    var includeMarked by rememberSaveable { mutableStateOf(false) }
    var section by rememberSaveable { mutableStateOf("All sections") }
    var topic by rememberSaveable { mutableStateOf("All topics") }
    var revision by remember { mutableIntStateOf(0) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var quit by remember { mutableStateOf(false) }
    fun update(s: Session?) { store.save(s); session = s }
    fun finish(s: Session) {
        if (!s.finished) {
            val chosen = s.ids.map { id -> bank.first { it.id == id } }
            store.record(s.token, chosen, s.responses)
            update(s.copy(finished = true)); revision++
        }
    }
    LaunchedEffect(session?.token, session?.finished) {
        while (session?.exam == true && session?.finished == false) {
            now = System.currentTimeMillis()
            session?.let { if (now >= it.deadline) finish(it) }
            delay(500)
        }
    }
    BackHandler(enabled = session != null || screen != "Home") {
        if (session != null) quit = true else screen = "Home"
    }
    if (quit) AlertDialog(onDismissRequest = { quit = false }, title = { Text("Leave this session?") },
        text = { Text("Your answers are saved. You can resume from Home. The clock continues for timed exams.") },
        confirmButton = { TextButton(onClick = { quit = false; screen = "Paused" }) { Text("Pause view") } },
        dismissButton = { TextButton(onClick = { quit = false }) { Text("Keep studying") } })
    Column(Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 20.dp)) {
        Text("WASSCE School", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 16.dp))
        Text("Mathematics • Learn at your own pace", style = MaterialTheme.typography.bodyMedium)
        HorizontalDivider(Modifier.padding(vertical = 12.dp))
        val s = session
        if (s != null && screen != "Paused") {
            val chosen = remember(s.ids) { s.ids.map { id -> bank.first { it.id == id } } }
            val question = chosen[s.index]
            var visibleSteps by rememberSaveable(s.token, question.id) { mutableIntStateOf(0) }
            val show = s.finished || (!s.exam && question.id in s.revealed)
            val selected = s.responses[question.id]
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                if (s.finished) {
                    val correct = chosen.count { s.responses[it.id] == it.answer }
                    Text("Result: $correct / ${chosen.size}", style = MaterialTheme.typography.headlineSmall)
                    Text("Unanswered: ${chosen.count { it.id !in s.responses }} • Review your answers below.")
                } else if (s.exam) {
                    val left = ((s.deadline-now).coerceAtLeast(0)/1000).toInt()
                    Text("Mock exam • %02d:%02d remaining".format(left/60,left%60), color = MaterialTheme.colorScheme.primary)
                }
                Text("Question ${s.index+1} of ${chosen.size} • ${question.topic}", modifier = Modifier.padding(vertical = 12.dp))
                if (question.marked) Text("Country-marked syllabus topic", style = MaterialTheme.typography.labelMedium)
                Text(question.text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 16.dp))
                question.options.forEach { (key, value) ->
                    val label = when {
                        show && key == question.answer -> "✓ $key. $value"
                        show && key == selected -> "✗ $key. $value"
                        selected == key -> "● $key. $value"
                        else -> "$key. $value"
                    }
                    OutlinedButton(onClick = { if (!show) update(s.copy(responses = s.responses + (question.id to key))) },
                        enabled = !show, modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) { Text(label, modifier = Modifier.fillMaxWidth()) }
                }
                TextButton(onClick = { store.bookmark(question.id); revision++ }) {
                    Text(if (remember(revision, question.id) { question.id in store.bookmarks() }) "Remove bookmark" else "Bookmark question")
                }
                if (!s.exam && !show) Button(enabled = selected != null, onClick = {
                    store.record(s.token, listOf(question), s.responses)
                    update(s.copy(revealed = s.revealed + question.id)); revision++
                }) { Text("Check answer") }
                if (show) {
                    Text("Correct answer: ${question.answer} — ${question.options[question.answer]}", color = MaterialTheme.colorScheme.primary)
                    Text("Worked solution", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 12.dp))
                    question.steps.take(visibleSteps).forEachIndexed { i, text ->
                        Text("Step ${i+1}: $text", modifier = Modifier.padding(vertical = 6.dp))
                    }
                    if (visibleSteps < question.steps.size) {
                        TextButton(onClick = { visibleSteps++ }) { Text("Reveal next step") }
                        TextButton(onClick = { visibleSteps = question.steps.size }) { Text("Show full solution") }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(enabled = s.index > 0, onClick = { update(s.copy(index = s.index-1)) }) { Text("Previous") }
                if (s.index < chosen.lastIndex) Button(onClick = { update(s.copy(index = s.index+1)) }) { Text("Next") }
                else Button(onClick = { if (s.finished) { update(null); screen = "Home" } else finish(s) }) { Text(if (s.finished) "Done" else "Finish") }
            }
            Row {
                TextButton(onClick = { screen = "Paused" }) { Text("Home / resume later") }
                if (s.exam && !s.finished) TextButton(onClick = { finish(s) }) { Text("Submit exam") }
            }
        } else {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                if (session != null) {
                    Button(onClick = { screen = "Home" }, modifier = Modifier.fillMaxWidth()) { Text("Resume saved session") }
                    TextButton(onClick = { update(null); screen = "Home" }) { Text("Discard saved session") }
                }
                val score = remember(revision) { store.score() }
                Text("Your progress", style = MaterialTheme.typography.titleLarge)
                Text("${score.total} questions attempted • ${score.correct} correct", modifier = Modifier.padding(vertical = 8.dp))
                Row {
                    TextButton(onClick = { screen = "Home" }) { Text("Practice") }
                    TextButton(onClick = { screen = "Bookmarks" }) { Text("Saved") }
                    TextButton(onClick = { screen = "Mistakes" }) { Text("Mistakes") }
                }
                Text(screen.takeUnless { it == "Paused" } ?: "Practice", style = MaterialTheme.typography.titleMedium)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Include country-marked topics", modifier = Modifier.weight(1f).padding(top = 12.dp))
                    Switch(checked = includeMarked, onCheckedChange = { includeMarked = it })
                }
                Text("803 unmarked + 197 country-marked questions. Country eligibility needs teacher confirmation.", style = MaterialTheme.typography.bodySmall)
                Choice("Section", listOf("All sections") + bank.map { it.section }.distinct(), section) { section = it; topic = "All topics" }
                val topics = bank.filter { section == "All sections" || it.section == section }.map { it.topic }.distinct().sorted()
                Choice("Topic", listOf("All topics") + topics, topic) { topic = it }
                val allowed = bank.filter { q ->
                    (includeMarked || !q.marked) && (section == "All sections" || q.section == section) &&
                        (topic == "All topics" || q.topic == topic) && when(screen) {
                            "Bookmarks" -> q.id in store.bookmarks()
                            "Mistakes" -> q.id in store.mistakes()
                            else -> true
                        }
                }
                Text("${allowed.size} questions available", modifier = Modifier.padding(vertical = 8.dp))
                Button(enabled = allowed.isNotEmpty() && session == null, modifier = Modifier.fillMaxWidth(), onClick = {
                    val chosen = chooseQuestions(allowed, 20)
                    update(Session(ids = chosen.map { it.id }, exam = false)); screen = "Home"
                }) { Text("Start practice • up to 20 questions") }
                Button(enabled = session == null, modifier = Modifier.fillMaxWidth(), onClick = {
                    val pool = bank.filter { includeMarked || !it.marked }
                    val chosen = chooseQuestions(pool, 50)
                    update(Session(ids = chosen.map { it.id }, exam = true, deadline = System.currentTimeMillis()+90*60*1000L)); screen = "Home"
                }) { Text("Mock exam • 50 questions • 90 minutes") }
                Text("Mock exams use all eligible sections. Practice uses your filters. Each session avoids repeating the same question family.", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(20.dp))
                Text("Works offline • No account required", style = MaterialTheme.typography.titleMedium)
                Text("Original practice material, not official WAEC questions. Teacher review is recommended. All learning progress stays on this phone.", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
@Composable
private fun Choice(label: String, values: List<String>, selected: String, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("$label: $selected") }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            values.forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { onSelect(value); open = false }) }
        }
    }
}
