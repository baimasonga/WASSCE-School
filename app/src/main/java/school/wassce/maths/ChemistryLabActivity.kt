package school.wassce.maths

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream

/** Only APK-bundled assets run in this WebView. Online classes open in a browser. */
class ChemistryLabActivity : ComponentActivity() {
    private var labView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled") // Required by the trusted, bundled simulation engine.
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF14665D))) {
                var leaving by remember { mutableStateOf(false) }
                var loadFailed by remember { mutableStateOf(false) }
                BackHandler { leaving = true }
                if (leaving) AlertDialog(onDismissRequest = { leaving = false },
                    title = { Text("Leave the Chemistry lab?") },
                    text = { Text("The current experiment will restart when you return. Completed mock-exam history stays on this phone. Your question-practice session stays saved; any running exam clock continues.") },
                    confirmButton = { TextButton(onClick = { finish() }) { Text("Leave lab") } },
                    dismissButton = { TextButton(onClick = { leaving = false }) { Text("Keep experimenting") } })
                Surface(Modifier.fillMaxSize()) {
                    Column(Modifier.fillMaxSize().safeDrawingPadding()) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            TextButton(onClick = { leaving = true }) { Text("← School") }
                            TextButton(onClick = {
                                try {
                                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ONLINE_LAB)))
                                } catch (_: ActivityNotFoundException) {
                                    Toast.makeText(this@ChemistryLabActivity, "Install a browser to use online classes.", Toast.LENGTH_LONG).show()
                                }
                            }) { Text("Online classes ↗") }
                        }
                        Text("Chemistry lab • Offline • Rotate for a wider bench", style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                        if (loadFailed) {
                            Text("The bundled lab could not load. Return to School and reopen it. If this continues, update Android System WebView.", modifier = Modifier.padding(16.dp))
                        }
                        AndroidView(modifier = Modifier.fillMaxWidth().weight(1f), factory = { context ->
                            val loader = WebViewAssetLoader.Builder()
                                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                                .build()
                            WebView(context).apply {
                                labView = this
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.allowFileAccess = false
                                settings.allowContentAccess = false
                                settings.blockNetworkLoads = true
                                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                                settings.javaScriptCanOpenWindowsAutomatically = false
                                settings.setSupportMultipleWindows(false)
                                webViewClient = object : WebViewClient() {
                                    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest): WebResourceResponse {
                                        return if (isLabAsset(request.url.toString())) {
                                            loader.shouldInterceptRequest(request.url) ?: blocked()
                                        } else blocked()
                                    }
                                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean =
                                        !isLabAsset(request.url.toString())

                                    override fun onReceivedError(view: WebView?, request: WebResourceRequest, error: android.webkit.WebResourceError?) {
                                        if (request.isForMainFrame) loadFailed = true
                                    }
                                }
                                loadUrl(LAB_URL)
                            }
                        })
                    }
                }
            }
        }
    }

    override fun onPause() { labView?.onPause(); super.onPause() }
    override fun onResume() { super.onResume(); labView?.onResume() }
    override fun onDestroy() {
        labView?.apply { stopLoading(); removeAllViews(); destroy() }
        labView = null
        super.onDestroy()
    }

    private fun blocked() = WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", emptyMap(), ByteArrayInputStream(ByteArray(0)))

    companion object {
        const val LAB_URL = "https://appassets.androidplatform.net/assets/chemistry-lab/index.html"
        const val ONLINE_LAB = "https://wassce-school.medbangz.chatgpt.site/chemistry-lab/index.html"
    }
}
