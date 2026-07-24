# RateStack Android

Production Android wrapper for the public RateStack website:

`https://india-gold-silver-rates.vercel.app`

The Android project is intentionally isolated in `android-ratestack`. It does not
replace or modify the Next.js application.

## Project configuration

| Setting | Value |
| --- | --- |
| Application ID | `com.ratestack.app` |
| Language | Kotlin |
| Build scripts | Gradle Kotlin DSL |
| Minimum SDK | 24 (Android 7.0) |
| Target SDK | 36 |
| Compile SDK | Android 36.1 |
| Default version | `1` / `1.0.0` |

The app uses Material Design 3 and a secured WebView. Only the exact configured
RateStack host can open inside the WebView. External HTTPS links open in the
device browser, supported email/telephone/WhatsApp links open in their
corresponding apps, and all `/admin` paths are redirected to the public
homepage.

## Open in Android Studio

1. Install the latest stable Android Studio.
2. In Android Studio, choose **Open**.
3. Select the `android-ratestack` folder, not the repository root.
4. Allow Gradle sync to finish and install SDK 36.1 if prompted.
5. Select an emulator or connected device and run the `app` configuration.

JDK 17 or newer is required. The Gradle wrapper and Android Gradle Plugin
versions are committed so Android Studio can use the correct tools.

## Build and test

From the `android-ratestack` directory:

```powershell
.\gradlew.bat testDebugUnitTest lint assembleDebug
```

The debug APK is created at:

`app/build/outputs/apk/debug/app-debug.apk`

Build a release Android App Bundle with:

```powershell
.\gradlew.bat bundleRelease
```

The AAB is created at:

`app/build/outputs/bundle/release/app-release.aab`

If release signing has not been configured, the AAB is unsigned and is suitable
only for validation. Configure signing before uploading it to Google Play.

## Change the website or privacy-policy URL

Do not edit Kotlin source. Add these non-secret settings to the user-level
Gradle properties file (`%USERPROFILE%\.gradle\gradle.properties` on Windows):

```properties
RATESTACK_WEBSITE_URL=https://india-gold-silver-rates.vercel.app
RATESTACK_TRUSTED_HOST=india-gold-silver-rates.vercel.app
RATESTACK_PRIVACY_POLICY_URL=https://india-gold-silver-rates.vercel.app/privacy-policy
```

The website and privacy-policy URLs must use HTTPS. `RATESTACK_TRUSTED_HOST`
must be a host name only, with no scheme, path, port, or trailing slash. Keep it
equal to the host in `RATESTACK_WEBSITE_URL`.

The default privacy policy is:

`https://india-gold-silver-rates.vercel.app/privacy-policy`

Confirm that this public page is live and accurately describes the website and
app before submitting to Google Play.

## Replace the logo and launcher icon

The supplied RateStack logo is stored unchanged at:

`app/src/main/res/drawable-nodpi/ratestack_logo.png`

To replace it:

1. Use a high-resolution PNG with transparent or neutral padding.
2. Preserve the source aspect ratio; do not stretch or crop the artwork.
3. Replace `ratestack_logo.png` using the same file name.
4. Review `drawable/ic_launcher_foreground.xml` and
   `drawable/splash_logo.xml` if the new artwork has a different aspect ratio.
5. Use Android Studio’s **Image Asset** preview to verify round, square,
   adaptive, and themed monochrome icons.

The project includes adaptive launcher icons for Android 8+, a monochrome
themed-icon layer for Android 13+, legacy icon resources, and Android 12+ splash
screen resources.

## Update the app version

Set version values in the user-level Gradle properties file:

```properties
RATESTACK_VERSION_CODE=2
RATESTACK_VERSION_NAME=1.1.0
```

Increase `RATESTACK_VERSION_CODE` for every Play Store release.

## Create and configure a signing keystore

Create a keystore outside this repository and keep multiple secure backups:

```powershell
keytool -genkeypair -v -keystore C:\secure\ratestack-upload.jks -alias ratestack-upload -keyalg RSA -keysize 2048 -validity 10000
```

Configure signing in the user-level Gradle properties file:

```properties
RATESTACK_STORE_FILE=C:/secure/ratestack-upload.jks
RATESTACK_STORE_PASSWORD=replace-with-your-secret
RATESTACK_KEY_ALIAS=ratestack-upload
RATESTACK_KEY_PASSWORD=replace-with-your-secret
```

Alternatively, set the same four names as environment variables. Never place
passwords in this repository. Keystore files, `signing.properties`,
`local.properties`, and common keystore extensions are ignored by Git.

Build signed release artifacts:

```powershell
.\gradlew.bat clean assembleRelease bundleRelease
```

Outputs:

- Signed APK: `app/build/outputs/apk/release/app-release.apk`
- Signed AAB: `app/build/outputs/bundle/release/app-release.aab`

Verify the AAB is signed before upload. For production, enable Google Play App
Signing and retain the local key as the upload key.

## Firebase setup

