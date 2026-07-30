# Keep Android entry points and Retrofit/Gson DTO field names stable for release.
-keep class com.ratestack.app.MainActivity { *; }
-keep class com.ratestack.app.RateStackApplication { *; }
-keep class com.ratestack.app.RateStackMessagingService { *; }
-keep class com.ratestack.app.data.** { *; }

# Razorpay's supported release-build rules:
# https://razorpay.com/docs/payments/payment-gateway/android-integration/standard/integration-steps/
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}

# Optional Google Pay bridge types referenced by Razorpay are not bundled when
# the dedicated native Google Pay SDK is not used by this app.
-dontwarn com.google.android.apps.nbu.paisa.inapp.client.api.**
-dontwarn proguard.annotation.**
