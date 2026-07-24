package com.ratestack.app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class RateStackMessagingService : FirebaseMessagingService() {
    @Suppress("DEPRECATION")
    @Deprecated("FCM invokes this callback; RateStack does not persist registration tokens.")
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Tokens are intentionally not logged, persisted, or sent to a server.
        // Set a debugger breakpoint here when testing Firebase setup locally.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.notification_default_title)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: getString(R.string.notification_default_body)
        val url = message.data[NotificationHelper.DATA_KEY_URL]
            ?: message.data[NotificationHelper.DATA_KEY_LINK]
            ?: message.data[NotificationHelper.DATA_KEY_DEEP_LINK]
        val channel = if (message.data["channel"] == NotificationHelper.CHANNEL_GENERAL_UPDATES) {
            NotificationHelper.CHANNEL_GENERAL_UPDATES
        } else {
            NotificationHelper.CHANNEL_RATE_ALERTS
        }

        NotificationHelper.showNotification(
            context = this,
            title = title,
            body = body,
            url = url,
            channelId = channel,
        )
    }

}
