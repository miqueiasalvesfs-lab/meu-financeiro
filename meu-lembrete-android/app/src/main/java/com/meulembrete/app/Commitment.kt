package com.meulembrete.app

data class Commitment(
    val id: Long,
    val title: String,
    val category: String,
    val date: String,
    val time: String = "",
    val notes: String = "",
    val completed: Boolean = false
)
