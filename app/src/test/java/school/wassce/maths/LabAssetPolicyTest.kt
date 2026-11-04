package school.wassce.maths

import org.junit.Assert.*
import org.junit.Test

class LabAssetPolicyTest {
    @Test fun permitsBundledLabResources() {
        assertTrue(isLabAsset("https://appassets.androidplatform.net/assets/chemistry-lab/index.html"))
        assertTrue(isLabAsset("https://appassets.androidplatform.net/assets/chemistry-lab/js/engine.js"))
    }
    @Test fun deniesRemoteAndUnrelatedContent() {
        listOf("https://example.com/assets/chemistry-lab/index.html", "file:///android_asset/chemistry-lab/index.html",
            "https://appassets.androidplatform.net/assets/questions.json", "javascript:alert(1)",
            "https://appassets.androidplatform.net:443/assets/chemistry-lab/index.html",
            "https://x@appassets.androidplatform.net/assets/chemistry-lab/index.html").forEach { assertFalse(it, isLabAsset(it)) }
    }
    @Test fun deniesTraversalIncludingEncodedPaths() {
        listOf("../questions.json", "%2e%2e/questions.json", "%252e%252e/questions.json", "js/../../questions.json", "..%5cquestions.json")
            .forEach { assertFalse(it, isLabAsset("https://appassets.androidplatform.net/assets/chemistry-lab/$it")) }
    }
}
