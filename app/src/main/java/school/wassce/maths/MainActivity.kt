package school.wassce.maths

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = StudyStore(this)
        val packStore = PackStore(this)
        val subjectCatalog = loadSubjectCatalog(this)
        setContent {
            SchoolTheme {
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
                                result.onSuccess { packs = it; pending = null; message = "Imported ${candidate.questions.size} questions. Choose the pack under More → Question library to study it." }
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

private enum class Dest(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Filled.Home), Practice("Practice", Icons.Filled.Edit), Progress("Progress", Icons.Filled.Star), More("More", Icons.Filled.Menu)
}

private const val EXAM_MS = 90 * 60 * 1000L

@Composable
private fun School(bank: List<Question>, store: StudyStore, packs: List<QuestionPack>, subjects: List<CatalogSubject>, busy: Boolean, onImport: () -> Unit, onRemove: (QuestionPack) -> Unit) {
    val context = LocalContext.current
    val byId = remember(bank) { bank.associateBy { it.id } }
    var country by rememberSaveable { mutableStateOf(store.profile("country", "SL")) }
    var subjectId by rememberSaveable { mutableStateOf(store.profile("subject", "mathematics")) }
    var examYear by rememberSaveable { mutableStateOf(store.profile("year", "2026")) }
    var examSeries by rememberSaveable { mutableStateOf(store.profile("series", "school")) }
    var includeMarked by rememberSaveable { mutableStateOf(store.flag("includeMarked", false)) }
    var packId by rememberSaveable { mutableStateOf("all") }
    val subject = subjects.firstOrNull { it.id == subjectId } ?: subjects.first()
    LaunchedEffect(country, subjectId, examYear, examSeries) { store.saveProfile(country, subjectId, examYear, examSeries) }
    LaunchedEffect(includeMarked) { store.setFlag("includeMarked", includeMarked) }

    val profileBank = bank.filter { it.matchesProfile(country, subject.id, examYear.toIntOrNull() ?: 2026, examSeries) }
    val eligiblePacks = packs.filter { it.subjectId == subject.id && country in it.countries && (it.examYear == null || it.examYear.toString() == examYear) && (it.examSeries == "both" || it.examSeries == examSeries) }
    val packIds = listOf("all") + (if (subject.id == "mathematics") listOf("builtin") else emptyList()) + eligiblePacks.map { it.id }
    val packLabels = listOf("All packs for this subject") + (if (subject.id == "mathematics") listOf("Built-in mathematics") else emptyList()) + eligiblePacks.map { "${it.title} (${it.id})" }
    val activePack = packId.takeIf { it in packIds } ?: "all"
    val source = profileBank.filter { activePack == "all" || it.packId == activePack }
    val visible = source.filter { includeMarked || !it.marked }

    var revision by remember { mutableIntStateOf(0) }
    val stats = remember(revision) { store.statsMap() }
    val saved = remember(revision) { store.bookmarks() }
    val history = remember(revision) { store.history() }
    val days = remember(revision) { store.practiceDays() }
    var session by remember { mutableStateOf(store.restore()?.takeIf { s -> s.ids.isNotEmpty() && s.index in s.ids.indices && s.ids.all { it in byId } }) }
    var inSession by rememberSaveable { mutableStateOf(false) }
    var dest by rememberSaveable { mutableStateOf(Dest.Home) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var pendingStart by remember { mutableStateOf<(() -> Unit)?>(null) }
    var confirmMock by remember { mutableStateOf(false) }

    fun update(s: Session?) { store.save(s); session = s }
    fun questionsOf(s: Session) = s.ids.mapNotNull { byId[it] }
    fun finish(s: Session) {
        if (s.finished) return
        val at = System.currentTimeMillis()
        store.finish(s, questionsOf(s), at)
        update(s.copy(finished = true, finishedAt = at)); revision++
    }
    fun discard() { session?.let { store.forget(it.token) }; update(null) }
    /** Starting replaces a saved session, so ask first if that one isn't finished. */
    fun requestStart(block: () -> Unit) { if (session?.finished == false) pendingStart = block else { discard(); block() } }
    fun start(chosen: List<Question>, exam: Boolean, label: String) {
        if (chosen.isEmpty()) return
        requestStart {
            val at = System.currentTimeMillis(); now = at
            update(Session(ids = chosen.map { it.id }, exam = exam, deadline = if (exam) at + EXAM_MS else 0L, startedAt = at, label = label))
            inSession = true
        }
    }
    fun startMock() = start(chooseQuestions(visible, 50), true, "Mock exam")
    fun openLab() = context.startActivity(Intent(context, ChemistryLabActivity::class.java))

    // The exam clock runs (and auto-submits) whether or not the exam screen is open.
    LaunchedEffect(session?.token, session?.finished) {
        while (session?.exam == true && session?.finished == false) {
            now = System.currentTimeMillis()
            session?.let { if (now >= it.deadline) finish(it) }
            delay(500)
        }
    }
    LaunchedEffect(dest, inSession) { now = System.currentTimeMillis() }

    pendingStart?.let { block ->
        AlertDialog(onDismissRequest = { pendingStart = null },
            title = { Text("Replace your saved session?") },
            text = { Text("Unchecked answers in your saved ${if (session?.exam == true) "mock exam" else "practice set"} will be lost. Answers you already checked stay in your progress.") },
            confirmButton = { TextButton(onClick = { pendingStart = null; discard(); block() }) { Text("Start new") } },
            dismissButton = { TextButton(onClick = { pendingStart = null }) { Text("Keep saved session") } })
    }
    if (confirmMock) AlertDialog(onDismissRequest = { confirmMock = false },
        title = { Text("Start a mock exam?") },
        text = { Text("Up to 50 ${subject.name} questions with a 90-minute clock. Answers and solutions appear after you submit. The clock keeps running if you leave the app.") },
        confirmButton = { Button(onClick = { confirmMock = false; startMock() }) { Text("Start") } },
        dismissButton = { TextButton(onClick = { confirmMock = false }) { Text("Not now") } })

    val s = session
    if (s != null && inSession) {
        SessionScreen(s, questionsOf(s), subjects, now, saved,
            onUpdate = ::update,
            onCheck = { q -> store.record(s.token, listOf(q), s.responses); update(s.copy(revealed = s.revealed + q.id)); revision++ },
            onFinish = ::finish,
            onBookmark = { id -> store.bookmark(id); revision++ },
            onLeave = { inSession = false },
            onDone = { update(null); inSession = false; dest = Dest.Progress })
        return
    }

    BackHandler(enabled = dest != Dest.Home) { dest = Dest.Home }
    val st = StudyState(subject, "${subject.name} · ${COUNTRY_NAMES[country]} · $examYear ${if (examSeries == "school") "school" else "private"} candidates",
        source, visible, stats, saved, history, streak(days, epochDay(now)), s, s?.let(::questionsOf) ?: emptyList(), now, includeMarked)
    Scaffold(bottomBar = {
        NavigationBar {
            Dest.entries.forEach { d ->
                NavigationBarItem(selected = dest == d, onClick = { dest = d }, icon = { Icon(d.icon, contentDescription = null) }, label = { Text(d.label) })
            }
        }
    }) { padding ->
        Box(Modifier.padding(padding).statusBarsPadding()) {
            when (dest) {
                Dest.Home -> HomeTab(st,
                    onResume = { inSession = true }, onDiscard = ::discard, onEditProfile = { dest = Dest.More },
                    onStartReview = { start(chooseSmart(st.due, 20, stats, now), false, "Review") },
                    onStartWeak = { val topics = st.weak.take(3).map { it.section to it.topic }.toSet()
                        start(chooseSmart(visible.filter { (it.section to it.topic) in topics }, 15, stats, now), false, "Weak topics") },
                    onQuick = { start(chooseSmart(visible, 10, stats, now), false, "Quick practice") },
                    onMock = { confirmMock = true }, onOpenLab = ::openLab, onPractice = { dest = Dest.Practice })
                Dest.Practice -> PracticeTab(st, onIncludeMarked = { includeMarked = it }, onStart = { qs, label -> start(qs, false, label) }, onMock = { confirmMock = true })
                Dest.Progress -> ProgressTab(st, onPracticeTopic = { t ->
                    start(chooseSmart(visible.filter { it.section == t.section && it.topic == t.topic }, 15, stats, now), false, t.topic) })
                Dest.More -> MoreTab(COUNTRY_NAMES, country, { country = it; packId = "all" },
                    examYear, { examYear = it; packId = "all" }, examSeries, { examSeries = it; packId = "all" },
                    subjects, subject, { subjectId = it; packId = "all" },
                    packLabels, packLabels[packIds.indexOf(activePack)], { label -> packId = packIds[packLabels.indexOf(label)] },
                    packs, busy || session?.finished == false, onImport, onRemove, ::openLab)
            }
        }
    }
}