Firebase is integrated in code but remains optional for local builds. The
Google Services and Crashlytics Gradle plugins are applied only when
`app/google-services.json` exists, so a developer without Firebase access can
still run tests and build the app.

`google-services.json` is ignored by Git. Never commit Firebase service-account
keys, server credentials, keystores, passwords, or signing credentials.

### Create and connect the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a
   production project. Use a separate Firebase project for development or QA if
   you need test data isolated from production.
2. In **Project settings > Your apps**, add an Android app.
3. Register the exact package name `com.ratestack.app`. It must match
   `applicationId`; it is case-sensitive.
4. Enter the optional app nickname `RateStack Android`.
5. Download `google-services.json`.
6. Place it locally at:
   `android-ratestack/app/google-services.json`.
7. Sync Gradle and rebuild. `BuildConfig.FIREBASE_CONFIGURED` will then be
   generated as `true`.

The configuration file contains Firebase project identifiers, but project
policy intentionally keeps it out of source control. Restrict every server API
key and service account independently in Google Cloud/Firebase.

### Enable and test Cloud Messaging

1. In Firebase Console, open **Messaging** and complete the Cloud Messaging
   setup for the registered Android app.
2. In **Project settings > Cloud Messaging**, confirm the Cloud Messaging API
   is enabled.
3. Install a build containing the matching `google-services.json` on a physical
   device, or an emulator image that includes Google Play services.
4. On Android 13+, allow notifications after RateStack explains the request.
   Earlier supported Android versions do not receive a runtime permission
   prompt.
5. To obtain a token without storing or logging it, set a debugger breakpoint
   in `RateStackMessagingService.onNewToken`, reinstall or clear app data, and
   copy the `token` value from the debugger variable inspector. Do not paste
   tokens into source files or commit them.
6. In Firebase Messaging, choose **Send test message**, paste the temporary
   registration token, and send the message.

The service accepts notification title/body values and these optional custom
data keys:

| Key | Purpose |
| --- | --- |
| `url` | Preferred destination URL |
| `link` | Alternate destination URL |
| `deeplink` | Alternate destination URL |
| `channel` | `rate_alerts` (default) or `general_updates` |

Trusted RateStack HTTPS destinations open in the WebView. Any `/admin` URL,
cleartext URL, malformed URL, or unsafe scheme falls back to the public
homepage. External HTTPS destinations use the device's URL handler outside the
WebView. For consistent foreground/background/closed behavior, include the URL
as custom data; Android delivers background notification payload data to the
launcher activity when the user taps the system notification.

The app never logs or persists FCM registration tokens and does not upload them
to a RateStack server.

### Enable and test Crashlytics

1. In Firebase Console, open **Crashlytics** for `com.ratestack.app` and complete
   the onboarding workflow.
2. Confirm `app/google-services.json` is present locally.
3. Build and distribute a release variant through a private Internal Testing
   track. Debug builds explicitly disable Crashlytics collection.
4. For a safe first-event test, create a temporary local QA-only action that
   throws `RuntimeException("Crashlytics setup test")`, build a release test
   version, trigger it once on a non-production test device, and then remove
   that temporary action before committing or promoting the build.
5. Relaunch the test app so the report can upload, then check the Crashlytics
   dashboard. Reports can take several minutes to appear.

Never deliberately crash a production build used by customers. RateStack does
not set Crashlytics user IDs, names, email addresses, or custom personal-data
keys. Release collection is enabled only when Firebase is configured; debug
collection remains disabled.

## Google Play in-app updates

RateStack checks Google Play for an update and starts the flexible flow only
when a newer allowed version is available. It records the prompted version
locally to avoid repeatedly interrupting the user. After download, an
indefinite Material snackbar offers **Restart** and calls `completeUpdate()`
only when the user accepts.

This cannot be validated with a locally installed APK. Test it through Google
Play Internal Testing:

1. Upload and publish a signed AAB with one version code to an Internal Testing
   track.
2. Opt a test Google account into that track and install RateStack from the Play
   Store link.
3. Increase `RATESTACK_VERSION_CODE`, build a new signed AAB, and publish it to
   the same track.
4. Wait until Google Play makes the new build available, then open the older
   installed version.
5. Accept the flexible update, continue using the app during download, and
   confirm the **Restart** action completes installation.

Installing the APK directly with Android Studio or `adb` does not exercise the
real Play update flow.

## Google Play in-app review

The review API is never requested on first launch. A successful session is
counted only after a trusted RateStack page loads. The first attempt becomes
eligible after five successful sessions and waits another 30 seconds of active
usage. Later attempts require at least ten additional successful sessions.
Failures and Play quota suppression are intentionally silent. The existing
**Rate RateStack** action remains the permanent Play Store fallback.

Test review behavior using Google Play Internal Testing or Internal App Sharing
with an account eligible for that test release. Google Play controls whether
the dialog appears, and successful task completion does not prove the user saw
or submitted a review. Do not rely on sideloaded builds for final verification.

