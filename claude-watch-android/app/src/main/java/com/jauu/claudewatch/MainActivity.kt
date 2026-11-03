package com.jauu.claudewatch

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("cfg", MODE_PRIVATE)
        val pad = (16 * resources.displayMetrics.density).toInt()

        val key = EditText(this).apply {
            hint = "API key de Anthropic (sk-ant-…)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(prefs.getString("key", ""))
        }
        val start = Button(this).apply {
            text = "Activar escucha"
            setOnClickListener {
                prefs.edit().putString("key", key.text.toString().trim()).apply()
                val perms = mutableListOf(Manifest.permission.RECORD_AUDIO)
                if (Build.VERSION.SDK_INT >= 31) perms += Manifest.permission.BLUETOOTH_CONNECT
                if (Build.VERSION.SDK_INT >= 33) perms += Manifest.permission.POST_NOTIFICATIONS
                requestPermissions(perms.toTypedArray(), 1)
            }
        }
        val stop = Button(this).apply {
            text = "Desactivar"
            setOnClickListener { ListenService.stop(this@MainActivity) }
        }
        val help = TextView(this).apply {
            text = "1. Pega tu API key y pulsa «Activar escucha».\n" +
                "2. Conecta el reloj (app Mi Fitness / Xiaomi Wear) y abre el control de música.\n" +
                "3. Pulsa play/pause en el reloj: el móvil escucha, Claude responde y lo lee en voz alta; " +
                "la respuesta también llega como notificación al reloj.\n\n" +
                "Desactiva el ahorro de batería para esta app."
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            addView(key); addView(start); addView(stop); addView(help)
        })
    }

    override fun onRequestPermissionsResult(c: Int, p: Array<out String>, r: IntArray) {
        super.onRequestPermissionsResult(c, p, r)
        if (r.isNotEmpty() && r[0] == android.content.pm.PackageManager.PERMISSION_GRANTED)
            ListenService.start(this)
    }
}
