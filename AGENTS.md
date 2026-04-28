# MCP Schema Evolution - AI Agent Guidelines

## Overview

This document provides guidelines for AI agents (including Claude, GitHub Copilot, and other AI assistants) working on the mcp-schema-evolution project. The goal is to ensure consistent, high-quality development that aligns with the project's enterprise-grade standards.

## Project Context

**Project**: mcp-schema-evolution  
**GitHub User**: reaatech  
**Tech Stack**: TypeScript 5.x, pnpm, Vitest, ESLint, Prettier  
**Architecture**: Modular monorepo with plugin system  
**Target**: Enterprise-grade, production-ready library

## Core Principles for AI Agents

### 1. Type Safety First

- Always use strict TypeScript types
- Never use `any` type without explicit justification
- Leverage TypeScript's type system to prevent runtime errors
- Use branded types for schema versioning

### 2. Backward Compatibility

- Prioritize non-breaking changes
- Always consider migration paths
- Generate backward-compatible wrappers when needed
- Document breaking changes clearly

### 3. Test-Driven Development

- Write tests before implementation
- Maintain >90% test coverage
- Include edge cases and error scenarios
- Use property-based testing for complex algorithms

### 4. Performance Awareness

- Optimize for large-scale schema operations
- Consider memory efficiency
- Implement caching where appropriate
- Benchmark critical paths

### 5. Documentation Excellence

- Write comprehensive JSDoc comments
- Include usage examples
- Document migration strategies
- Maintain changelog entries

## Development Workflow

### Code Generation Guidelines

When generating code, AI agents should:

1. **Follow Existing Patterns**: Match the style and patterns in existing code
2. **Use TypeScript Strict Mode**: Enable all strict type-checking options
3. **Implement Error Handling**: Include proper error handling and validation
4. **Add Type Guards**: Use type guards for runtime type validation
5. **Include JSDoc**: Document all public APIs with examples

### Monorepo Structure

The project uses pnpm workspaces:

- `packages/core/` — diffing, wrapping, deprecation, changelog
- `packages/cli/` — command-line interface
- `packages/ci/` — GitHub Actions and CI reporters

### Code Review Checklist

AI agents should self-review code against this checklist:

- [ ] TypeScript strict mode compliance (no `any` in public APIs)
- [ ] Test coverage >90%
- [ ] Error handling implemented (prefer `Result<T>` over throwing)
- [ ] Documentation complete
- [ ] Performance considerations addressed
- [ ] Security implications reviewed
- [ ] Breaking changes documented
- [ ] Migration paths provided

### Commit Message Standards

Follow conventional commits:

```
feat: add field mapping for nested objects
fix: resolve type coercion edge case
docs: update migration guide examples
test: add property-based tests for schema diffing
perf: optimize change detection algorithm
```

## Agent Skills and Capabilities

### Available Agent Skills

The project includes specialized agent skills in the `skills/` directory:

1. **schema-diffing**: Schema comparison and change detection
2. **wrapper-generation**: Backward-compatible adapter generation
3. **deprecation-management**: Deprecation tracking and warnings
4. **changelog-generation**: Automated changelog creation
5. **ci-cd-integration**: CI/CD pipeline integration
6. **type-mapping**: Custom type conversion and coercion
7. **performance-optimization**: Performance analysis and optimization
8. **security-audit**: Security review and vulnerability detection

### Skill Usage Examples

Each skill includes:

- Purpose and capabilities
- Usage examples
- Configuration options
- Best practices
- Common pitfalls

## Quality Assurance

### Automated Checks

AI agents should ensure code passes:

1. **TypeScript Compilation**: No type errors
2. **ESLint**: No linting violations
3. **Prettier**: Proper code formatting
4. **Vitest**: All tests passing
5. **Performance Benchmarks**: Within acceptable ranges

### Manual Review Points

Human review should focus on:

1. **Architecture Alignment**: Does this fit the overall architecture?
2. **API Design**: Is the API intuitive and consistent?
3. **Error Messages**: Are errors clear and actionable?
4. **Documentation**: Is documentation complete and accurate?
5. **Security**: Are there any security vulnerabilities?

## Integration with Development Tools

### GitHub Integration

- Use GitHub Actions for CI/CD
- Implement status checks for schema validation
- Create automated release workflows
- Generate release notes from changelogs

### IDE Integration

- Provide VS Code extensions for real-time validation
- Support JetBrains IDEs with custom inspections
- Enable inline documentation and examples
- Offer quick-fix suggestions for common issues