## Android App Links

The manifest requests verified HTTPS App Links only for:

- `/`
- `/gold-rate` and `/gold-rate/*`
- `/silver-rate` and `/silver-rate/*`
- `/state` and `/state/*`
- `/city` and `/city/*`

Admin paths are not declared and remain blocked by the runtime URL policy.
App Links are prepared but **not verified** until the production website hosts
a statement containing the actual Google Play App Signing certificate
fingerprint.

The prepared template is:

`app-links/assetlinks.json`

To obtain the production SHA-256 fingerprint:

1. Upload a signed AAB and enroll in Google Play App Signing.
2. Open Play Console and find **App signing** under the current **App
   integrity** or **Play Store protection** section.
3. Under **App signing key certificate** (not the upload key certificate), copy
   the SHA-256 certificate fingerprint.
4. Replace
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` in the template. Keep the
   colon-separated uppercase format shown by Play Console.

Deploy the completed file on the existing website at exactly:

`https://india-gold-silver-rates.vercel.app/.well-known/assetlinks.json`

It must return HTTP 200 directly over HTTPS, without authentication or
redirects, and should use `Content-Type: application/json`. Do not put the
placeholder template online. This Android project does not deploy or alter the
website.

After deployment, reinstall the Play-signed app and test:

```powershell
adb shell pm set-app-links --package com.ratestack.app 0 all
adb shell pm verify-app-links --re-verify com.ratestack.app
adb shell pm get-app-links com.ratestack.app
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://india-gold-silver-rates.vercel.app/gold-rate/test"
```

Do not describe the links as verified until the domain-verification result is
successful with the certificate used by Google Play on installed releases.

## Publish to Google Play Console

1. Create a Google Play developer account and a new app named **RateStack**.
2. Use package name `com.ratestack.app`; it cannot be changed after the first
   release.
3. Complete the store listing, content rating, target audience, app access,
   advertising, privacy-policy, and data-safety sections.
4. Upload the signed release AAB to an internal testing track.
5. Test navigation, downloads, uploads, offline behavior, admin blocking, and
   external links on Android 7, Android 12, Android 15, and the latest Android
   version available in Play testing.
6. Resolve automated pre-launch report findings.
7. Promote the tested build through closed/open testing and production.

## Data-safety notes

These notes are an implementation summary, not legal advice. The Play Console
answers must match the live website, its privacy policy, and the versions of
Google Analytics and AdSense actually enabled at submission time.

- The native app requests `INTERNET`, `ACCESS_NETWORK_STATE`, and
  `POST_NOTIFICATIONS` on Android 13+ because notifications are an enabled
  feature. The notification permission is requested only after Firebase is
  configured and a public page has loaded successfully.
- It does not request storage, camera, microphone, location, contacts, or
  phone permissions.
- File uploads are user-initiated through Android's system document picker.
- Downloads are placed in the app-specific external Downloads directory.
- The native layer does not add a JavaScript bridge and does not collect its
  own user profile data.
- The loaded website may use first-party cookies, Google Analytics 4, AdSense,
  and server-side analytics. Those services may process identifiers, page
  activity, coarse location, device information, diagnostics, and advertising
  data according to the live site configuration and user consent.
- External links leave the WebView and are handled by installed apps or the
  default browser.

Review the website's current consent flow, retention, deletion process, and
third-party disclosures before completing Google Play’s Data safety form.

## Security behavior

- HTTPS is mandatory and cleartext traffic is disabled.
- JavaScript is enabled only because the RateStack site requires it.
- DOM storage and first-party cookies are enabled.
- Third-party WebView cookies are disabled.
- Mixed content, file access, content access, JavaScript-created windows, and
  unsafe URL schemes are blocked.
- SSL errors are cancelled and are never bypassed.
- Safe Browsing is enabled on supported Android versions.
- No JavaScript interface is exposed.
- Every `/admin` URL is blocked inside the app and redirects to the public
  homepage.
- Downloads are accepted only from the trusted RateStack host.

## Configuration reference

| Gradle property or environment variable | Required | Default |
| --- | --- | --- |
| `RATESTACK_WEBSITE_URL` | No | Production RateStack HTTPS URL |
| `RATESTACK_TRUSTED_HOST` | No | Host derived from the website URL |
| `RATESTACK_PRIVACY_POLICY_URL` | No | Production privacy-policy HTTPS URL |
| `RATESTACK_VERSION_CODE` | No | `1` |
| `RATESTACK_VERSION_NAME` | No | `1.0.0` |
| `RATESTACK_STORE_FILE` | Release signing only | None |
| `RATESTACK_STORE_PASSWORD` | Release signing only | None |
| `RATESTACK_KEY_ALIAS` | Release signing only | None |
| `RATESTACK_KEY_PASSWORD` | Release signing only | None |

All four signing values must be present together. Without them, debug builds
still work and release bundles can be validated, but release output is not ready
for Play Store upload.
