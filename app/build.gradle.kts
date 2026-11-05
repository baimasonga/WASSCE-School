plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "school.wassce.maths"
    compileSdk = 35
    defaultConfig {
        applicationId = "school.wassce.maths"
        minSdk = 26
        targetSdk = 35
        versionCode = 5
        versionName = "0.5.0"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all { test ->
                // Screenshot tests render every screen with Robolectric and write PNGs to docs/screenshots.
                // They are slow and download the Robolectric runtime, so they only run with -Pscreenshots.
                if (project.hasProperty("screenshots")) {
                    test.filter.includeTestsMatching("school.wassce.maths.screenshots.*")
                    test.systemProperty("roborazzi.test.record", "true")
                    test.systemProperty("screenshot.dir", rootProject.file("docs/screenshots").absolutePath)
                    // Optional mirror for the Android runtime Robolectric downloads while tests run.
                    project.findProperty("robolectricRepo")?.let { test.systemProperty("robolectric.dependency.repo.url", it.toString()) }
                } else {
                    test.exclude("**/screenshots/**")
                }
            }
        }
    }
}
dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    // Screenshot tests only (see testOptions above).
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.40.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.40.1")
    testImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
