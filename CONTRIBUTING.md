# Contributing to MCP Schema Evolution

Thank you for your interest in contributing to **mcp-schema-evolution**! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

### Our Standards

Examples of behavior that contributes to a positive environment:

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes
- Focusing on what is best for the overall community

Examples of unacceptable behavior:

- The use of sexualized language or imagery, and sexual attention or advances
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git** >= 2.30.0

### Installation

1. Fork the repository:

   ```bash
   gh repo fork reaatech/mcp-schema-evolution
   ```

2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/mcp-schema-evolution.git
   cd mcp-schema-evolution
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Set up pre-commit hooks:
   ```bash
   pnpm prepare
   ```

## Development Setup

### Project Structure

```
mcp-schema-evolution/
├── packages/
│   ├── core/              # Diffing, wrapping, deprecation, changelog
│   ├── cli/               # Command-line interface
│   └── ci/                # CI/CD integration, GitHub Actions
├── skills/                # AI agent skill references
├── tests/                 # Test files (co-located or shared)
├── docs/                  # Documentation
└── examples/              # Example projects
```

### Development Commands

```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run linter
pnpm lint

# Format code
pnpm format

# Run all checks
pnpm check

# Type-check all packages
pnpm typecheck
```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include screenshots if possible**
- **Include error messages and stack traces**

**Template for bug reports:**

```markdown
### Description

A clear and concise description of what the bug is.

### Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior

A clear and concise description of what you expected to happen.

### Actual Behavior

A clear and concise description of what actually happened.

### Environment

- OS: [e.g., macOS 13.0, Windows 11, Ubuntu 22.04]
- Node.js version: [e.g., 18.12.0]
- pnpm version: [e.g., 7.14.0]
- Package version: [e.g., 1.0.0]

### Additional Context

Add any other context about the problem here.
```

### Suggesting Features

Feature suggestions are tracked as GitHub issues. When creating a feature suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested feature**
- **Explain why this feature would be useful**
- **Provide examples of how this feature would be used**
- **List similar features in other projects (if any)**

**Template for feature requests:**

```markdown
### Feature Description

A clear and concise description of what you want to happen.

### Motivation

Why do you need this feature? What problem does it solve?

### Examples

Show how this feature would be used with code examples.

### Alternatives Considered

What alternatives have you considered? Why are they not sufficient?

### Additional Context

Add any other context, mockups, or screenshots here.
```

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- **Good First Issues**: Issues labeled `good first issue` are a great place to start
- **Help Wanted**: Issues labeled `help wanted` need contributions
- **Documentation**: Help improve our documentation

#### Steps for Your First Contribution

1. **Find an issue** you'd like to work on
2. **Comment on the issue** to let others know you're working on it
3. **Create a fork** of the repository
4. **Create a branch** for your work:
   ```bash
   git checkout -b feat/your-feature-name
   ```
5. **Make your changes** following our coding standards
6. **Write tests** for your changes
7. **Commit your changes** using conventional commits
8. **Push to your fork** and create a pull request

## Coding Standards

### TypeScript

- Use **TypeScript strict mode** for all code
- Avoid using `any` type unless absolutely necessary
- Use **branded types** for schema versioning
- Prefer **interfaces** for object shapes
- Use **type aliases** for unions and complex types
- Always define **return types** for functions

### Code Style

- Use **Prettier** for code formatting
- Use **ESLint** for code quality
- Follow **conventional commits** for commit messages
- Keep lines under **100 characters** when possible
- Use **meaningful variable names**

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body

footer
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(schema-diff): add support for nested field comparison

- Implement recursive field comparison
- Add change detection for nested objects
- Update documentation

Closes #123

---

fix(wrapper-generation): resolve type coercion edge case

- Handle null values in type coercion
- Add validation for edge cases
- Update unit tests

---

docs(contributing): update development setup instructions

- Add Node.js version requirements
- Update pnpm installation steps
- Clarify pre-commit hook setup
```

### Documentation

- Write **JSDoc comments** for all public APIs
- Include **usage examples** in documentation
- Keep documentation **up-to-date** with code changes
- Use **clear and concise language**

**JSDoc Example:**

````typescript
/**
 * Compares two schema versions and returns the differences.
 *
 * @param oldSchema - The old schema version
 * @param newSchema - The new schema version
 * @returns A list of changes between the schemas
 *
 * @example
 * ```typescript
 * const changes = await differ.compare(oldSchema, newSchema);
 * console.log(changes);
 * // Output: [{ type: 'breaking', description: '...' }]
 * ```
 *
 * @throws {SchemaValidationError} If schemas are invalid
 *
 * @beta This API is in beta and may change
 */
async compare(oldSchema: MCPSchema, newSchema: MCPSchema): Promise<SchemaChange[]> {
  // Implementation
}
````

## Testing

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Snapshot Tests**: Verify output consistency
- **Property-based Tests**: Test edge cases and invariants
- **Performance Tests**: Benchmark performance characteristics

### Writing Tests

- Place tests in `tests/` directory
- Use **descriptive test names**
- Test **happy paths** and **edge cases**
- Test **error conditions**
- Maintain **>90% test coverage**

**Test Example:**

```typescript
describe('SchemaDiffer', () => {
  describe('compare', () => {
    it('should detect field addition', async () => {
      const oldSchema = createSchema({ name: { type: 'string' } });
      const newSchema = createSchema({
        name: { type: 'string' },
        email: { type: 'string' },
      });

      const changes = await differ.compare(oldSchema, newSchema);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'non-breaking',
          category: 'FIELD_ADDED',
          path: 'email',
        })
      );
    });

    it('should detect breaking field removal', async () => {
      const oldSchema = createSchema({
        name: { type: 'string' },
        email: { type: 'string' },
      });
      const newSchema = createSchema({ name: { type: 'string' } });

      const changes = await differ.compare(oldSchema, newSchema);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'breaking',
          category: 'FIELD_REMOVED',
          path: 'email',
        })
      );
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/schema-diffing.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="should detect"
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Run linter** and fix any issues
5. **Format code** with Prettier
6. **Update CHANGELOG.md** with your changes

### PR Title and Description

- Use a **clear and descriptive title**
- Reference related issues in the description
- Explain **what** changed and **why**
- Include **testing instructions** if applicable

**PR Template:**

```markdown
## Description

Brief description of the changes made in this PR.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

Closes #123
Fixes #456

## Testing

Describe the testing done for this change:

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
```

### Code Review

- Be **respectful** and **constructive** in reviews
- **Explain** your reasoning for suggested changes
- **Approve** PRs that meet our standards
- **Request changes** when necessary
- **Address review feedback** promptly

### Merging

- PRs require **at least one approval** from a maintainer
- All **CI checks must pass**
- **Squash and merge** for most PRs
- **Rebase and merge** for complex histories

## Community

### Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community chat for real-time help
- **Twitter**: Follow @reaatech for updates

### Recognition

We appreciate all contributions! Contributors will be recognized in:

- **README.md**: List of contributors
- **CHANGELOG.md**: Credit for changes
- **Release notes**: Highlighting major contributions

### Governance

The project is maintained by **reaatech** and follows a **benevolent dictator** governance model. Major decisions are discussed in GitHub issues and discussions before implementation.

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to **mcp-schema-evolution**! 🎉