## Security Considerations

### Code Security

AI agents must:

1. **Validate All Inputs**: Never trust external schema definitions
2. **Avoid Code Injection**: Sanitize user-provided transformers
3. **Implement Rate Limiting**: Prevent abuse in CI/CD integrations
4. **Use Secure Defaults**: Apply principle of least privilege
5. **Audit Dependencies**: Regular security audits of dependencies

### Data Privacy

- Never log sensitive schema information
- Implement data minimization principles
- Provide anonymization options for telemetry
- Comply with relevant data protection regulations

## Performance Guidelines

### Performance Targets

- **Schema Parsing**: <10ms for typical schemas
- **Change Detection**: <50ms for schema comparison
- **Wrapper Generation**: <100ms for wrapper creation
- **Memory Usage**: <50MB for large schema sets
- **Bundle Size**: <50KB gzipped for core library

### Optimization Strategies

1. **Lazy Loading**: Load schemas on-demand
2. **Caching**: Cache parsed schemas and diff results
3. **Parallel Processing**: Process independent schemas concurrently
4. **Incremental Diffing**: Only diff changed portions
5. **Memory Efficiency**: Stream large schemas

## Testing Strategy

### Test Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Snapshot Tests**: Verify output consistency
4. **Property-based Tests**: Test edge cases and invariants
5. **Performance Tests**: Benchmark performance characteristics
6. **Security Tests**: Test security boundaries and vulnerabilities

### Test Coverage Requirements

- **Core Modules**: >95% coverage
- **Integration Points**: >90% coverage
- **Edge Cases**: Comprehensive coverage
- **Error Paths**: 100% coverage

## Documentation Standards

### API Documentation

All public APIs must include:

````typescript
/**
 * Brief description of the function.
 *
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = myFunction(arg1, arg2);
 * ```
 *
 * @throws {ErrorType} When this error occurs
 *
 * @beta - This API is in beta and may change
 */
````

### Migration Guides

When making breaking changes, provide:

1. **Change Summary**: What changed and why
2. **Impact Assessment**: Who is affected and how
3. **Migration Steps**: Step-by-step migration instructions
4. **Code Examples**: Before and after code examples
5. **Automated Tools**: Scripts to help with migration

## Troubleshooting and Support

### Common Issues

1. **Type Errors**: Check TypeScript configuration and strict mode
2. **Performance Issues**: Review algorithm complexity and caching
3. **Memory Leaks**: Check for circular references and proper cleanup
4. **CI/CD Failures**: Verify configuration and dependencies

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Documentation**: Comprehensive guides and examples
- **Community**: Join our Discord server for real-time help

## Future Enhancements

### Planned Features

1. **Visual Schema Diff**: Web UI for visualizing schema changes
2. **Automated Migration**: AI-assisted migration code generation
3. **Schema Registry**: Centralized schema version management
4. **Real-time Validation**: IDE plugins for real-time schema validation
5. **Multi-schema Orchestration**: Coordinate evolution across multiple schemas

### Extension Opportunities

- **Custom Validators**: Plugin system for custom validation rules
- **Type Mappings**: Extensible type conversion system
- **Change Detectors**: Custom change detection algorithms
- **Output Formats**: Pluggable output format generators
- **CI/CD Providers**: Support for additional CI/CD platforms

## Contributing Guidelines

### For AI Agents

1. **Understand the Context**: Read DEV_PLAN.md and ARCHITECTURE.md
2. **Follow Patterns**: Match existing code style and patterns
3. **Test Thoroughly**: Ensure comprehensive test coverage
4. **Document Completely**: Provide clear documentation
5. **Review Carefully**: Self-review before submitting

### For Human Developers

1. **Set Clear Goals**: Define what you want to accomplish
2. **Provide Context**: Give AI agents sufficient context
3. **Review Critically**: Don't accept AI-generated code blindly
4. **Test Independently**: Verify AI-generated tests
5. **Maintain Standards**: Uphold project quality standards

## License and Legal

- **License**: MIT License
- **Copyright**: reaatech and contributors
- **Patents**: No patent rights asserted
- **Trademarks**: MCP Schema Evolution is a trademark of reaatech

## Acknowledgments

This project builds on the work of many open-source contributors and follows best practices from:

- Protocol Buffers schema evolution
- JSON Schema specification
- OpenAPI specification
- Semantic Versioning
- Conventional Commits

---

**Note**: This document is maintained by the project maintainers and AI agents. For questions or updates, please open an issue or pull request.
