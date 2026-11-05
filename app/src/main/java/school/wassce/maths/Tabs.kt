@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package school.wassce.maths

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.DateFormat
import java.util.Date

/** Everything the tabs need to read; actions are passed separately. */
class StudyState(
    val subject: CatalogSubject, val profileLine: String, val source: List<Question>, val visible: List<Question>,
    val stats: Map<String, QStat>, val saved: Set<String>, val history: List<SessionResult>, val streak: Int,
    val session: Session?, val sessionQuestions: List<Question>, val now: Long, val includeMarked: Boolean
) {
    val topics = topicStats(visible, stats)
    val weak = weakTopics(topics)
    val due = visible.filter { stats[it.id]?.isDue(now) == true }
    val mistakes = visible.filter { stats[it.id]?.lastCorrect == false }
    val savedQs = visible.filter { it.id in saved }
    val attempts = visible.sumOf { stats[it.id]?.total ?: 0 }
    val correct = visible.sumOf { stats[it.id]?.correct ?: 0 }
    val seen = visible.count { stats[it.id] != null }
    val subjectHistory = history.filter { it.subjectId == subject.id }
}

@Composable
private fun TabColumn(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp), content = content)
}

@Composable
private fun TabTitle(title: String, subtitle: String? = null) {
    Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 20.dp))
    if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
