# @testivai/witness-selenium

## 0.1.0

### Minor Changes

- e2d634d: New package: native Selenium WebDriver adapter. `testivai.witness(driver, name)` captures through Selenium's public APIs — full-page via CDP on Chrome/Edge, viewport elsewhere — with the same stabilization, ignoreSelectors, variant keying, and on-disk contract as every other TestivAI adapter. Pairs with `testivai report` for the compare/report half.

### Patch Changes

- Updated dependencies [7cb179f]
  - @testivai/witness@1.3.1
