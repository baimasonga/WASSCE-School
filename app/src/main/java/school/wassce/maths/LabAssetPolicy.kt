package school.wassce.maths

import java.net.URI

/** Restrict WebView requests and navigation to the simulator's bundled directory. */
internal fun isLabAsset(url: String): Boolean = runCatching {
    val uri = URI(url)
    uri.scheme == "https" && uri.host == "appassets.androidplatform.net" &&
        uri.port == -1 && uri.userInfo == null &&
        uri.path.startsWith("/assets/chemistry-lab/") &&
        uri.normalize().path == uri.path &&
        !uri.path.contains('\\') && !uri.path.contains('%') &&
        !uri.path.split('/').any { it == "." || it == ".." }
}.getOrDefault(false)