fun HomeTab(st: StudyState, onResume: () -> Unit, onDiscard: () -> Unit, onEditProfile: () -> Unit,
            onStartReview: () -> Unit, onStartWeak: () -> Unit, onQuick: () -> Unit, onMock: () -> Unit,
            onOpenLab: () -> Unit, onPractice: () -> Unit) {
    var confirmDiscard by remember { mutableStateOf(false) }
    if (confirmDiscard) AlertDialog(onDismissRequest = { confirmDiscard = false },
        title = { Text("Discard this session?") },
        text = { Text("Unchecked answers in it will be lost. Answers you already checked stay in your progress.") },
        confirmButton = { TextButton(onClick = { confirmDiscard = false; onDiscard() }) { Text("Discard") } },
        dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text("Keep it") } })
    TabColumn {
        TabTitle("WASSCE School")
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(st.profileLine, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            TextButton(onClick = onEditProfile) { Text("Change") }
        }
        st.session?.let { s ->
            val answered = st.sessionQuestions.count { it.id in s.responses }
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer), modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text(if (s.finished) "Results ready" else "Continue where you left off", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(buildString {
                        append(s.label.ifBlank { if (s.exam) "Mock exam" else "Practice" })
                        append(" · $answered of ${st.sessionQuestions.size} answered")
                        if (s.exam && !s.finished) append(" · ${formatDuration((s.deadline - st.now).coerceAtLeast(0))} left (the clock keeps running)")
                    }, style = MaterialTheme.typography.bodyMedium)
                    Row(Modifier.padding(top = 8.dp)) {
                        Button(onClick = onResume) { Text(if (s.finished) "See results" else "Resume") }
                        TextButton(onClick = { if (s.finished) onDiscard() else confirmDiscard = true }) { Text(if (s.finished) "Dismiss" else "Discard") }
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatTile("${st.streak}", "day streak", Modifier.weight(1f))
            StatTile(percent(st.correct, st.attempts), "accuracy", Modifier.weight(1f))
            StatTile("${st.seen}", "of ${st.visible.size} seen", Modifier.weight(1f))
        }
        if (st.source.isEmpty()) {
            SectionHeader("${st.subject.name} is being prepared")
            Text("There are no questions for this subject and profile yet. Import a question pack from More, or choose another subject.", style = MaterialTheme.typography.bodyMedium)
            Text("Topic outline (awaiting syllabus review): " + st.subject.topics.joinToString(" · "), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
        } else {
            SectionHeader("Today")
            if (st.due.isNotEmpty()) ActionCard("Review ${st.due.size} due question${if (st.due.size == 1) "" else "s"}",
                "Questions you missed and ones you got right a while ago. Short daily reviews help them stick.", Icons.Filled.Refresh, emphasized = true, onClick = onStartReview)
            if (st.weak.isNotEmpty()) ActionCard("Practise your weak topics", st.weak.take(3).joinToString(" · ") { "${it.topic} ${percent(it.correct, it.attempts)}" },
                Icons.Filled.Build, emphasized = st.due.isEmpty(), onClick = onStartWeak)
            ActionCard("Quick practice · 10 questions", if (st.seen == 0) "A mixed set to get started." else "Mixed set, favouring questions you haven't seen yet.",
                Icons.Filled.PlayArrow, emphasized = st.due.isEmpty() && st.weak.isEmpty(), onClick = onQuick)
            ActionCard("Mock exam · 50 questions · 90 minutes", "Timed, answers revealed after you submit.", Icons.Filled.DateRange, onClick = onMock)
            ActionCard("Choose topics", "Pick a section or topic, saved questions or mistakes.", Icons.Filled.Search, onClick = onPractice)
        }
        SectionHeader("Chemistry lab")
        ActionCard("Virtual practicals · offline", "Titrations, salt analysis, gas tests and a timed mock practical. Rotate for a wider bench.", Icons.Filled.Build, onClick = onOpenLab)
    }
}

@Composable
fun PracticeTab(st: StudyState, onIncludeMarked: (Boolean) -> Unit, onStart: (List<Question>, String) -> Unit, onMock: () -> Unit) {
    var mode by rememberSaveable { mutableStateOf("all") }
    var section by rememberSaveable { mutableStateOf<String?>(null) }
    var topic by rememberSaveable { mutableStateOf<String?>(null) }
    var size by rememberSaveable { mutableIntStateOf(20) }
    val base = when (mode) { "saved" -> st.savedQs; "mistakes" -> st.mistakes; "due" -> st.due; else -> st.visible }
    val sections = st.visible.map { it.section }.distinct().sorted()
    val topics = st.visible.filter { it.section == section }.map { it.topic }.distinct().sorted()
    val pool = base.filter { (section == null || it.section == section) && (topic == null || it.topic == topic) }
    TabColumn {
        TabTitle("Practice", st.profileLine)
        SectionHeader("Questions")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("all" to "All · ${st.visible.size}", "due" to "Due · ${st.due.size}", "mistakes" to "Mistakes · ${st.mistakes.size}", "saved" to "Saved · ${st.savedQs.size}")
                .forEach { (id, label) -> FilterChip(selected = mode == id, onClick = { mode = id }, label = { Text(label) }) }
        }
        SectionHeader("Section")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = section == null, onClick = { section = null; topic = null }, label = { Text("All sections") })
            sections.forEach { name -> FilterChip(selected = section == name, onClick = { section = name; topic = null }, label = { Text(name) }) }
        }
        if (section != null && topics.size > 1) {
            SectionHeader("Topic")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = topic == null, onClick = { topic = null }, label = { Text("All topics") })
                topics.forEach { name ->
                    val stat = st.topics.firstOrNull { it.section == section && it.topic == name }
                    FilterChip(selected = topic == name, onClick = { topic = name },
                        label = { Text(if (stat != null && stat.attempts > 0) "$name · ${percent(stat.correct, stat.attempts)}" else name) })
                }
            }
        }
        SectionHeader("Length")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(10, 20, 30).forEach { n -> FilterChip(selected = size == n, onClick = { size = n }, label = { Text("$n questions") }) }
        }
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Include country-marked topics", style = MaterialTheme.typography.bodyLarge)
                Text("${st.source.count { it.marked }} questions on topics only some countries examine. Check with your teacher.", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = st.includeMarked, onCheckedChange = onIncludeMarked)
        }
        Button(enabled = pool.isNotEmpty(), modifier = Modifier.fillMaxWidth().padding(top = 16.dp), onClick = {
            val label = listOfNotNull(topic ?: section?.substringAfter(". "), when (mode) { "saved" -> "Saved"; "mistakes" -> "Mistakes"; "due" -> "Review"; else -> null })
                .joinToString(" · ").ifBlank { "Practice" }
            onStart(chooseSmart(pool, size, st.stats, st.now), label)
        }) { Text(if (pool.isEmpty()) "No questions match" else "Start · ${minOf(size, pool.distinctBy { it.family }.size)} of ${pool.size} matching") }
        Text("Each set uses one question per skill and puts mistakes, due reviews and unseen questions first.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
        SectionHeader("Mock exam")
        ActionCard("50 questions · 90 minutes", "Covers all sections of ${st.subject.name}, ignoring the filters above. The 50/90 format comes from Mathematics; other subjects may differ.",
            Icons.Filled.DateRange, enabled = st.visible.isNotEmpty(), onClick = onMock)
    }
}

