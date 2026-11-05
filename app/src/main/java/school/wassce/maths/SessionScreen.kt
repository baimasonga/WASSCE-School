@file:OptIn(ExperimentalMaterial3Api::class)

package school.wassce.maths

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

private enum class Mark { OPEN, ANSWERED, CORRECT, WRONG }

private fun Session.mark(q: Question): Mark = when {
    finished || (!exam && q.id in revealed) -> if (responses[q.id] == q.answer) Mark.CORRECT else Mark.WRONG
    q.id in responses -> Mark.ANSWERED
    else -> Mark.OPEN
}

@Composable
fun SessionScreen(
    s: Session, chosen: List<Question>, subjects: List<CatalogSubject>, now: Long, saved: Set<String>,
    onUpdate: (Session) -> Unit, onCheck: (Question) -> Unit, onFinish: (Session) -> Unit,
    onBookmark: (String) -> Unit, onLeave: () -> Unit, onDone: () -> Unit
) {
    var showSummary by rememberSaveable(s.token) { mutableStateOf(s.finished) }
    var showGrid by remember { mutableStateOf(false) }
    var confirmFinish by remember { mutableStateOf(false) }
    LaunchedEffect(s.finished) { if (s.finished) showSummary = true }
    BackHandler { if (s.finished && !showSummary) showSummary = true else onLeave() }

    val question = chosen[s.index.coerceIn(chosen.indices)]
    val answered = chosen.count { it.id in s.responses }
    val title = s.label.ifBlank { if (s.exam) "Mock exam" else "Practice" }

    if (showGrid) QuestionGrid(s, chosen, onDismiss = { showGrid = false }) { i -> onUpdate(s.copy(index = i)); showGrid = false; showSummary = false }
    if (confirmFinish) {
        val unanswered = chosen.size - answered
        val flagged = chosen.count { it.id in s.flagged }
        AlertDialog(onDismissRequest = { confirmFinish = false },
            title = { Text(if (s.exam) "Submit your exam?" else "Finish practice?") },
            text = { Text(buildString {
                append("You have answered $answered of ${chosen.size} questions.")
                if (unanswered > 0) append(if (s.exam) " $unanswered unanswered will be marked wrong." else " Only answered questions count towards your progress.")
                if (flagged > 0) append(" $flagged flagged for review.")
                if (s.exam) append(" You can't change answers after submitting.")
            }) },
            confirmButton = { Button(onClick = { confirmFinish = false; onFinish(s) }) { Text(if (s.exam) "Submit" else "Finish") } },
            dismissButton = { TextButton(onClick = { confirmFinish = false }) { Text("Keep working") } })
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Column {
                            Text(title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(if (showSummary) "Results" else "Question ${s.index + 1} of ${chosen.size}", style = MaterialTheme.typography.labelMedium)
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { if (s.finished && !showSummary) showSummary = true else onLeave() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = if (s.finished && !showSummary) "Back to results" else "Leave and resume later")
                        }
                    },
                    actions = {
                        if (!showSummary) {
                            val isSaved = question.id in saved
                            IconButton(onClick = { onBookmark(question.id) }) {
                                Icon(Icons.Filled.Star, contentDescription = if (isSaved) "Remove from saved questions" else "Save this question",
                                    tint = if (isSaved) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                            }
                            IconButton(onClick = { showGrid = true }) { Icon(Icons.AutoMirrored.Filled.List, contentDescription = "All questions") }
                        }
                    }
                )
                LinearProgressIndicator(progress = { if (chosen.isEmpty()) 0f else answered.toFloat() / chosen.size },
                    modifier = Modifier.fillMaxWidth(), trackColor = MaterialTheme.colorScheme.surfaceContainerHigh, drawStopIndicator = {})
                if (s.exam && !s.finished) {
                    val left = (s.deadline - now).coerceAtLeast(0)
                    val urgent = left < 5 * 60_000
                    Surface(color = if (urgent) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceContainer) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Time left ${formatDuration(left)}", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f),
                                color = if (urgent) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurface)
                            Text("$answered answered", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        },
        bottomBar = {
            if (!showSummary) Surface(tonalElevation = 3.dp) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(enabled = s.index > 0, onClick = { onUpdate(s.copy(index = s.index - 1)) }, modifier = Modifier.weight(1f)) { Text("Previous") }
                    val revealed = s.finished || (!s.exam && question.id in s.revealed)
                    val selected = s.responses[question.id]
                    when {
                        !s.exam && !revealed && selected != null -> Button(onClick = { onCheck(question) }, modifier = Modifier.weight(1f)) { Text("Check answer") }
                        s.index < chosen.lastIndex -> Button(onClick = { onUpdate(s.copy(index = s.index + 1)) }, modifier = Modifier.weight(1f)) { Text("Next") }
                        s.finished -> Button(onClick = { showSummary = true }, modifier = Modifier.weight(1f)) { Text("Results") }
                        else -> Button(onClick = {
                            if (s.exam || answered < chosen.size) confirmFinish = true else onFinish(s)
                        }, modifier = Modifier.weight(1f)) { Text(if (s.exam) "Submit exam" else "Finish") }
                    }
                }
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            if (showSummary && s.finished) Results(s, chosen, onOpen = { i -> onUpdate(s.copy(index = i)); showSummary = false }, onDone = onDone)
            else QuestionBody(s, question, subjects, onUpdate, onSubmitEarly = { confirmFinish = true })
        }
    }
}

