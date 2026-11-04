package school.wassce.maths
import org.junit.Assert.*
import org.junit.Test
class SelectionTest {
    private fun q(id: Int, family: Int) = Question("$id", "A", "Topic", "$family", false, "Test", mapOf("A" to "1", "B" to "2", "C" to "3", "D" to "4"), "A", listOf("Step"))
    @Test fun mockUsesFiftyDifferentFamilies() {
        val pool = (0 until 1000).map { q(it,it%139) }
        val chosen = chooseQuestions(pool,50)
        assertEquals(50,chosen.size)
        assertEquals(50,chosen.map { it.family }.distinct().size)
        assertTrue(chosen.all { it in pool })
    }
    @Test fun smallTopicNeverDuplicatesToFillSession() {
        assertEquals(2, chooseQuestions(listOf(q(1,1),q(2,1),q(3,2)),20).size)
        assertTrue(chooseQuestions(emptyList(),20).isEmpty())
    }
}
