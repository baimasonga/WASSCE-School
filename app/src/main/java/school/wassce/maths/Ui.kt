@file:OptIn(ExperimentalMaterial3Api::class)

package school.wassce.maths

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Color(0xFF14665D), onPrimary = Color.White, primaryContainer = Color(0xFFB4EDE2), onPrimaryContainer = Color(0xFF00201C),
    secondary = Color(0xFF97601D), onSecondary = Color.White, secondaryContainer = Color(0xFFFFDDBA), onSecondaryContainer = Color(0xFF2E1500),
    tertiary = Color(0xFF1249A6), onTertiary = Color.White, tertiaryContainer = Color(0xFFDAE2FF), onTertiaryContainer = Color(0xFF001946),
    background = Color(0xFFF7FAF8), surface = Color(0xFFF7FAF8), surfaceVariant = Color(0xFFDDE5E2),
    surfaceContainerLow = Color(0xFFF0F5F3), surfaceContainer = Color(0xFFEAF0ED), surfaceContainerHigh = Color(0xFFE4EAE7)
)
private val DarkColors = darkColorScheme(
    primary = Color(0xFF8AD5C7), onPrimary = Color(0xFF003731), primaryContainer = Color(0xFF005047), onPrimaryContainer = Color(0xFFB4EDE2),
    secondary = Color(0xFFF7BB7A), onSecondary = Color(0xFF4B2800), secondaryContainer = Color(0xFF6B3C00), onSecondaryContainer = Color(0xFFFFDDBA),
    tertiary = Color(0xFFB1C5FF), onTertiary = Color(0xFF002C71), tertiaryContainer = Color(0xFF00419E), onTertiaryContainer = Color(0xFFDAE2FF)
)

@Composable
fun SchoolTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors, content = content)
}

/** Correct answers use the blue tertiary colour, wrong ones the error colour; text labels always say which. */
@Composable fun correctColor() = MaterialTheme.colorScheme.tertiary
@Composable fun correctContainer() = MaterialTheme.colorScheme.tertiaryContainer

@Composable
fun SectionHeader(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(top = 20.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        action?.invoke()
    }
}

@Composable
fun StatTile(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
        }
    }
}

@Composable
fun ActionCard(title: String, subtitle: String, icon: ImageVector, modifier: Modifier = Modifier, enabled: Boolean = true,
               emphasized: Boolean = false, onClick: () -> Unit) {
    val container = if (emphasized) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
    val content = if (emphasized) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
    Card(onClick = onClick, enabled = enabled, modifier = modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = container, contentColor = content,
            disabledContainerColor = MaterialTheme.colorScheme.surfaceContainerLow, disabledContentColor = content.copy(alpha = 0.45f))) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(28.dp))
            Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Filled.KeyboardArrowRight, contentDescription = null)
        }
    }
}

/** A labelled dropdown that shows its current value. */
@Composable
fun ChoiceField(label: String, values: List<String>, selected: String, modifier: Modifier = Modifier, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box(modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        OutlinedCard(onClick = { open = true }, modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(selected, style = MaterialTheme.typography.bodyLarge)
                }
                Icon(Icons.Filled.ArrowDropDown, contentDescription = "Change $label")
            }
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            values.forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { onSelect(value); open = false }) }
        }
    }
}

/** One answer option. Feedback adds a text label so colour is never the only signal. */
@Composable
fun OptionCard(key: String, text: String, feedback: AnswerFeedback, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val scheme = MaterialTheme.colorScheme
    val (border, container, badge) = when {
        feedback == AnswerFeedback.CORRECT -> Triple(correctColor(), correctContainer(), "✓ Correct")
        feedback == AnswerFeedback.INCORRECT -> Triple(scheme.error, scheme.errorContainer, "✗ Your answer")
        selected -> Triple(scheme.primary, scheme.primaryContainer, "Selected")
        else -> Triple(scheme.outlineVariant, scheme.surface, null)
    }
    Surface(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            .selectable(selected = selected, enabled = enabled, role = Role.RadioButton, onClick = onClick),
        shape = RoundedCornerShape(14.dp), color = container,
        border = BorderStroke(if (border == scheme.outlineVariant) 1.dp else 2.dp, border)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(50), color = if (border == scheme.outlineVariant) scheme.surfaceVariant else border,
                contentColor = if (border == scheme.outlineVariant) scheme.onSurfaceVariant else scheme.surface, modifier = Modifier.size(32.dp)) {
                Box(contentAlignment = Alignment.Center) { Text(key, fontWeight = FontWeight.Bold) }
            }
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(text, style = MaterialTheme.typography.bodyLarge)
                if (badge != null) Text(badge, style = MaterialTheme.typography.labelMedium, color = border, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun ProgressRow(title: String, detail: String, fraction: Float, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Column(modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(detail, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        LinearProgressIndicator(progress = { fraction.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(6.dp),
            trackColor = MaterialTheme.colorScheme.surfaceContainerHigh, drawStopIndicator = {})
    }
}

fun percent(part: Int, whole: Int): String = if (whole == 0) "—" else "${(part * 100 + whole / 2) / whole}%"

fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val h = totalSeconds / 3600; val m = (totalSeconds % 3600) / 60; val s = totalSeconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}
