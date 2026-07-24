package com.ratestack.app

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
import androidx.core.net.toUri
import java.util.concurrent.atomic.AtomicInteger

internal object NotificationHelper {
    const val EXTRA_NOTIFICATION_URL = "com.ratestack.app.extra.NOTIFICATION_URL"
    const val DATA_KEY_URL = "url"
    const val DATA_KEY_LINK = "link"
    const val DATA_KEY_DEEP_LINK = "deeplink"
    const val CHANNEL_RATE_ALERTS = "rate_alerts"
    const val CHANNEL_GENERAL_UPDATES = "general_updates"

    private val nextNotificationId = AtomicInteger(1000)

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val manager = context.getSystemService(NotificationManager::class.java)
        val rateAlerts = NotificationChannel(
            CHANNEL_RATE_ALERTS,
            context.getString(R.string.notification_channel_rate_alerts),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(R.string.notification_channel_rate_alerts_description)
        }
        val generalUpdates = NotificationChannel(
            CHANNEL_GENERAL_UPDATES,
            context.getString(R.string.notification_channel_general),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(R.string.notification_channel_general_description)
        }
        manager.createNotificationChannels(listOf(rateAlerts, generalUpdates))
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        url: String?,
        channelId: String,
    ) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val notificationId = nextNotificationId.incrementAndGet()
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(context, R.color.gold_primary))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(createContentIntent(context, url, notificationId))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        runCatching {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        }
    }

    private fun createContentIntent(
        context: Context,
        url: String?,
        requestCode: Int,
    ): PendingIntent {
        val router = NotificationLinkRouter(UrlPolicy(BuildConfig.TRUSTED_HOST))
        val intent = when (router.resolve(url)) {
            NotificationLinkTarget.INTERNAL -> Intent(context, MainActivity::class.java).apply {
                putExtra(EXTRA_NOTIFICATION_URL, url)
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            NotificationLinkTarget.EXTERNAL_HTTPS -> Intent(
                Intent.ACTION_VIEW,
                requireNotNull(url).toUri(),
            ).apply {
                addCategory(Intent.CATEGORY_BROWSABLE)
            }
            NotificationLinkTarget.HOME -> Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
        }

        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
