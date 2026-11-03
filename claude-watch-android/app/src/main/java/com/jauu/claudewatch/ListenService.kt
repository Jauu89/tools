package com.jauu.claudewatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.view.KeyEvent
import androidx.core.app.NotificationCompat
import java.util.Locale
import kotlin.concurrent.thread

/**
 * Servicio en primer plano. Mantiene una MediaSession activa para recibir los botones
 * play/pause del reloj (control de música). Al pulsarlos: escucha -> Claude -> notificación
 * (se refleja en el reloj) + lectura en voz alta.
 */
class ListenService : Service(), TextToSpeech.OnInitListener {
    private lateinit var session: MediaSessionCompat
    private lateinit var tts: TextToSpeech
    private var ttsReady = false
    private var recognizer: SpeechRecognizer? = null
    private var silence: AudioTrack? = null
    private var claude: Claude? = null
    private var busy = false
    private val main = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        createChannels()
        val n = notif("Listo: pulsa play/pause en el reloj", CH_STATUS)
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else startForeground(1, n)

        tts = TextToSpeech(this, this)
        session = MediaSessionCompat(this, "ClaudeWatch").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() = trigger()
                override fun onPause() = trigger()
                override fun onSkipToNext() = trigger()
                override fun onMediaButtonEvent(i: Intent): Boolean {
                    val ev = if (Build.VERSION.SDK_INT >= 33)
                        i.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
                    else @Suppress("DEPRECATION") i.getParcelableExtra(Intent.EXTRA_KEY_EVENT)
                    if (ev?.action == KeyEvent.ACTION_DOWN) when (ev.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE,
                        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK -> {
                            trigger(); return true
                        }
                    }
                    return super.onMediaButtonEvent(i)
                }
            })
            setPlaybackState(PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_SKIP_TO_NEXT)
                .setState(PlaybackStateCompat.STATE_PLAYING, 0, 1f).build())
            isActive = true
        }
        startSilence()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale("es", "ES")
            ttsReady = true
        }
    }

    /** Un track silencioso en bucle hace que Android nos considere la sesión multimedia activa. */
    private fun startSilence() {
        val fmt = AudioFormat.Builder().setSampleRate(8000)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build()
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
        val buf = ByteArray(16000)
        silence = AudioTrack(attrs, fmt, buf.size, AudioTrack.MODE_STATIC, 0).apply {
            write(buf, 0, buf.size)
            setLoopPoints(0, buf.size / 2, -1)
            setVolume(0f)
            play()
        }
    }

    private fun trigger() = main.post {
        if (busy) return@post
        val key = getSharedPreferences("cfg", MODE_PRIVATE).getString("key", "").orEmpty()
        if (key.isBlank()) { say("Falta la API key de Claude en la app."); return@post }
        if (claude == null) claude = Claude(key)
        busy = true
        listen()
    }

    private fun listen() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            say("Este móvil no tiene reconocimiento de voz."); busy = false; return
        }
        tts.stop()
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onResults(r: Bundle) {
                    val t = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (t.isNullOrBlank()) { busy = false; return }
                    notify("Tú: $t", CH_REPLY)
                    ask(t)
                }
                override fun onError(e: Int) { busy = false; say("No te he oído.") }
                override fun onReadyForSpeech(p: Bundle?) { notify("Escuchando…", CH_STATUS) }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(v: Float) {}
                override fun onBufferReceived(b: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onPartialResults(p: Bundle?) {}
                override fun onEvent(t: Int, p: Bundle?) {}
            })
            startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES")
            })
        }
    }

    private fun ask(text: String) = thread {
        val answer = try { claude!!.ask(text) } catch (e: Exception) { "Error: ${e.message?.take(120)}" }
        main.post { busy = false; say(answer) }
    }

    /** Muestra la respuesta como notificación (llega al reloj) y la lee en voz alta. */
    private fun say(text: String) {
        notify(text, CH_REPLY)
        if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "reply")
    }

    private fun notify(text: String, ch: String) =
        getSystemService(NotificationManager::class.java).notify(if (ch == CH_REPLY) 2 else 1, notif(text, ch))

    private fun notif(text: String, ch: String): Notification =
        NotificationCompat.Builder(this, ch)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Claude")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(if (ch == CH_REPLY) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(false)
            .build()

    private fun createChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH_STATUS, "Estado", NotificationManager.IMPORTANCE_LOW))
        nm.createNotificationChannel(NotificationChannel(CH_REPLY, "Respuestas de Claude", NotificationManager.IMPORTANCE_HIGH))
    }

    override fun onDestroy() {
        recognizer?.destroy(); tts.shutdown(); silence?.release(); session.release()
        super.onDestroy()
    }

    override fun onBind(i: Intent?): IBinder? = null

    companion object {
        const val CH_STATUS = "status"
        const val CH_REPLY = "reply"
        fun start(c: Context) {
            val i = Intent(c, ListenService::class.java)
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i) else c.startService(i)
        }
        fun stop(c: Context) { c.stopService(Intent(c, ListenService::class.java)) }
    }
}
