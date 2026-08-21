package com.meulembrete.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class MainActivity extends Activity {
    private static final int GREEN = Color.rgb(22, 138, 85);
    private static final int BG = Color.rgb(245, 248, 246);
    private static final int SURFACE = Color.WHITE;
    private static final int SOFT_GREEN = Color.rgb(232, 245, 238);
    private static final int TEXT = Color.rgb(31, 41, 36);
    private static final int MUTED = Color.rgb(94, 109, 101);
    private static final String[] CATEGORIES = {"💼 Trabalho", "❤️ Saúde", "💰 Financeiro", "🏠 Pessoal", "👨‍👩‍👧 Família", "🎉 Evento", "📚 Estudos", "📌 Outro"};

    private ReminderStore store;
    private List<Commitment> commitments = new ArrayList<>();
    private LinearLayout listContainer;
    private TextView dailySummary, todayStat, weekStat, activeStat;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new ReminderStore(this);
        ReminderScheduler.scheduleDaily(this);
        requestNotificationPermission();
        buildUi();
        refresh();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }
    }

    private void buildUi() {
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(16), dp(18), dp(16), dp(22));
        scroll.addView(content, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        content.addView(text("Meu Lembrete", 24, TEXT, Typeface.BOLD));
        content.addView(text("Seus compromissos sem complicação", 14, MUTED, Typeface.NORMAL), withTop(dp(2)));

        LinearLayout header = panel(SOFT_GREEN, 26);
        header.setPadding(dp(18), dp(18), dp(18), dp(18));
        LinearLayout.LayoutParams hp = matchWrap(); hp.topMargin = dp(18); content.addView(header, hp);
        header.addView(text("🔔  RESUMO DIÁRIO", 13, GREEN, Typeface.BOLD));
        dailySummary = text("", 18, TEXT, Typeface.BOLD); header.addView(dailySummary, withTop(dp(9)));
        header.addView(text("Todos os dias o app informa o compromisso, a categoria e quantos dias faltam.", 14, MUTED, Typeface.NORMAL), withTop(dp(8)));

        LinearLayout stats = new LinearLayout(this); stats.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams sp = matchWrap(); sp.topMargin = dp(12); content.addView(stats, sp);
        todayStat = addStat(stats, "Hoje"); weekStat = addStat(stats, "7 dias"); activeStat = addStat(stats, "Ativos");

        Button test = primaryButton("🔔  Testar notificação agora", true);
        test.setOnClickListener(v -> testNotification());
        LinearLayout.LayoutParams tp = matchWrap(); tp.topMargin = dp(14); content.addView(test, tp);

        LinearLayout.LayoutParams stp = wrapWrap(); stp.topMargin = dp(24);
        content.addView(text("Próximos compromissos", 20, TEXT, Typeface.BOLD), stp);
        content.addView(text("Os mais próximos aparecem primeiro", 14, MUTED, Typeface.NORMAL), withTop(dp(3)));
        listContainer = new LinearLayout(this); listContainer.setOrientation(LinearLayout.VERTICAL); content.addView(listContainer, withTop(dp(10)));

        Button add = primaryButton("＋  Adicionar compromisso", false); add.setOnClickListener(v -> showAddDialog());
        LinearLayout.LayoutParams ap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)); ap.setMargins(dp(16), dp(10), dp(16), dp(16)); root.addView(add, ap);
        setContentView(root);
    }

    private TextView addStat(LinearLayout parent, String label) {
        LinearLayout box = panel(SURFACE, 20); box.setGravity(Gravity.CENTER_HORIZONTAL); box.setPadding(dp(8), dp(12), dp(8), dp(12));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f); p.setMargins(dp(3), 0, dp(3), 0); parent.addView(box, p);
        TextView value = text("0", 23, TEXT, Typeface.BOLD); value.setGravity(Gravity.CENTER); box.addView(value);
        TextView lbl = text(label, 12, MUTED, Typeface.NORMAL); lbl.setGravity(Gravity.CENTER); box.addView(lbl, withTop(dp(2))); return value;
    }

    private void refresh() {
        commitments = store.getAll(); commitments.sort(Comparator.comparing(c -> c.date == null ? "" : c.date));
        LocalDate today = LocalDate.now(); int active = 0, todayCount = 0, weekCount = 0; Commitment nearest = null; long nearestDays = Long.MAX_VALUE;
        for (Commitment item : commitments) {
            if (item.completed) continue; active++; Long days = daysUntil(item.date, today); if (days == null) continue;
            if (days == 0) todayCount++; if (days >= 0 && days <= 7) weekCount++;
            if (days >= 0 && days < nearestDays) { nearestDays = days; nearest = item; }
        }
        todayStat.setText(String.valueOf(todayCount)); weekStat.setText(String.valueOf(weekCount)); activeStat.setText(String.valueOf(active));
        dailySummary.setText(nearest == null ? "Nenhum compromisso futuro pendente." : nearest.category + "  " + nearest.title + " • " + remaining(nearestDays));
        listContainer.removeAllViews();
        if (commitments.isEmpty()) {
            LinearLayout empty = panel(SURFACE, 22); empty.setPadding(dp(18), dp(20), dp(18), dp(20));
            empty.addView(text("Você ainda não cadastrou compromissos.", 16, TEXT, Typeface.BOLD));
            empty.addView(text("Toque em “Adicionar compromisso” para começar.", 14, MUTED, Typeface.NORMAL), withTop(dp(6))); listContainer.addView(empty, matchWrap()); return;
        }
        for (Commitment item : commitments) listContainer.addView(commitmentCard(item), cardParams());
    }

    private View commitmentCard(Commitment item) {
        LinearLayout card = panel(SURFACE, 22); card.setPadding(dp(16), dp(16), dp(16), dp(14));
        LinearLayout top = new LinearLayout(this); top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.TOP); card.addView(top, matchWrap());
        LinearLayout left = new LinearLayout(this); left.setOrientation(LinearLayout.VERTICAL); top.addView(left, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        left.addView(text(item.category, 13, GREEN, Typeface.BOLD));
        TextView title = text(item.title, 18, TEXT, Typeface.BOLD); if (item.completed) title.setAlpha(0.5f); left.addView(title, withTop(dp(3)));
        String when = formatDate(item.date) + (item.time == null || item.time.trim().isEmpty() ? "" : " • " + item.time.trim()); left.addView(text(when, 13, MUTED, Typeface.NORMAL), withTop(dp(3)));
        Long days = daysUntil(item.date, LocalDate.now()); String badgeText = item.completed ? "Concluído" : (days == null ? "Data" : remaining(days));
        TextView badge = text(badgeText, 12, item.completed ? MUTED : GREEN, Typeface.BOLD); badge.setGravity(Gravity.CENTER); badge.setPadding(dp(10), dp(7), dp(10), dp(7)); badge.setBackground(round(SOFT_GREEN, 50));
        LinearLayout.LayoutParams bp = wrapWrap(); bp.leftMargin = dp(8); top.addView(badge, bp);
        if (item.notes != null && !item.notes.trim().isEmpty()) card.addView(text(item.notes.trim(), 14, MUTED, Typeface.NORMAL), withTop(dp(11)));
        LinearLayout actions = new LinearLayout(this); actions.setOrientation(LinearLayout.HORIZONTAL); LinearLayout.LayoutParams acp = matchWrap(); acp.topMargin = dp(12); card.addView(actions, acp);
        Button toggle = secondaryButton(item.completed ? "Reabrir" : "✓ Concluir"); toggle.setOnClickListener(v -> { item.completed = !item.completed; store.saveAll(commitments); refresh(); }); actions.addView(toggle, new LinearLayout.LayoutParams(0, dp(44), 1f));
        Button delete = secondaryButton("Excluir"); delete.setTextColor(Color.rgb(166, 48, 48)); delete.setOnClickListener(v -> { commitments.removeIf(c -> c.id == item.id); store.saveAll(commitments); refresh(); });
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(0, this.dp(44), 1f); dp.leftMargin = this.dp(8); actions.addView(delete, dp); return card;
    }

    private void testNotification() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) { requestNotificationPermission(); Toast.makeText(this, "Permita as notificações e toque novamente para testar.", Toast.LENGTH_LONG).show(); return; }
        boolean hasActive = false; for (Commitment c : commitments) if (!c.completed) { hasActive = true; break; }
        if (!hasActive) { Toast.makeText(this, "Cadastre um compromisso primeiro para testar o aviso.", Toast.LENGTH_LONG).show(); return; }
        ReminderScheduler.testNow(this); Toast.makeText(this, "Notificação de teste enviada.", Toast.LENGTH_SHORT).show();
    }

    private void showAddDialog() {
        LinearLayout form = new LinearLayout(this); form.setOrientation(LinearLayout.VERTICAL); form.setPadding(dp(22), dp(8), dp(22), dp(4));
        EditText title = new EditText(this); title.setHint("Nome do compromisso"); title.setSingleLine(true); form.addView(title, matchWrap());
        Spinner category = new Spinner(this); category.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, CATEGORIES)); form.addView(category, withTop(dp(10)));
        final LocalDate[] selectedDate = {LocalDate.now().plusDays(1)};
        Button dateButton = secondaryButton("Data: " + formatDate(selectedDate[0].toString()));
        dateButton.setOnClickListener(v -> { LocalDate current = selectedDate[0]; new DatePickerDialog(this, (view, year, month, day) -> { selectedDate[0] = LocalDate.of(year, month + 1, day); dateButton.setText("Data: " + formatDate(selectedDate[0].toString())); }, current.getYear(), current.getMonthValue() - 1, current.getDayOfMonth()).show(); });
        LinearLayout.LayoutParams dateParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50)); dateParams.topMargin = dp(10); form.addView(dateButton, dateParams);
        EditText time = new EditText(this); time.setHint("Horário opcional (ex.: 14:30)"); time.setSingleLine(true); form.addView(time, withTop(dp(8)));
        EditText notes = new EditText(this); notes.setHint("Observações: documentos, endereço, detalhes..."); notes.setMinLines(2); form.addView(notes, withTop(dp(8)));
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Novo compromisso").setView(form).setNegativeButton("Cancelar", null).setPositiveButton("Salvar", null).create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = title.getText().toString().trim(); if (name.isEmpty()) { title.setError("Informe o nome do compromisso"); return; }
            commitments.add(new Commitment(System.currentTimeMillis(), name, category.getSelectedItem().toString(), selectedDate[0].toString(), time.getText().toString().trim(), notes.getText().toString().trim(), false));
            store.saveAll(commitments); ReminderScheduler.scheduleDaily(this); dialog.dismiss(); refresh(); Toast.makeText(this, "Compromisso salvo.", Toast.LENGTH_SHORT).show();
        })); dialog.show();
    }

    private Long daysUntil(String isoDate, LocalDate today) { try { return ChronoUnit.DAYS.between(today, LocalDate.parse(isoDate)); } catch (Exception e) { return null; } }
    private String remaining(long days) { if (days < 0) return "atrasado há " + Math.abs(days) + (Math.abs(days) == 1 ? " dia" : " dias"); if (days == 0) return "é hoje"; if (days == 1) return "falta 1 dia"; return "faltam " + days + " dias"; }
    private String formatDate(String iso) { try { return LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")); } catch (Exception e) { return iso; } }
    private LinearLayout panel(int color, int radiusDp) { LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setBackground(round(color, radiusDp)); return layout; }
    private GradientDrawable round(int color, int radiusDp) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radiusDp)); return d; }
    private TextView text(String value, float size, int color, int style) { TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setTypeface(Typeface.create(Typeface.DEFAULT, style)); t.setLineSpacing(0, 1.08f); return t; }
    private Button primaryButton(String label, boolean soft) { Button b = new Button(this); b.setText(label); b.setTextSize(15); b.setTypeface(Typeface.DEFAULT, Typeface.BOLD); b.setAllCaps(false); b.setTextColor(soft ? GREEN : Color.WHITE); b.setBackground(round(soft ? SOFT_GREEN : GREEN, 18)); return b; }
    private Button secondaryButton(String label) { Button b = new Button(this); b.setText(label); b.setTextSize(14); b.setAllCaps(false); b.setTextColor(GREEN); GradientDrawable d = round(Color.WHITE, 15); d.setStroke(dp(1), Color.rgb(220, 228, 223)); b.setBackground(d); return b; }
    private LinearLayout.LayoutParams matchWrap() { return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); }
    private LinearLayout.LayoutParams wrapWrap() { return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT); }
    private LinearLayout.LayoutParams withTop(int top) { LinearLayout.LayoutParams p = matchWrap(); p.topMargin = top; return p; }
    private LinearLayout.LayoutParams cardParams() { LinearLayout.LayoutParams p = matchWrap(); p.bottomMargin = dp(10); return p; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
