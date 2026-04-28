// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#java
package testivai;

import org.testng.annotations.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class VisualExampleTest {
    WebDriver driver;

    @BeforeClass
    public void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-debugging-port=9222");
        driver = new ChromeDriver(options);
    }

    @AfterClass
    public void teardown() {
        driver.quit();
    }

    @Test
    public void homepageLooksCorrect() {
        driver.get("http://localhost:3000");
        TestivAIWitness.witness(driver, "homepage");
    }
}
