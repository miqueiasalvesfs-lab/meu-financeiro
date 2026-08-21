package com.meulembrete.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class DailyReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "daily_reminders";
    private static final int NOTIFICATION_ID = 1101;

    @Override
    public void onReceive(Context context, Intent intent) {
        showNotification(context);
    }

    public static void showNotification(Context context) {
        createChannel(context);
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        LocalDate today = LocalDate.now();
        List<Entry> upcoming = new ArrayList<>();
        for (Commitment item : new ReminderStore(context).getAll()) {
            if (item.completed || item.date == null || item.date.isEmpty()) continue;
            try {
                long days = ChronoUnit.DAYS.between(today, LocalDate.parse(item.date));
                if (days >= 0) upcoming.add(new Entry(item, days));
            } catch (Exception ignored) { }
        }
        upcoming.sort(Comparator.comparingLong(e -> e.days));
        if (upcoming.isEmpty()) return;

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Entry nearest = upcoming.get(0);
        String nearestText = nearest.item.category + " • " + nearest.item.title + " • " + remaining(nearest.days);

        Notification.InboxStyle inbox = new Notification.InboxStyle()
            .setBigContentTitle("Seus próximos compromissos");
        int limit = Math.min(6, upcoming.size());
        for (int i = 0; i < limit; i++) {
            Entry e = upcoming.get(i);
            inbox.addLine(e.item.category + " • " + e.item.title + " • " + remaining(e.days));
        }
        if (upcoming.size() > limit) {
            inbox.setSummaryText("+" + (upcoming.size() - limit) + " compromissos");
        }

        Notification notification = new Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Meu Lembrete")
            .setContentText(nearestText)
            .setStyle(inbox)
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .build();

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification);
    }

    private static String remaining(long days) {
        if (days == 0) return "é hoje";
        if (days == 1) return "falta 1 dia";
        return "faltam " + days + " dias";
    }

    private static void createChannel(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Lembretes diários",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Nome, categoria e quantos dias faltam para seus compromissos");
        manager.createNotificationChannel(channel);
    }

    private static class Entry {
        final Commitment item;
        final long days;
        Entry(Commitment item, long days) {
            this.item = item;
            this.days = days;
        }
    }
}
