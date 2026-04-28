---
sidebar_position: 10
title: Selenium + JUnit 5
---

# Selenium + JUnit 5

Add visual regression testing to your existing Selenium + JUnit 5 Maven project. `TestivAIWitness.witness(driver, "name")` integrates with standard JUnit 5 `@BeforeAll` / `@Test` / `@AfterAll` lifecycle.

---

## Prerequisites

- Java 11+
- Chrome browser
- Maven project with Selenium and JUnit 5 dependencies

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

  <!-- JUnit 5 -->
  <dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.2</version>
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
? Select your test framework:  › Selenium (JUnit 5)
? Where are your test files?   › src/test/java
```

The wizard generates two files in `src/test/java/testivai/`:

| File | Purpose |
|---|---|
| `TestivAIWitness.java` | Static `witness(driver, name)` helper class |
| `VisualExampleTest.java` | Working example test with JUnit 5 lifecycle |

---

## 4. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 5. Chrome Setup

Add `--remote-debugging-port=9222` to `ChromeOptions` in your `@BeforeAll`:

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.junit.jupiter.api.BeforeAll;

class VisualTest {
    static WebDriver driver;

    @BeforeAll
    static void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-debugging-port=9222");
        driver = new ChromeDriver(options);
    }
}
```

---

## 6. Add Capture Calls

Import `TestivAIWitness` and call `witness()` in your test methods:

```java
import testivai.TestivAIWitness;

@Test
void homepageLooksCorrect() {
    driver.get("http://localhost:3000");
    TestivAIWitness.witness(driver, "homepage");
}

@Test
void loginPageLooksCorrect() {
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
