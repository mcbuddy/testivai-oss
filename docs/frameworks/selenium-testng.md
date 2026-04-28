---
sidebar_position: 11
title: Selenium + TestNG
---

# Selenium + TestNG

Add visual regression testing to your existing Selenium + TestNG Maven project. `TestivAIWitness.witness(driver, "name")` integrates with TestNG's `@BeforeClass` / `@Test` / `@AfterClass` lifecycle.

---

## Prerequisites

- Java 11+
- Chrome browser
- Maven project with Selenium and TestNG dependencies

---

## 1. Add Maven Dependencies

Add these to your `pom.xml`:

```xml
<dependencies>
  <!-- Selenium WebDriver -->
  <dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.18.1</version>
    <scope>test</scope>
  </dependency>

  <!-- TestNG -->
  <dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <version>7.9.0</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.2.5</version>
    </plugin>
  </plugins>
</build>
```

---

## 2. Install the CLI

```bash
npm install -g @testivai/witness
```

:::note
The CLI is a Node.js tool. Node.js 18+ is required even for Java projects.
:::

---

## 3. Run the Setup Wizard

```bash
npx testivai init
```

Select when prompted:

```
? Select your language:        › Java
? Select your test framework:  › Selenium (TestNG)
? Where are your test files?   › src/test/java
```

The wizard generates two files in `src/test/java/testivai/`:

| File | Purpose |
|---|---|
| `TestivAIWitness.java` | Static `witness(driver, name)` helper class |
| `VisualExampleTest.java` | Working example test with TestNG lifecycle |

---

## 4. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 5. Chrome Setup

Add `--remote-debugging-port=9222` to `ChromeOptions` in your `@BeforeClass`:

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.annotations.BeforeClass;

public class VisualTest {
    WebDriver driver;

    @BeforeClass
    public void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-debugging-port=9222");
        driver = new ChromeDriver(options);
    }
}
```

:::note JUnit 5 vs TestNG
The key difference from JUnit 5: TestNG uses `@BeforeClass` (non-static, `public`) while JUnit 5 uses `@BeforeAll` (static). The `TestivAIWitness` helper class is identical for both.
:::

---

## 6. Add Capture Calls

Import `TestivAIWitness` and call `witness()` in your `@Test` methods:

```java
import testivai.TestivAIWitness;

@Test
public void homepageLooksCorrect() {
    driver.get("http://localhost:3000");
    TestivAIWitness.witness(driver, "homepage");
}

@Test
public void loginPageLooksCorrect() {
    driver.get("http://localhost:3000/login");
    TestivAIWitness.witness(driver, "login-page");
}
```

**The generated helper class (`TestivAIWitness.java`):**

```java
// TestivAI Visual Regression Helper
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
```

---

## 7. Full Working Example

The wizard generates this example at `src/test/java/testivai/VisualExampleTest.java`:

```java
// TestivAI Visual Regression Example
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
```

---

## 8. Run

```bash
testivai run "mvn test"
```

Or run a specific test class:

```bash
testivai run "mvn test -Dtest=VisualExampleTest"
```

---

## CI/CD

Add headless Chrome args for CI:

```java
options.addArguments("--remote-debugging-port=9222");
options.addArguments("--headless");
options.addArguments("--no-sandbox");
options.addArguments("--disable-dev-shm-usage");
```

GitHub Actions example:

```yaml
- name: Set up JDK 17
  uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'

- name: Run visual tests
  run: testivai run "mvn test"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`TestivAIWitness.witness()` uses `JavascriptExecutor` to call `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
