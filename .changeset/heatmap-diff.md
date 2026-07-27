---
"@testivai/witness": minor
---

The diff image is now a proper **heatmap**. Previously changed pixels were direction-colored at ≤75% alpha on a fully transparent background — subtle diffs were nearly invisible. Now:

- **Washed context**: unchanged pixels render as a light grayscale of the baseline, so the heat sits on the actual page instead of a void.
- **Magnitude heat ramp**: changed pixels are fully opaque, yellow (subtle) → orange → red (strong), normalized from the configured threshold to the YIQ maximum.
- **Region outlines**: every detected region gets a 2px deep-red box, so even a handful of changed pixels is findable at page zoom.
- The report's Diff column gains a `subtle → strong` gradient legend.

Diff *detection* (counts, threshold, hash, regions) is byte-for-byte unchanged — this is presentation only.
