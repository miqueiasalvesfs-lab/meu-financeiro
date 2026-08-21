package com.meulembrete.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class CommitmentRepository(context: Context) {
    private val prefs = context.getSharedPreferences("commitments", Context.MODE_PRIVATE)

    fun getAll(): List<Commitment> {
        val raw = prefs.getString(KEY, "[]") ?: "[]"
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val o = array.getJSONObject(i)
                    add(
                        Commitment(
                            id = o.getLong("id"),
                            title = o.getString("title"),
                            category = o.getString("category"),
                            date = o.getString("date"),
                            time = o.optString("time"),
                            notes = o.optString("notes"),
                            completed = o.optBoolean("completed", false)
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    fun saveAll(items: List<Commitment>) {
        val array = JSONArray()
        items.forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id)
                put("title", item.title)
                put("category", item.category)
                put("date", item.date)
                put("time", item.time)
                put("notes", item.notes)
                put("completed", item.completed)
            })
        }
        prefs.edit().putString(KEY, array.toString()).apply()
    }

    companion object { private const val KEY = "items" }
}
