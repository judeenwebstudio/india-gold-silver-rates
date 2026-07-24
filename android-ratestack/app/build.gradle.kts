import java.net.URI

plugins {
    alias(libs.plugins.android.application)
}

fun quotedBuildConfig(value: String): String =
    "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

val websiteUrl = providers.gradleProperty("RATESTACK_WEBSITE_URL")
    .orElse("https://india-gold-silver-rates.vercel.app")
    .get()
val trustedHost = providers.gradleProperty("RATESTACK_TRUSTED_HOST")
    .orElse(URI(websiteUrl).host ?: "india-gold-silver-rates.vercel.app")
    .get()
val privacyPolicyUrl = providers.gradleProperty("RATESTACK_PRIVACY_POLICY_URL")
    .orElse("https://india-gold-silver-rates.vercel.app/privacy-policy")
    .get()
val configuredVersionCode = providers.gradleProperty("RATESTACK_VERSION_CODE")
    .orElse("1")
    .get()
    .toInt()
val configuredVersionName = providers.gradleProperty("RATESTACK_VERSION_NAME")
    .orElse("1.0.0")
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
        }

        getByName("release") {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
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
        viewBinding = true
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
    implementation(libs.androidx.activity)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.core)
    implementation(libs.androidx.swipe.refresh)
    implementation(libs.google.material)

    testImplementation(libs.junit)
}
