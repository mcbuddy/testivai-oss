// TestivAI Visual Regression Helper
// Docs: https://testiv.ai/docs#java
package testivai;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;

public class TestivAIWitness {
    public static Object witness(WebDriver driver, String name) {
        return ((JavascriptExecutor) driver).executeScript(
            "return window.testivaiWitness(arguments[0])", name
        );
    }
}
