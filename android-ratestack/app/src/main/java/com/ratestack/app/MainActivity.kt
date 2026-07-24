package com.ratestack.app

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.SafeBrowsingResponse
import android.webkit.SslErrorHandler
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.ratestack.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val urlPolicy = UrlPolicy(BuildConfig.TRUSTED_HOST)
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var lastFailedUrl: String? = null
    private var receivedMainFrameError = false

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val resultUris = if (result.resultCode == RESULT_OK) {
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        } else {
            null
        }
        fileChooserCallback?.onReceiveValue(resultUris)
        fileChooserCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_RateStack)
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        applySystemInsets()
        configureToolbar()
        configureWebView()
        configureRefreshAndRetry()
        configureBackNavigation()

        if (savedInstanceState == null || binding.webView.restoreState(savedInstanceState) == null) {
            loadHome()
        }
    }

    private fun applySystemInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }

    private fun configureToolbar() {
        binding.toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_share_page -> shareCurrentPage()
                R.id.action_share_app -> shareApp()
                R.id.action_privacy -> openConfiguredPrivacyPolicy()
                R.id.action_rate_app -> openStoreListing()
                R.id.action_version -> showVersion()
                else -> return@setOnMenuItemClickListener false
            }
            true
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(binding.webView, false)
        }

        binding.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            binding.webView.settings.safeBrowsingEnabled = true
        }

        binding.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean = handleNavigation(request.url.toString())

            @Deprecated("Required for Android 7 compatibility")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                return handleNavigation(url)
            }

            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                val destination = urlPolicy.classify(url)
                if (destination != NavigationDestination.INTERNAL) {
                    view.stopLoading()
                    if (destination == NavigationDestination.ADMIN_BLOCKED) {
                        showMessage(getString(R.string.admin_pages_unavailable))
                        loadHome()
                    } else {
                        handleNavigation(url)
                    }
                    return
                }

                receivedMainFrameError = false
                lastFailedUrl = null
                showLoading(true)
                showWebContent()
            }

            override fun onPageFinished(view: WebView, url: String) {
                showLoading(false)
                binding.swipeRefresh.isRefreshing = false
                if (!receivedMainFrameError) {
                    showWebContent()
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                if (request.isForMainFrame) {
                    showNetworkError(request.url.toString())
                }
            }

            override fun onReceivedHttpError(
                view: WebView,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse,
            ) {
                if (request.isForMainFrame && errorResponse.statusCode >= 400) {
                    showNetworkError(request.url.toString())
                }
            }

            override fun onReceivedSslError(
                view: WebView,
                handler: SslErrorHandler,
                error: android.net.http.SslError,
            ) {
                handler.cancel()
                showNetworkError(view.url ?: BuildConfig.WEBSITE_URL)
            }

            override fun onSafeBrowsingHit(
                view: WebView,
                request: WebResourceRequest,
                threatType: Int,
                callback: SafeBrowsingResponse,
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    callback.backToSafety(true)
                }
                showMessage(getString(R.string.unsafe_page_blocked))
            }
        }

        binding.webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                binding.loadingProgress.progress = newProgress
                binding.loadingProgress.visibility = if (newProgress in 0..99) {
                    View.VISIBLE
                } else {
                    View.GONE
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                request.deny()
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                callback.invoke(origin, false, false)
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                val mimeTypes = fileChooserParams.acceptTypes
                    .filter { it.isNotBlank() }
                    .toTypedArray()
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = if (mimeTypes.size == 1) mimeTypes[0] else "*/*"
                    if (mimeTypes.size > 1) {
                        putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
                    }
                    putExtra(
                        Intent.EXTRA_ALLOW_MULTIPLE,
                        fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE,
                    )
                }

                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    showMessage(getString(R.string.no_file_picker))
                    false
                }
            }
        }

        binding.webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            downloadFile(url, userAgent, contentDisposition, mimeType)
        }
    }

    private fun configureRefreshAndRetry() {
        binding.swipeRefresh.setColorSchemeResources(
            R.color.gold_primary,
            R.color.blue_primary,
        )
        binding.swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            binding.webView.canScrollVertically(-1)
        }
        binding.swipeRefresh.setOnRefreshListener {
            if (isOnline()) {
                val retryUrl = lastFailedUrl
                if (retryUrl != null && urlPolicy.classify(retryUrl) == NavigationDestination.INTERNAL) {
                    binding.webView.loadUrl(retryUrl)
                } else {
                    binding.webView.reload()
                }
            } else {
                binding.swipeRefresh.isRefreshing = false
                showNetworkError(lastFailedUrl ?: BuildConfig.WEBSITE_URL)
            }
        }
        binding.retryButton.setOnClickListener {
            if (isOnline()) {
                binding.webView.loadUrl(lastFailedUrl ?: BuildConfig.WEBSITE_URL)
            } else {
                showMessage(getString(R.string.still_offline))
            }
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.errorPanel.isVisible) {
                        showWebContent()
                    } else if (binding.webView.canGoBack()) {
                        binding.webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )
    }

    private fun handleNavigation(url: String): Boolean {
        return when (urlPolicy.classify(url)) {
            NavigationDestination.INTERNAL -> false
            NavigationDestination.ADMIN_BLOCKED -> {
                showMessage(getString(R.string.admin_pages_unavailable))
                loadHome()
                true
            }
            NavigationDestination.EXTERNAL_HTTPS -> {
                openExternalUri(url.toUri())
                true
            }
            NavigationDestination.EMAIL -> {
                openExternalUri(url.toUri(), Intent.ACTION_SENDTO)
                true
            }
            NavigationDestination.TELEPHONE -> {
                openExternalUri(url.toUri(), Intent.ACTION_DIAL)
                true
            }
            NavigationDestination.WHATSAPP -> {
                openExternalUri(url.toUri())
                true
            }
            NavigationDestination.BLOCKED -> {
                showMessage(getString(R.string.unsafe_link_blocked))
                true
            }
        }
    }

    private fun loadHome() {
        if (isOnline()) {
            binding.webView.loadUrl(BuildConfig.WEBSITE_URL)
        } else {
            showNetworkError(BuildConfig.WEBSITE_URL)
        }
    }

    private fun showLoading(show: Boolean) {
        if (!show) {
            binding.loadingProgress.visibility = View.GONE
        }
    }

    private fun showWebContent() {
        binding.errorPanel.visibility = View.GONE
        binding.swipeRefresh.visibility = View.VISIBLE
    }

    private fun showNetworkError(failedUrl: String) {
        receivedMainFrameError = true
        lastFailedUrl = failedUrl
        binding.webView.stopLoading()
        binding.swipeRefresh.isRefreshing = false
        binding.swipeRefresh.visibility = View.GONE
        binding.errorPanel.visibility = View.VISIBLE
        binding.errorTitle.setText(
            if (isOnline()) R.string.page_unavailable_title else R.string.offline_title,
        )
        binding.errorMessage.setText(
            if (isOnline()) R.string.page_unavailable_message else R.string.offline_message,
        )
        showLoading(false)
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun downloadFile(
        url: String,
        userAgent: String?,
        contentDisposition: String?,
        mimeType: String?,
    ) {
        if (urlPolicy.classify(url) != NavigationDestination.INTERNAL) {
            showMessage(getString(R.string.download_blocked))
            return
        }

        val request = DownloadManager.Request(url.toUri()).apply {
            setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
            setMimeType(mimeType)
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setAllowedOverMetered(true)
            setAllowedOverRoaming(false)
            setDestinationInExternalFilesDir(
                this@MainActivity,
                Environment.DIRECTORY_DOWNLOADS,
                URLUtil.guessFileName(url, contentDisposition, mimeType),
            )
            userAgent?.takeIf { it.isNotBlank() }?.let {
                addRequestHeader("User-Agent", it)
            }
            CookieManager.getInstance().getCookie(url)?.takeIf { it.isNotBlank() }?.let {
                addRequestHeader("Cookie", it)
            }
        }

        try {
            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.enqueue(request)
            showMessage(getString(R.string.download_started))
        } catch (_: SecurityException) {
            showMessage(getString(R.string.download_failed))
        } catch (_: IllegalArgumentException) {
            showMessage(getString(R.string.download_failed))
        }
    }

    private fun shareCurrentPage() {
        val currentUrl = binding.webView.url
            ?.takeIf { urlPolicy.classify(it) == NavigationDestination.INTERNAL }
            ?: BuildConfig.WEBSITE_URL
        shareText(getString(R.string.share_page_text, currentUrl))
    }

    private fun shareApp() {
        shareText(getString(R.string.share_app_text, BuildConfig.WEBSITE_URL))
    }

    private fun shareText(text: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        startActivity(Intent.createChooser(intent, getString(R.string.share_with)))
    }

    private fun openConfiguredPrivacyPolicy() {
        when (urlPolicy.classify(BuildConfig.PRIVACY_POLICY_URL)) {
            NavigationDestination.INTERNAL -> binding.webView.loadUrl(BuildConfig.PRIVACY_POLICY_URL)
            NavigationDestination.EXTERNAL_HTTPS -> openExternalUri(
                BuildConfig.PRIVACY_POLICY_URL.toUri(),
            )
            else -> showMessage(getString(R.string.privacy_url_invalid))
        }
    }

    private fun openStoreListing() {
        val marketUri = "market://details?id=$packageName".toUri()
        try {
            startActivity(Intent(Intent.ACTION_VIEW, marketUri))
        } catch (_: ActivityNotFoundException) {
            openExternalUri(
                "https://play.google.com/store/apps/details?id=$packageName".toUri(),
            )
        }
    }

    private fun showVersion() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.app_name)
            .setMessage(getString(R.string.version_message, BuildConfig.VERSION_NAME))
            .setPositiveButton(android.R.string.ok, null)
            .show()
    }

    private fun openExternalUri(uri: Uri, action: String = Intent.ACTION_VIEW) {
        try {
            startActivity(Intent(action, uri))
        } catch (_: ActivityNotFoundException) {
            showMessage(getString(R.string.no_app_for_link))
        }
    }

    private fun showMessage(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        binding.webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        binding.webView.apply {
            stopLoading()
            webChromeClient = null
            webViewClient = WebViewClient()
            destroy()
        }
        super.onDestroy()
    }
}
