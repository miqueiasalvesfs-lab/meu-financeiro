package com.meulembrete.app;

public class Commitment {
    public long id;
    public String title;
    public String category;
    public String date;
    public String time;
    public String notes;
    public boolean completed;

    public Commitment(long id, String title, String category, String date, String time, String notes, boolean completed) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.date = date;
        this.time = time;
        this.notes = notes;
        this.completed = completed;
    }
}
