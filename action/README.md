# testivai-action

GitHub Action to post TestivAI visual regression results to pull requests.

## Usage

```yaml
name: Visual Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Run your tests with TestivAI
      - run: npx testivai run "npm test"
      
      # Post results to PR
      - uses: testivai/testivai-action@v1
        if: always()
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          report-dir: visual-report
          fail-on-diff: false
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for posting comments | Yes | `${{ github.token }}` |
| `report-dir` | Directory containing results.json | Yes | `visual-report` |
| `fail-on-diff` | Fail workflow if visual changes detected | No | `false` |
| `upload-artifact` | Upload report as artifact | No | `true` |
| `artifact-retention-days` | Days to retain artifact | No | `30` |

## Features

- **PR Comment Upsert**: Posts or updates a comment on pull requests with visual regression results
- **Commit Status**: Sets `TestivAI / visual` commit status
- **Artifact Upload**: Automatically uploads the visual report
- **Approve Commands**: Includes CLI commands in PR comments for approving changes

## Example Output

```
### 🔍 TestivAI Visual Report

✅ 12 passed · ⚠️ 3 changed · 🆕 2 new

#### Changed Snapshots
<details>
<summary>checkout-page — 8.5% different</summary>

```bash
npx testivai approve "checkout-page"
# Or approve all changed snapshots:
npx testivai approve --all
```
</details>
```

## License

MIT

## Support

- Documentation: https://testiv.ai/docs/github-action
- Issues: https://github.com/testivai/testivai-action/issues
- Website: https://testiv.ai