@Composable
fun ProgressTab(st: StudyState, onPracticeTopic: (TopicStat) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf<String?>(null) }
    TabColumn {
        TabTitle("Progress", st.profileLine)
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatTile(percent(st.correct, st.attempts), "accuracy", Modifier.weight(1f))
            StatTile("${st.attempts}", "answers", Modifier.weight(1f))
            StatTile("${st.streak}", "day streak", Modifier.weight(1f))
        }
        val mocks = st.subjectHistory.filter { it.exam }
        if (mocks.isNotEmpty()) {
            SectionHeader("Mock exams")
            val best = mocks.maxOf { it.percent }
            Text("${mocks.size} taken · best ${best}% · latest ${mocks.first().percent}%" +
                (if (mocks.size > 1) " (${trend(mocks[0].percent - mocks[1].percent)} since the one before)" else ""), style = MaterialTheme.typography.bodyMedium)
        }
        if (st.weak.isNotEmpty()) {
            SectionHeader("Needs work")
            st.weak.take(5).forEach { t ->
                ListItem(headlineContent = { Text(t.topic) }, supportingContent = { Text("${t.section.substringAfter(". ")} · ${percent(t.correct, t.attempts)} of ${t.attempts} answers") },
                    trailingContent = { TextButton(onClick = { onPracticeTopic(t) }) { Text("Practise") } })
            }
        }
        SectionHeader("By section")
        if (st.topics.isEmpty()) Text("No questions for this profile yet.", style = MaterialTheme.typography.bodyMedium)
        st.topics.groupBy { it.section }.forEach { (section, topics) ->
            val q = topics.sumOf { it.questions }; val seen = topics.sumOf { it.seen }
            val att = topics.sumOf { it.attempts }; val cor = topics.sumOf { it.correct }
            ProgressRow(section, "$seen/$q seen · ${percent(cor, att)}", if (q == 0) 0f else seen.toFloat() / q,
                onClick = { expanded = if (expanded == section) null else section })
            if (expanded == section) Column(Modifier.padding(start = 16.dp)) {
                topics.forEach { t ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(t.topic, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text("${t.seen}/${t.questions} · ${percent(t.correct, t.attempts)}", style = MaterialTheme.typography.labelSmall)
                        TextButton(onClick = { onPracticeTopic(t) }, enabled = t.questions > 0) { Text("Practise") }
                    }
                }
            }
        }
        SectionHeader("Recent sessions")
        if (st.subjectHistory.isEmpty()) Text("Finished practice sets and mock exams will appear here.", style = MaterialTheme.typography.bodyMedium)
        val dates = remember { DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT) }
        st.subjectHistory.take(15).forEach { r ->
            ListItem(
                leadingContent = { Surface(shape = RoundedCornerShape(10.dp), color = if (r.exam) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh) {
                    Text("${r.percent}%", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) } },
                headlineContent = { Text(r.label) },
                supportingContent = { Text("${r.correct}/${r.outOf} correct · ${dates.format(Date(r.at))}" + if (r.durationMs > 0) " · ${formatDuration(r.durationMs)}" else "") }
            )
        }
    }
}

private fun trend(delta: Int) = when { delta > 0 -> "up $delta points"; delta < 0 -> "down ${-delta} points"; else -> "no change" }

@Composable
fun MoreTab(
    countries: Map<String, String>, country: String, onCountry: (String) -> Unit,
    year: String, onYear: (String) -> Unit, series: String, onSeries: (String) -> Unit,
    subjects: List<CatalogSubject>, subject: CatalogSubject, onSubject: (String) -> Unit,
    packLabels: List<String>, packLabel: String, onPack: (String) -> Unit,
    packs: List<QuestionPack>, busy: Boolean, onImport: () -> Unit, onRemove: (QuestionPack) -> Unit, onOpenLab: () -> Unit
) {
    TabColumn {
        TabTitle("More")
        SectionHeader("Your exam")
        ChoiceField("Country", countries.values.toList(), countries[country] ?: "Sierra Leone") { label -> onCountry(countries.entries.first { it.value == label }.key) }
        ChoiceField("Subject", subjects.map { it.name }, subject.name) { name -> onSubject(subjects.first { it.name == name }.id) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ChoiceField("Exam year", listOf("2026", "2027", "2028", "2029", "2030"), year, Modifier.weight(1f), onYear)
            ChoiceField("Candidates", listOf("School", "Private"), if (series == "school") "School" else "Private", Modifier.weight(1f)) { onSeries(if (it == "School") "school" else "private") }
        }
        Text("Subject availability depends on country, year and series. Confirm current registration subjects with your school or national WAEC office.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        SectionHeader("Question library")
        ChoiceField("Study from", packLabels, packLabel, onSelect = onPack)
        OutlinedButton(enabled = !busy, onClick = onImport, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Icon(Icons.Filled.Add, contentDescription = null); Spacer(Modifier.width(8.dp)); Text(if (busy) "Reading pack…" else "Import a downloaded JSON pack")
        }
        Text("Choose a WASSCE School JSON question pack from Downloads. PDF and VCE files are not supported.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        packs.forEach { pack ->
            ListItem(headlineContent = { Text(pack.title) },
                supportingContent = { Text("${subjects.firstOrNull { it.id == pack.subjectId }?.name ?: pack.subjectId} · ${pack.countries.joinToString()} · ${pack.questions.size} questions · v${pack.version}") },
                trailingContent = { IconButton(enabled = !busy, onClick = { onRemove(pack) }) { Icon(Icons.Filled.Delete, contentDescription = "Remove ${pack.title}") } })
        }
        SectionHeader("Chemistry lab")
        ActionCard("Open the virtual lab", "Works offline. Lab scores are separate from question practice.", Icons.Filled.Build, onClick = onOpenLab)
        SectionHeader("About")
        Text("Works offline · No account required. Original practice material, not official WAEC questions; teacher review is recommended. All learning progress stays on this phone.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
