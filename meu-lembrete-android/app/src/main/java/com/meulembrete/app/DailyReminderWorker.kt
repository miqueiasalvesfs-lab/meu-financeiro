package com.meulembrete.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class DailyReminderWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        createChannel()
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) return Result.success()

        val today = LocalDate.now()
        val items = CommitmentRepository(applicationContext).getAll()
            .filter { !it.completed }
            .mapNotNull { item ->
                runCatching {
                    val days = ChronoUnit.DAYS.between(today, LocalDate.parse(item.date))
                    item to days
                }.getOrNull()
            }
            .filter { it.second >= 0 }
            .sortedBy { it.second }

        if (items.isEmpty()) return Result.success()

        val intent = Intent(applicationContext, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            applicationContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val style = NotificationCompat.InboxStyle()
            .setBigContentTitle("Seus próximos compromissos")

        items.take(6).forEach { (item, days) ->
            val remaining = when (days) {
                0L -> "é hoje"
                1L -> "falta 1 dia"
                else -> "faltam $days dias"
            }
            style.addLine("${item.category} • ${item.title} • $remaining")
        }
        if (items.size > 6) style.setSummaryText("+${items.size - 6} compromissos")

        val nearest = items.first()
        val nearestText = when (nearest.second) {
            0L -> "${nearest.first.title} é hoje"
            1L -> "${nearest.first.title}: falta 1 dia"
            else -> "${nearest.first.title}: faltam ${nearest.second} dias"
        }

        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Meu Lembrete")
            .setContentText("${nearest.first.category} • $nearestText")
            .setStyle(style)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        NotificationManagerCompat.from(applicationContext).notify(DAILY_NOTIFICATION_ID, notification)
        return Result.success()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Lembretes diários",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Resumo diário de compromissos e dias restantes"
            }
            applicationContext.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "daily_reminders"
        const val DAILY_NOTIFICATION_ID = 1101
    }
}
