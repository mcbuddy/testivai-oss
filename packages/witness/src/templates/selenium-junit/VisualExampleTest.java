// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#java
package testivai;

import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

class VisualExampleTest {
    static WebDriver driver;

    @BeforeAll
    static void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-debugging-port=9222");
        driver = new ChromeDriver(options);
    }

    @AfterAll
    static void teardown() {
        driver.quit();
    }

    @Test
    void homepageLooksCorrect() {
        driver.get("http://localhost:3000");
        TestivAIWitness.witness(driver, "homepage");
    }
}
