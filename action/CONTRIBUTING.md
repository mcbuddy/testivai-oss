# Contributing to testivai-action

Thank you for your interest in contributing! This document provides guidelines for contributing to the TestivAI GitHub Action.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/testivai/testivai-action.git
cd testivai-action

# Install dependencies
npm install

# Run tests
npm test

# Build (bundles with ncc)
npm run build
```

## Pull Request Process

1. Fork the repository and create a branch
2. Make your changes with clear commit messages
3. Add/update tests as needed
4. Ensure all tests pass: `npm test`
5. Run `npm run build` to update the bundled `dist/index.js`
6. Submit a pull request with a clear description

## Code Style

- TypeScript with strict mode enabled
- 2-space indentation
- Single quotes for strings
- No trailing semicolons (where optional)

## Testing Changes

Since this is a GitHub Action, testing requires:
1. Unit tests: `npm test`
2. Integration testing in a test repository
3. The bundled `dist/index.js` must be committed

## Reporting Issues

Please use GitHub Issues to report bugs or request features. Include:
- Clear description of the issue
- Workflow YAML that reproduces the problem
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
