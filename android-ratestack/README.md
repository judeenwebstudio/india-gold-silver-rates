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

- The native app requests only `INTERNET` and `ACCESS_NETWORK_STATE`.
- It does not request storage, camera, microphone, location, contacts, phone,
  or notification permissions.
- File uploads are user-initiated through Android’s system document picker.
- Downloads are placed in the app-specific external Downloads directory.
- The native layer does not add a JavaScript bridge and does not collect its
  own user profile data.
- The loaded website may use first-party cookies, Google Analytics 4, AdSense,
  and server-side analytics. Those services may process identifiers, page
  activity, coarse location, device information, diagnostics, and advertising
  data according to the live site configuration and user consent.
- External links leave the WebView and are handled by installed apps or the
  default browser.

Review the website’s current consent flow, retention, deletion process, and
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
