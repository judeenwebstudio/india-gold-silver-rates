package com.ratestack.app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class RateStackMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        FcmTokenSync.register(this, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.notification_default_title)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: getString(R.string.notification_default_body)
        val router = NotificationLinkRouter(UrlPolicy(BuildConfig.TRUSTED_HOST))
        val url = router.routeData(
            message.data[NotificationHelper.DATA_KEY_DESTINATION],
            message.data[NotificationHelper.DATA_KEY_ORDER_ID],
            message.data[NotificationHelper.DATA_KEY_TRACKING],
            message.data[NotificationHelper.DATA_KEY_METAL],
        )
        val channel = NotificationHelper.safeChannel(message.data["channel"])

        NotificationHelper.showNotification(
            context = this,
            title = title,
            body = body,
            url = url,
            channelId = channel,
        )
    }

}
