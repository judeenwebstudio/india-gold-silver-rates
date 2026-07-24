package com.ratestack.app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.ratestack.app.data.AppThemeMode
import com.ratestack.app.ui.theme.DarkBackground
import com.ratestack.app.ui.theme.DarkOnPrimary
import com.ratestack.app.ui.theme.DarkOnPrimaryContainer
import com.ratestack.app.ui.theme.DarkOnSurface
import com.ratestack.app.ui.theme.DarkOnSurfaceVariant
import com.ratestack.app.ui.theme.DarkOutline
import com.ratestack.app.ui.theme.DarkOutlineVariant
import com.ratestack.app.ui.theme.DarkPrimary
import com.ratestack.app.ui.theme.DarkPrimaryContainer
import com.ratestack.app.ui.theme.DarkSurface
import com.ratestack.app.ui.theme.DarkSurfaceVariant
import com.ratestack.app.ui.theme.LightBackground
import com.ratestack.app.ui.theme.LightOnPrimary
import com.ratestack.app.ui.theme.LightOnPrimaryContainer
import com.ratestack.app.ui.theme.LightOnSurface
import com.ratestack.app.ui.theme.LightOnSurfaceVariant
import com.ratestack.app.ui.theme.LightOutline
import com.ratestack.app.ui.theme.LightOutlineVariant
import com.ratestack.app.ui.theme.LightPrimary
import com.ratestack.app.ui.theme.LightPrimaryContainer
import com.ratestack.app.ui.theme.LightSurface
import com.ratestack.app.ui.theme.LightSurfaceVariant

private val LightColors = lightColorScheme(
    primary = LightPrimary,
    onPrimary = LightOnPrimary,
    primaryContainer = LightPrimaryContainer,
    onPrimaryContainer = LightOnPrimaryContainer,
    background = LightBackground,
    onBackground = LightOnSurface,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    outline = LightOutline,
    outlineVariant = LightOutlineVariant,
)

private val DarkColors = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = DarkOnPrimary,
    primaryContainer = DarkPrimaryContainer,
    onPrimaryContainer = DarkOnPrimaryContainer,
    background = DarkBackground,
    onBackground = DarkOnSurface,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    outline = DarkOutline,
    outlineVariant = DarkOutlineVariant,
)

@Composable
fun RateStackTheme(
    themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeMode) {
        AppThemeMode.SYSTEM -> isSystemInDarkTheme()
        AppThemeMode.LIGHT -> false
        AppThemeMode.DARK -> true
    }

    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
