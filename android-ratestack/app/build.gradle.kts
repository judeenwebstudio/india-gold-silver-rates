import java.net.URI

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

val firebaseConfigPresent = file("google-services.json").isFile
if (firebaseConfigPresent) {
    pluginManager.apply("com.google.gms.google-services")
    pluginManager.apply("com.google.firebase.crashlytics")
}

fun quotedBuildConfig(value: String): String =
    "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

val websiteUrl = providers.gradleProperty("RATESTACK_WEBSITE_URL")
    .orElse("https://ratestack.in")
    .get()
val trustedHost = providers.gradleProperty("RATESTACK_TRUSTED_HOST")
    .orElse(URI(websiteUrl).host ?: "ratestack.in")
    .get()
val privacyPolicyUrl = providers.gradleProperty("RATESTACK_PRIVACY_POLICY_URL")
    .orElse("https://ratestack.in/privacy-policy")
    .get()
val googleAndroidClientId = providers.gradleProperty("GOOGLE_ANDROID_CLIENT_ID")
    .orElse(providers.environmentVariable("GOOGLE_ANDROID_CLIENT_ID"))
    .orElse("")
    .get()
val configuredVersionCode = providers.gradleProperty("RATESTACK_VERSION_CODE")
    .orElse("2")
    .get()
    .toInt()
val configuredVersionName = providers.gradleProperty("RATESTACK_VERSION_NAME")
    .orElse("1.1.0")
    .get()

val releaseStoreFile = providers.gradleProperty("RATESTACK_STORE_FILE")
    .orElse(providers.environmentVariable("RATESTACK_STORE_FILE"))
    .orNull
val releaseStorePassword = providers.gradleProperty("RATESTACK_STORE_PASSWORD")
    .orElse(providers.environmentVariable("RATESTACK_STORE_PASSWORD"))
    .orNull
val releaseKeyAlias = providers.gradleProperty("RATESTACK_KEY_ALIAS")
    .orElse(providers.environmentVariable("RATESTACK_KEY_ALIAS"))
    .orNull
val releaseKeyPassword = providers.gradleProperty("RATESTACK_KEY_PASSWORD")
    .orElse(providers.environmentVariable("RATESTACK_KEY_PASSWORD"))
    .orNull
val releaseSigningConfigured = listOf(
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
).all { !it.isNullOrBlank() }

android {
    namespace = "com.ratestack.app"

    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.ratestack.app"
        minSdk = 24
        targetSdk = 36
        versionCode = configuredVersionCode
        versionName = configuredVersionName

        buildConfigField("String", "WEBSITE_URL", quotedBuildConfig(websiteUrl))
        buildConfigField("String", "TRUSTED_HOST", quotedBuildConfig(trustedHost))
        buildConfigField(
            "String",
            "PRIVACY_POLICY_URL",
            quotedBuildConfig(privacyPolicyUrl),
        )
        buildConfigField("boolean", "FIREBASE_CONFIGURED", firebaseConfigPresent.toString())
        buildConfigField("String", "GOOGLE_ANDROID_CLIENT_ID", quotedBuildConfig(googleAndroidClientId))

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = file(requireNotNull(releaseStoreFile))
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        getByName("debug") {
            isMinifyEnabled = false
            manifestPlaceholders["crashlyticsCollectionEnabled"] = false
        }

        getByName("release") {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            manifestPlaceholders["crashlyticsCollectionEnabled"] = true
            signingConfig = if (releaseSigningConfigured) {
                signingConfigs.getByName("release")
            } else {
                null
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/AL2.0",
                "META-INF/LGPL2.1",
                "META-INF/LICENSE*",
                "META-INF/NOTICE*",
            )
        }
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = true
        disable += setOf(
            "AndroidGradlePluginVersion",
            "GradleDependency",
            "OldTargetApi",
        )
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.runtime)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.preview)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.messaging)
    implementation(libs.google.material)
    implementation(libs.play.app.update)
    implementation(libs.play.app.update.ktx)
    implementation(libs.play.review)
    implementation(libs.play.review.ktx)
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.gson)
    implementation(libs.razorpay.checkout)
    implementation(libs.coil.compose)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
