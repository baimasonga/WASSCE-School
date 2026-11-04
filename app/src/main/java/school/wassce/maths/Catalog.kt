package school.wassce.maths

import android.content.Context
import org.json.JSONObject

val SUBJECT_IDS = setOf("mathematics","english-language","biology","chemistry","physics","agricultural-science","further-mathematics","geography","economics","history","literature-in-english","government","commerce","business-management","financial-accounting","cost-accounting","ict","christian-religious-studies","islamic-studies","french","arabic","civic-education","health-science","physical-education","home-management","foods-and-nutrition","clothing-and-textiles","technical-drawing","visual-arts","music","animal-husbandry","crop-husbandry","entrepreneurship","insurance","marketing","metalwork","science","woodwork")
val COUNTRY_NAMES = linkedMapOf("SL" to "Sierra Leone", "LR" to "Liberia", "GM" to "The Gambia")
data class CatalogSubject(val id: String, val name: String, val topics: List<String>)
fun loadSubjectCatalog(context: Context): List<CatalogSubject> {
 val rows=JSONObject(context.assets.open("subject_catalog.json").bufferedReader().use { it.readText() }).getJSONArray("subjects")
 return List(rows.length()) { i -> val s=rows.getJSONObject(i); val t=s.getJSONArray("topics"); CatalogSubject(s.getString("id"),s.getString("name"),List(t.length()) { t.getString(it) }) }
}
fun Question.matchesProfile(country: String, subject: String, year: Int, series: String): Boolean = subjectId == subject && country in countries && (examYear == null || examYear == year) && (examSeries == "both" || examSeries == series)
