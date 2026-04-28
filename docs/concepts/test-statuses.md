---
sidebar_position: 5
title: Test Statuses
---

# Test Statuses

TestivAI uses a comprehensive status system to track the lifecycle of visual tests from submission to completion. Understanding these statuses helps you interpret test results and troubleshoot issues.

## Status Categories

### Processing Statuses
These indicate where a test is in the processing pipeline:

| Status | Description |
|--------|-------------|
| **PENDING** | Test has been submitted and is queued for processing |
| **PROCESSING** | Test is currently being analyzed by the AI Worker |

### Terminal Statuses
These indicate a test has completed processing:

| Status | Emoji | Description |
|--------|-------|-------------|
| **PASSED** | ✅ | No visual changes detected from the baseline |
| **NEW_BASELINE** | 🆕 | First run - no baseline exists to compare against |
| **UI_CHANGE_DETECTED** | ⚠️ | Visual changes detected that need review |
| **FAILED** | ❌ | Test execution failed |
| **ERROR** | 🔴 | Processing error occurred |
| **AI_PROCESSING_ERROR** | 🔴 | AI analysis failed |
| **TIMEOUT_ERROR** | 🔴 | Test exceeded time limit |
| **SKIPPED** | ⏭️ | Test was intentionally skipped |

### Special Statuses
| Status | Description |
|--------|-------------|
| **PENDING_AI_REVIEW** | Awaiting AI Counselor review (premium feature) |
| **SUPERSEDED** | This test run has been superseded by a newer one |

## Status Flow

```
PENDING → PROCESSING → [Terminal Status]
    ↓
  (timeout/error)
    ↓
  ERROR/TIMEOUT_ERROR
```

## NEW_BASELINE Status

The **NEW_BASELINE** status is special - it indicates the first time a test runs:

- **When it occurs**: No approved baseline exists for the test
- **What happens**: The current run becomes the baseline
- **In GitHub**: Shows as "🆕 X new baseline(s)" in PR comments
- **Next runs**: Will be compared against this new baseline

## Status in GitHub Integration

### Commit Status
GitHub commit statuses aggregate the test results:

- **success**: All tests passed OR only new baselines created
- **failure**: One or more tests failed
- **error**: Processing errors occurred
- **pending**: Tests are still processing

### PR Comments
PR comments show the detailed breakdown:

```
🔍 TestivAI Visual Report

| Status | Count | Details |
|--------|-------|---------|
| 🆕 New baseline | 3 | First run — no baseline to compare |
| ✅ Passed | 7 | No visual changes detected |
| ⚠️ Visual changes | 2 | Review needed |
```

## Troubleshooting

### Stuck in PROCESSING
If tests remain in PROCESSING status:
1. Check if the AI Worker is running
2. Verify the batch has test runs with terminal statuses
3. Look for errors in the AI Worker logs

### Unexpected PASSED Status
If you see PASSED but expected NEW_BASELINE:
1. Check if this is truly the first run
2. Verify the baseline wasn't already created
3. Look at the `is_baseline` flag in the test run details

### Error Statuses
Common error scenarios:
- **ERROR**: General processing failure
- **AI_PROCESSING_ERROR**: AI analysis failed (will fallback to visual comparison)
- **TIMEOUT_ERROR**: Test took too long to process

## Best Practices

1. **First Runs**: Expect NEW_BASELINE status for new tests
2. **Review Changes**: UI_CHANGE_DETECTED requires manual review
3. **Monitor Errors**: Check logs for ERROR status patterns
4. **Batch Completion**: All tests must reach terminal status for batch to complete
