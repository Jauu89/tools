package com.jauu.claudewatch

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Cliente mínimo de la Messages API con historial de conversación. */
class Claude(private val apiKey: String, private val model: String = "claude-sonnet-5-5") {
    private val http = OkHttpClient.Builder().readTimeout(60, TimeUnit.SECONDS).build()
    private val history = JSONArray()

    private val system = "Respondes por voz a través de un reloj. Sé muy breve (1-3 frases), " +
        "en español, sin markdown, listas ni emojis."

    fun ask(text: String): String {
        history.put(JSONObject().put("role", "user").put("content", text))
        val body = JSONObject()
            .put("model", model)
            .put("max_tokens", 400)
            .put("system", system)
            .put("messages", history)
            .toString()
            .toRequestBody("application/json".toMediaType())
        val req = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .post(body).build()
        http.newCall(req).execute().use { r ->
            val raw = r.body?.string().orEmpty()
            if (!r.isSuccessful) {
                history.remove(history.length() - 1)
                error("API ${r.code}: $raw")
            }
            val content = JSONObject(raw).getJSONArray("content")
            val sb = StringBuilder()
            for (i in 0 until content.length()) {
                val b = content.getJSONObject(i)
                if (b.optString("type") == "text") sb.append(b.getString("text"))
            }
            val answer = sb.toString().trim()
            history.put(JSONObject().put("role", "assistant").put("content", answer))
            return answer
        }
    }

    fun reset() { while (history.length() > 0) history.remove(0) }
}
