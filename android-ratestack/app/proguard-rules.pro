# Keep Android entry points and Retrofit/Gson DTO field names stable for release.
-keep class com.ratestack.app.MainActivity { *; }
-keep class com.ratestack.app.RateStackApplication { *; }
-keep class com.ratestack.app.RateStackMessagingService { *; }
-keep class com.ratestack.app.data.** { *; }
