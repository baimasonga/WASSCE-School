package school.wassce.maths

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = StudyStore(this)
        val packStore = PackStore(this)
        val subjectCatalog = loadSubjectCatalog(this)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF14665D), secondary = Color(0xFF97601D))) {
                val scope = rememberCoroutineScope()
                var core by remember { mutableStateOf<List<Question>?>(null) }
                var packs by remember { mutableStateOf<List<QuestionPack>>(emptyList()) }
                var pending by remember { mutableStateOf<QuestionPack?>(null) }
                var remove by remember { mutableStateOf<QuestionPack?>(null) }
                var message by remember { mutableStateOf<String?>(null) }
                var busy by remember { mutableStateOf(false) }
                LaunchedEffect(Unit) {
                    val result = withContext(Dispatchers.IO) { runCatching { loadQuestions(this@MainActivity) to packStore.installed() } }
                    result.onSuccess { (bank, installed) -> packs = installed; core = bank }
                        .onFailure { core = emptyList() }
                }
                val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
                    if (uri != null) scope.launch {
                        busy = true
                        val result = withContext(Dispatchers.IO) { runCatching {
                            contentResolver.openInputStream(uri)?.use { parseQuestionPack(readPackText(it)) }
                                ?: error("Cannot open the selected file.")
                        } }
                        result.onSuccess { pending = it }.onFailure { message = "Import failed: " + (it.message?.take(200) ?: "Invalid question pack.") }
                        busy = false
                    }
                }
                pending?.let { candidate ->
                    AlertDialog(onDismissRequest = { if (!busy) pending = null }, title = { Text("Import ${candidate.title}?") },
                        text = { Text("${candidate.questions.size} questions • version ${candidate.version}\n" +
                            if (packs.any { it.id == candidate.id }) "This replaces the installed version of this pack. Saved progress is retained by question ID." else "The pack will be available offline in your question library.") },
                        confirmButton = { TextButton(enabled = !busy, onClick = {
                            scope.launch {
                                busy = true
                                val result = withContext(Dispatchers.IO) { runCatching { packStore.install(candidate); packStore.installed() } }
                                result.onSuccess { packs = it; pending = null; message = "Imported ${candidate.questions.size} questions. Select the pack from Question library to study." }
                                    .onFailure { message = it.message?.take(200) ?: "Could not save the pack."; pending = null }
                                busy = false
                            }
                        }) { Text(if (busy) "Importing…" else "Import pack") } },
                        dismissButton = { TextButton(enabled = !busy, onClick = { pending = null }) { Text("Cancel") } })
                }
                remove?.let { candidate ->
                    AlertDialog(onDismissRequest = { remove = null }, title = { Text("Remove ${candidate.title}?") },
                        text = { Text("This removes the downloaded questions from this phone. Your progress stays saved if you import the same pack again.") },
                        confirmButton = { TextButton(onClick = { scope.launch {
                            busy = true
                            val result = withContext(Dispatchers.IO) { runCatching { packStore.remove(candidate.id); packStore.installed() } }
                            result.onSuccess { packs = it }.onFailure { message = "Could not remove this pack." }
                            remove = null; busy = false
                        } }) { Text("Remove") } }, dismissButton = { TextButton(onClick = { remove = null }) { Text("Cancel") } })
                }
                message?.let { text -> AlertDialog(onDismissRequest = { message = null }, title = { Text("Question library") },
                    text = { Text(text) }, confirmButton = { TextButton(onClick = { message = null }) { Text("OK") } }) }
                Surface(Modifier.fillMaxSize()) {
                    when {
                        core == null -> Box(Modifier.safeDrawingPadding().padding(24.dp)) { Text("Loading your offline library…") }
                        core!!.isEmpty() -> Box(Modifier.safeDrawingPadding().padding(24.dp)) { Text("The question bank could not be loaded. Please reinstall the app.") }
                        else -> School(core!! + packs.flatMap { it.questions }, store, packs, subjectCatalog, busy,
                            onImport = { picker.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) },
                            onRemove = { remove = it })
                    }
                }
            }
        }
    }
}
@Composable
private fun School(bank: List<Question>, store: StudyStore, packs: List<QuestionPack>, subjects: List<CatalogSubject>, busy: Boolean, onImport: () -> Unit, onRemove: (QuestionPack) -> Unit) {
    var country by rememberSaveable { mutableStateOf(store.profile("country", "SL")) }
    var subjectId by rememberSaveable { mutableStateOf(store.profile("subject", "mathematics")) }
    var examYear by rememberSaveable { mutableStateOf(store.profile("year", "2026")) }
    var examSeries by rememberSaveable { mutableStateOf(store.profile("series", "school")) }
    val subject = subjects.firstOrNull { it.id == subjectId } ?: subjects.first()
    LaunchedEffect(country, subjectId, examYear, examSeries) { store.saveProfile(country, subjectId, examYear, examSeries) }
    var packId by rememberSaveable { mutableStateOf("all") }
    val profileBank = bank.filter { it.matchesProfile(country, subject.id, examYear.toIntOrNull() ?: 2026, examSeries) }
    val eligiblePacks = packs.filter { it.subjectId == subject.id && country in it.countries && (it.examYear == null || it.examYear.toString() == examYear) && (it.examSeries == "both" || it.examSeries == examSeries) }
    val ids = listOf("all") + (if (subject.id == "mathematics") listOf("builtin") else emptyList()) + eligiblePacks.map { it.id }
    val activePack = packId.takeIf { it in ids } ?: "all"
    val source = profileBank.filter { activePack == "all" || it.packId == activePack }
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
        Text("WASSCE subjects • Your learning space", style = MaterialTheme.typography.bodyMedium)
        HorizontalDivider(Modifier.padding(vertical = 12.dp))
        val s = session
        if (s != null && screen != "Paused") {
            val chosen = remember(s.ids, bank) { s.ids.map { id -> bank.first { it.id == id } } }
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
                Text("${subjects.firstOrNull { it.id == question.subjectId }?.name ?: question.subjectId} • Question ${s.index+1} of ${chosen.size} • ${question.topic}", modifier = Modifier.padding(vertical = 12.dp))
                if (question.marked) Text("Country-marked syllabus topic", style = MaterialTheme.typography.labelMedium)
                Text(question.text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 16.dp))
                question.options.forEach { (key, value) ->
                    val feedback = answerFeedback(key, question.answer, selected, show)
                    val ink = when(feedback) {
                        AnswerFeedback.CORRECT -> Color(0xFF1249A6)
                        AnswerFeedback.INCORRECT -> Color(0xFFB3261E)
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                    val background = when(feedback) {
                        AnswerFeedback.CORRECT -> Color(0xFFEAF1FF)
                        AnswerFeedback.INCORRECT -> Color(0xFFFCE9E7)
                        else -> Color.Transparent
                    }
                    val label = when(feedback) {
                        AnswerFeedback.CORRECT -> "✓ Correct — $key. $value"
                        AnswerFeedback.INCORRECT -> "✗ Your answer is incorrect — $key. $value"
                        else -> if (selected == key) "● $key. $value" else "$key. $value"
                    }
                    OutlinedButton(onClick = { if (!show) update(s.copy(responses = s.responses + (question.id to key))) },
                        enabled = !show,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ink, containerColor = background,
                            disabledContentColor = ink, disabledContainerColor = background),
                        border = BorderStroke(if (feedback == AnswerFeedback.NEUTRAL) 1.dp else 2.dp, ink),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) { Text(label, modifier = Modifier.fillMaxWidth()) }
                }
                TextButton(onClick = { store.bookmark(question.id); revision++ }) {
                    Text(if (remember(revision, question.id) { question.id in store.bookmarks() }) "Remove bookmark" else "Bookmark question")
                }
                if (!s.exam && !show) Button(enabled = selected != null, onClick = {
                    store.record(s.token, listOf(question), s.responses)
                    update(s.copy(revealed = s.revealed + question.id)); revision++
                }) { Text("Check answer") }
                if (show) {
                    Text("Correct answer: ${question.answer} — ${question.options[question.answer]}", color = Color(0xFF1249A6))
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
                Choice("Country", COUNTRY_NAMES.values.toList(), COUNTRY_NAMES[country] ?: "Sierra Leone") { label -> country = COUNTRY_NAMES.entries.first { it.value == label }.key; packId = "all"; section = "All sections"; topic = "All topics" }
                Choice("Exam year", listOf("2026","2027","2028","2029","2030"), examYear) { examYear = it; packId = "all" }
                Choice("Candidate series", listOf("School candidates", "Private candidates"), if (examSeries == "school") "School candidates" else "Private candidates") { examSeries = if (it == "School candidates") "school" else "private"; packId = "all" }
                Choice("Subject", subjects.map { it.name }, subject.name) { name -> subjectId = subjects.first { it.name == name }.id; packId = "all"; section = "All sections"; topic = "All topics" }
                Text("Subject availability depends on country, year and series. Confirm current registration subjects with your school or national WAEC office.", style = MaterialTheme.typography.bodySmall)
                val packLabels = listOf("All packs for this subject") + (if (subject.id == "mathematics") listOf("Built-in mathematics") else emptyList()) + eligiblePacks.map { "${it.title} (${it.id})" }
                val packIds = ids
                Choice("Question library", packLabels, packLabels[packIds.indexOf(activePack)]) { label ->
                    packId = packIds[packLabels.indexOf(label)]; section = "All sections"; topic = "All topics"
                }
                Text(screen.takeUnless { it == "Paused" } ?: "Practice", style = MaterialTheme.typography.titleMedium)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Include country-marked topics", modifier = Modifier.weight(1f).padding(top = 12.dp))
                    Switch(checked = includeMarked, onCheckedChange = { includeMarked = it })
                }
                Text("${source.count { !it.marked }} unmarked + ${source.count { it.marked }} country-marked questions in this pack. Country eligibility needs teacher confirmation.", style = MaterialTheme.typography.bodySmall)
                Choice("Section", listOf("All sections") + source.map { it.section }.distinct(), section) { section = it; topic = "All topics" }
                val topics = source.filter { section == "All sections" || it.section == section }.map { it.topic }.distinct().sorted()
                Choice("Topic", listOf("All topics") + topics, topic) { topic = it }
                val allowed = source.filter { q ->
                    (includeMarked || !q.marked) && (section == "All sections" || q.section == section) &&
                        (topic == "All topics" || q.topic == topic) && when(screen) {
                            "Bookmarks" -> q.id in store.bookmarks()
                            "Mistakes" -> q.id in store.mistakes()
                            else -> true
                        }
                }
                if (source.isEmpty()) {
                    Text("${subject.name}: question bank being prepared for this profile.", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
                    Text("Topic outline (awaiting syllabus review): " + subject.topics.joinToString(" • "), style = MaterialTheme.typography.bodySmall)
                }
                Text("${allowed.size} questions available", modifier = Modifier.padding(vertical = 8.dp))
                Button(enabled = allowed.isNotEmpty() && session == null, modifier = Modifier.fillMaxWidth(), onClick = {
                    val chosen = chooseQuestions(allowed, 20)
                    update(Session(ids = chosen.map { it.id }, exam = false)); screen = "Home"
                }) { Text("Start practice • up to 20 questions") }
                Button(enabled = session == null && source.any { includeMarked || !it.marked }, modifier = Modifier.fillMaxWidth(), onClick = {
                    val pool = source.filter { includeMarked || !it.marked }
                    val chosen = chooseQuestions(pool, 50)
                    update(Session(ids = chosen.map { it.id }, exam = true, deadline = System.currentTimeMillis()+90*60*1000L)); screen = "Home"
                }) { Text("Mock exam • up to 50 questions • 90 minutes") }
                Text("Mocks use one subject only. The 50-question/90-minute preset comes from Mathematics; other subjects may use different official formats. Practice uses your filters. Each session avoids repeating the same question family.", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(20.dp))
                Text("Downloaded question packs", style = MaterialTheme.typography.titleMedium)
                Button(enabled = session == null && !busy, onClick = onImport, modifier = Modifier.fillMaxWidth()) {
                    Text(if (busy) "Reading pack…" else "Import downloaded JSON pack")
                }
                if (session != null) Text("Finish or discard the saved session to change downloaded packs.", style = MaterialTheme.typography.bodySmall)
                Text("Choose a WASSCE School JSON question pack from Downloads. PDF and VCE files are not supported.", style = MaterialTheme.typography.bodySmall)
                packs.forEach { pack ->
                    Text("${pack.title} • ${subjects.firstOrNull { it.id == pack.subjectId }?.name ?: pack.subjectId} • ${pack.countries.joinToString()} • ${pack.questions.size} questions • v${pack.version}", modifier = Modifier.padding(top = 8.dp))
                    TextButton(enabled = session == null && !busy, onClick = { onRemove(pack) }) { Text("Remove downloaded pack") }
                }
                Spacer(Modifier.height(16.dp))
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
