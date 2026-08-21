package com.meulembrete.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class ReminderStore {
    private static final String PREFS = "meu_lembrete_data";
    private static final String KEY = "commitments";
    private final SharedPreferences prefs;

    public ReminderStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public List<Commitment> getAll() {
        List<Commitment> result = new ArrayList<>();
        String raw = prefs.getString(KEY, "[]");
        try {
            JSONArray array = new JSONArray(raw == null ? "[]" : raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject o = array.getJSONObject(i);
                result.add(new Commitment(
                    o.getLong("id"),
                    o.optString("title", "Compromisso"),
                    o.optString("category", "📌 Outro"),
                    o.optString("date", ""),
                    o.optString("time", ""),
                    o.optString("notes", ""),
                    o.optBoolean("completed", false)
                ));
            }
        } catch (Exception ignored) { }
        return result;
    }

    public void saveAll(List<Commitment> items) {
        JSONArray array = new JSONArray();
        for (Commitment item : items) {
            JSONObject o = new JSONObject();
            try {
                o.put("id", item.id);
                o.put("title", item.title);
                o.put("category", item.category);
                o.put("date", item.date);
                o.put("time", item.time);
                o.put("notes", item.notes);
                o.put("completed", item.completed);
                array.put(o);
            } catch (Exception ignored) { }
        }
        prefs.edit().putString(KEY, array.toString()).apply();
    }
}
