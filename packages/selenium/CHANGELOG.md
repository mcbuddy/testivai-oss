# @testivai/witness-selenium

## 0.2.0

### Minor Changes

- 0eb2adb: The Selenium (JavaScript) adapter now captures the element map, so region→selector attribution, the style-only-change verdict, and page-shift detection work there exactly as they do for Playwright. The page-side collector moved into `@testivai/witness` and is exported as `collectElementMap` / `buildElementMapExpression`, so every adapter injects the identical function rather than a copy. New per-call options: `skipElementMap` and `maxElements`. Capture is best-effort — if the script is blocked, the report falls back to the pixel and DOM layers instead of failing.

### Patch Changes

- Updated dependencies [ffc2171]
- Updated dependencies [90109b5]
- Updated dependencies [2a37518]
- Updated dependencies [750562e]
- Updated dependencies [1efe97f]
- Updated dependencies [c9b01a6]
- Updated dependencies [003765d]
- Updated dependencies [cba53b5]
- Updated dependencies [0eb2adb]
- Updated dependencies [9aa0f14]
- Updated dependencies [8997ccd]
  - @testivai/witness@1.12.0

## 0.1.10

### Patch Changes

- Updated dependencies [b70ebd9]
  - @testivai/witness@1.11.1

## 0.1.9

### Patch Changes

- Updated dependencies [f94048d]
- Updated dependencies [8de6c13]
  - @testivai/witness@1.11.0

## 0.1.8

### Patch Changes

- Updated dependencies [271f30d]
  - @testivai/witness@1.10.0

## 0.1.7

### Patch Changes

- Updated dependencies [381279b]
  - @testivai/witness@1.9.0

## 0.1.6

### Patch Changes

- Updated dependencies [139d28d]
- Updated dependencies [1c4c883]
  - @testivai/witness@1.8.0

## 0.1.5

### Patch Changes

- Updated dependencies [fa0deb5]
- Updated dependencies [e37eb33]
  - @testivai/witness@1.7.1

## 0.1.4

### Patch Changes

- Updated dependencies [5bfdca5]
- Updated dependencies [9db57c2]
  - @testivai/witness@1.7.0

## 0.1.3

### Patch Changes

- Updated dependencies [2168b81]
  - @testivai/witness@1.6.0

## 0.1.2

### Patch Changes

- Updated dependencies [a13563e]
  - @testivai/witness@1.5.0

## 0.1.1

### Patch Changes

- Updated dependencies [a8cbabf]
  - @testivai/witness@1.4.0

## 0.1.0

### Minor Changes

- e2d634d: New package: native Selenium WebDriver adapter. `testivai.witness(driver, name)` captures through Selenium's public APIs — full-page via CDP on Chrome/Edge, viewport elsewhere — with the same stabilization, ignoreSelectors, variant keying, and on-disk contract as every other TestivAI adapter. Pairs with `testivai report` for the compare/report half.

### Patch Changes

- Updated dependencies [7cb179f]
  - @testivai/witness@1.3.1