@Composable
private fun QuestionBody(s: Session, question: Question, subjects: List<CatalogSubject>, onUpdate: (Session) -> Unit, onSubmitEarly: () -> Unit) {
    val show = s.finished || (!s.exam && question.id in s.revealed)
    val selected = s.responses[question.id]
    var visibleSteps by rememberSaveable(s.token, question.id) { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text("${subjects.firstOrNull { it.id == question.subjectId }?.name ?: question.subjectId} · ${question.topic}",
            style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
        if (question.marked) Text("Country-marked syllabus topic", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
        Text(question.text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp, bottom = 12.dp))
        question.options.forEach { (key, value) ->
            OptionCard(key, value, answerFeedback(key, question.answer, selected, show), selected = selected == key, enabled = !show) {
                onUpdate(s.copy(responses = s.responses + (question.id to key)))
            }
        }
        if (!s.finished) {
            val flagged = question.id in s.flagged
            FilterChip(selected = flagged, onClick = { onUpdate(s.copy(flagged = if (flagged) s.flagged - question.id else s.flagged + question.id)) },
                label = { Text(if (flagged) "⚑ Flagged for review" else "⚑ Flag for review") }, modifier = Modifier.padding(top = 8.dp))
        }
        if (show) {
            val ok = selected == question.answer
            Surface(shape = RoundedCornerShape(16.dp), color = if (ok) correctContainer() else MaterialTheme.colorScheme.surfaceContainerHigh,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text(when { selected == null -> "Not answered"; ok -> "Correct!"; else -> "Not quite" },
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = if (ok) correctColor() else MaterialTheme.colorScheme.error)
                    Text("Correct answer: ${question.answer}. ${question.options[question.answer]}", style = MaterialTheme.typography.bodyMedium)
                }
            }
            Text("Worked solution", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp))
            question.steps.take(visibleSteps).forEachIndexed { i, text ->
                Row(Modifier.padding(vertical = 6.dp)) {
                    Text("${i + 1}.", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.width(28.dp))
                    Text(text, style = MaterialTheme.typography.bodyLarge)
                }
            }
            if (visibleSteps < question.steps.size) Row {
                OutlinedButton(onClick = { visibleSteps++ }) { Text(if (visibleSteps == 0) "Show first step" else "Next step") }
                TextButton(onClick = { visibleSteps = question.steps.size }) { Text("Show all ${question.steps.size} steps") }
            }
        }
        if (s.exam && !s.finished) TextButton(onClick = onSubmitEarly, modifier = Modifier.padding(top = 12.dp)) { Text("Submit exam now") }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun QuestionGrid(s: Session, chosen: List<Question>, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        title = { Text("Questions") },
        text = {
            Column {
                Text(if (s.finished || !s.exam) "Blue ✓ correct · red ✗ wrong · filled answered · ⚑ flagged"
                     else "Filled = answered · ⚑ = flagged. Tap a number to go there.", style = MaterialTheme.typography.bodySmall)
                LazyVerticalGrid(GridCells.Adaptive(52.dp), Modifier.heightIn(max = 420.dp).padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    itemsIndexed(chosen) { i, q ->
                        val scheme = MaterialTheme.colorScheme
                        val mark = s.mark(q)
                        val (bg, fg) = when (mark) {
                            Mark.CORRECT -> correctContainer() to correctColor()
                            Mark.WRONG -> scheme.errorContainer to scheme.error
                            Mark.ANSWERED -> scheme.primary to scheme.onPrimary
                            Mark.OPEN -> scheme.surfaceContainerHigh to scheme.onSurface
                        }
                        val label = when (mark) { Mark.CORRECT -> "✓"; Mark.WRONG -> "✗"; else -> "" }
                        Surface(shape = RoundedCornerShape(12.dp), color = bg, contentColor = fg,
                            border = if (i == s.index) BorderStroke(2.dp, scheme.secondary) else null,
                            modifier = Modifier.height(48.dp).clickable { onPick(i) }) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("${i + 1}$label${if (q.id in s.flagged) "⚑" else ""}", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        })
}

@Composable
private fun Results(s: Session, chosen: List<Question>, onOpen: (Int) -> Unit, onDone: () -> Unit) {
    val result = remember(s.token, s.finishedAt) { summarize(s, chosen, if (s.finishedAt > 0) s.finishedAt else System.currentTimeMillis()) }
    var wrongOnly by rememberSaveable(s.token) { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${result.percent}%", style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold)
                Text("${result.correct} of ${result.outOf} correct", style = MaterialTheme.typography.titleMedium)
                Text(buildString {
                    if (result.durationMs > 0) append("Time ${formatDuration(result.durationMs)}")
                    if (!s.exam && result.answered < result.total) append(" · ${result.total - result.answered} skipped (not counted)")
                    if (s.exam && result.answered < result.total) append(" · ${result.total - result.answered} unanswered")
                }, style = MaterialTheme.typography.bodySmall)
            }
        }
        if (result.sections.size > 1) {
            SectionHeader("By section")
            result.sections.forEach { ProgressRow(it.section, "${it.correct}/${it.total}", if (it.total == 0) 0f else it.correct.toFloat() / it.total) }
        }
        SectionHeader("Review answers") {
            FilterChip(selected = wrongOnly, onClick = { wrongOnly = !wrongOnly }, label = { Text("Wrong only") })
        }
        chosen.forEachIndexed { i, q ->
            val picked = s.responses[q.id]
            val ok = picked == q.answer
            if (wrongOnly && ok) return@forEachIndexed
            ListItem(
                modifier = Modifier.clickable { onOpen(i) },
                leadingContent = { Box(Modifier.width(24.dp), contentAlignment = Alignment.Center) {
                    Text(if (ok) "✓" else "✗", style = MaterialTheme.typography.titleLarge, color = if (ok) correctColor() else MaterialTheme.colorScheme.error) } },
                headlineContent = { Text("${i + 1}. ${q.text}", maxLines = 2, overflow = TextOverflow.Ellipsis) },
                supportingContent = { Text(if (picked == null) "Not answered · answer ${q.answer}" else if (ok) "You chose $picked" else "You chose $picked · answer ${q.answer}") }
            )
        }
        Button(onClick = onDone, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Done") }
        Spacer(Modifier.height(24.dp))
    }
}
