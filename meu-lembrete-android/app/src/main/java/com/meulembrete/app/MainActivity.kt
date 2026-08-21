package com.meulembrete.app

import android.Manifest
import android.app.DatePickerDialog
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ReminderScheduler.schedule(this)
        setContent { MeuLembreteApp() }
    }
}

private val categories = listOf(
    "💼 Trabalho", "❤️ Saúde", "💰 Financeiro", "🏠 Pessoal",
    "👨‍👩‍👧 Família", "🎉 Evento", "📚 Estudos", "📌 Outro"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeuLembreteApp() {
    val context = LocalContext.current
    val repository = remember { CommitmentRepository(context) }
    var commitments by remember { mutableStateOf(repository.getAll()) }
    var showAdd by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = androidx.compose.ui.graphics.Color(0xFF168A55),
            secondary = androidx.compose.ui.graphics.Color(0xFF3F765B),
            surface = androidx.compose.ui.graphics.Color(0xFFF9FCFA),
            background = androidx.compose.ui.graphics.Color(0xFFF5F8F6)
        )
    ) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            floatingActionButton = {
                FloatingActionButton(onClick = { showAdd = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Adicionar compromisso")
                }
            }
        ) { padding ->
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp, 18.dp, 16.dp, 100.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { HeaderCard(commitments) }
                item { SummaryCards(commitments) }
                item {
                    FilledTonalButton(
                        onClick = { ReminderScheduler.testNow(context) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Testar notificação agora")
                    }
                }
                item {
                    Text("Próximos compromissos", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text("Os mais próximos aparecem primeiro", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                val ordered = commitments.sortedBy { it.date }
                if (ordered.isEmpty()) {
                    item {
                        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp)) {
                            Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.primary)
                                Text("Nenhum compromisso cadastrado", fontWeight = FontWeight.SemiBold)
                                Text("Toque no + para adicionar o primeiro lembrete.")
                            }
                        }
                    }
                } else {
                    items(ordered, key = { it.id }) { item ->
                        CommitmentCard(
                            item = item,
                            onToggle = {
                                commitments = commitments.map { if (it.id == item.id) it.copy(completed = !it.completed) else it }
                                repository.saveAll(commitments)
                            },
                            onDelete = {
                                commitments = commitments.filterNot { it.id == item.id }
                                repository.saveAll(commitments)
                            }
                        )
                    }
                }
            }
        }

        if (showAdd) {
            AddCommitmentDialog(
                onDismiss = { showAdd = false },
                onSave = { newItem ->
                    commitments = commitments + newItem
                    repository.saveAll(commitments)
                    ReminderScheduler.schedule(context)
                    showAdd = false
                }
            )
        }
    }
}

@Composable
private fun HeaderCard(items: List<Commitment>) {
    val upcoming = items.filter { !it.completed }.mapNotNull { item ->
        runCatching { item to ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(item.date)) }.getOrNull()
    }.filter { it.second >= 0 }.minByOrNull { it.second }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.primary)
                Text("Resumo diário", fontWeight = FontWeight.SemiBold)
            }
            Text(
                upcoming?.let { (item, days) ->
                    when (days) {
                        0L -> "${item.category}  ${item.title} é hoje"
                        1L -> "${item.category}  ${item.title}: falta 1 dia"
                        else -> "${item.category}  ${item.title}: faltam $days dias"
                    }
                } ?: "Você não tem compromissos futuros pendentes.",
                style = MaterialTheme.typography.titleMedium
            )
            Text("O app prepara um aviso diário com nome, categoria e contagem regressiva.")
        }
    }
}

@Composable
private fun SummaryCards(items: List<Commitment>) {
    val active = items.filter { !it.completed }
    val today = LocalDate.now()
    fun countUntil(max: Long) = active.count {
        runCatching { ChronoUnit.DAYS.between(today, LocalDate.parse(it.date)) }.getOrNull()?.let { d -> d in 0..max } == true
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MiniStat("Hoje", countUntil(0), Modifier.weight(1f))
        MiniStat("7 dias", countUntil(7), Modifier.weight(1f))
        MiniStat("Ativos", active.size, Modifier.weight(1f))
    }
}

@Composable
private fun MiniStat(label: String, value: Int, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value.toString(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun CommitmentCard(item: Commitment, onToggle: () -> Unit, onDelete: () -> Unit) {
    val days = runCatching { ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(item.date)) }.getOrNull()
    val countdown = when {
        item.completed -> "Concluído"
        days == null -> "Data inválida"
        days < 0 -> "Atrasado"
        days == 0L -> "É hoje"
        days == 1L -> "Falta 1 dia"
        else -> "Faltam $days dias"
    }

    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(item.category, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    val formatted = runCatching { LocalDate.parse(item.date).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) }.getOrDefault(item.date)
                    Text("$formatted${if (item.time.isNotBlank()) " • ${item.time}" else ""}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.primaryContainer) {
                    Text(countdown, Modifier.padding(horizontal = 12.dp, vertical = 7.dp), fontWeight = FontWeight.Medium)
                }
            }
            if (item.notes.isNotBlank()) Text(item.notes, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onToggle) {
                    Icon(Icons.Default.Check, null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (item.completed) "Reabrir" else "Concluir")
                }
                TextButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, null)
                    Spacer(Modifier.width(4.dp))
                    Text("Excluir")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddCommitmentDialog(onDismiss: () -> Unit, onSave: (Commitment) -> Unit) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(categories.first()) }
    var date by remember { mutableStateOf(LocalDate.now().plusDays(1).toString()) }
    var time by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Novo compromisso") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Nome do compromisso") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Categoria") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        categories.forEach { option ->
                            DropdownMenuItem(text = { Text(option) }, onClick = { category = option; expanded = false })
                        }
                    }
                }
                OutlinedButton(
                    onClick = {
                        val current = LocalDate.parse(date)
                        DatePickerDialog(
                            context,
                            { _, y, m, d -> date = LocalDate.of(y, m + 1, d).toString() },
                            current.year, current.monthValue - 1, current.dayOfMonth
                        ).show()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Data: ${LocalDate.parse(date).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))}") }
                OutlinedTextField(time, { time = it }, label = { Text("Horário (opcional, ex.: 14:30)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(notes, { notes = it }, label = { Text("Observações") }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(
                enabled = title.isNotBlank(),
                onClick = {
                    onSave(
                        Commitment(
                            id = System.currentTimeMillis(),
                            title = title.trim(),
                            category = category,
                            date = date,
                            time = time.trim(),
                            notes = notes.trim()
                        )
                    )
                }
            ) { Text("Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } }
    )
}
