# Keep the application entry point and WebView clients discoverable after R8.
-keep class com.ratestack.app.MainActivity { *; }

# No JavaScript bridge is exposed. Do not add broad @JavascriptInterface keep
# rules unless a reviewed bridge is intentionally introduced in the future.
