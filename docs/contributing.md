# Contributing to EloInsight

Thank you for your interest in contributing to EloInsight! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender, gender identity, sexual orientation, disability, personal appearance, race, ethnicity, age, religion, or nationality.

### Our Standards
**Positive behavior includes**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes**:
- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites
- Familiarity with Git and GitHub
- Knowledge of TypeScript, Go, or Python (depending on what you want to contribute to)
- Understanding of chess (helpful but not required)

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/EloInsight.git
   cd EloInsight
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original/EloInsight.git
   ```

3. **Install dependencies**
   ```bash
   # See deployment.md for detailed setup
   docker-compose up -d postgres redis rabbitmq
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Reporting Bugs

**Before submitting a bug report**:
- Check existing issues to avoid duplicates
- Collect information about the bug
- Try to reproduce the bug

**Bug Report Template**:
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**:
- OS: [e.g., macOS, Linux, Windows]
- Browser: [e.g., Chrome, Firefox]
- Version: [e.g., 1.0.0]

**Additional context**
Any other context about the problem.
```

### Suggesting Features

**Feature Request Template**:
```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots.
```

### Contributing Code

**Good First Issues**:
Look for issues labeled `good first issue` or `help wanted`.

**Areas to Contribute**:
- **Frontend**: React components, UI/UX improvements
- **Backend**: API endpoints, business logic
- **Analysis**: Stockfish integration, metrics calculation
- **Documentation**: Guides, tutorials, API docs
- **Testing**: Unit tests, integration tests, E2E tests
- **DevOps**: Docker, CI/CD, deployment scripts

## Development Workflow

### 1. Create a Branch

```bash
# Feature branch
git checkout -b feature/add-opening-explorer

# Bug fix branch
git checkout -b fix/analysis-crash

# Documentation branch
git checkout -b docs/update-api-guide
```

### 2. Make Changes

**Commit Message Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```bash
git commit -m "feat(analysis): add opening explorer"
git commit -m "fix(api): resolve game sync crash"
git commit -m "docs(readme): update installation guide"
```

### 3. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

Go to GitHub and create a pull request from your fork.

## Coding Standards

### TypeScript/JavaScript

**Style Guide**: Airbnb JavaScript Style Guide

```typescript
// ✅ Good
export class GameService {
  async getGame(id: string): Promise<Game> {
    const game = await this.repository.findById(id);
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }
    return game;
  }
}

// ❌ Bad
export class GameService {
  async getGame(id) {
    const game = await this.repository.findById(id)
    if (!game) throw new Error('not found')
    return game
  }
}
```

**Linting**:
```bash
npm run lint
npm run lint:fix
```

### Go

**Style Guide**: Effective Go

```go
// ✅ Good
func (s *AnalysisService) AnalyzeGame(ctx context.Context, gameID string) (*Analysis, error) {
    game, err := s.db.GetGame(ctx, gameID)
    if err != nil {
        return nil, fmt.Errorf("failed to get game: %w", err)
    }
    
    return s.analyze(ctx, game)
}

// ❌ Bad
func (s *AnalysisService) analyzeGame(gameID string) *Analysis {
    game, _ := s.db.GetGame(gameID)
    return s.analyze(game)
}
```

**Formatting**:
```bash
go fmt ./...
golangci-lint run
```

### Python

**Style Guide**: PEP 8

```python
# ✅ Good
def calculate_statistics(user_id: str) -> UserStatistics:
    """Calculate comprehensive user statistics.
    
    Args:
        user_id: The user's unique identifier
        
    Returns:
        UserStatistics object with calculated metrics
    """
    games = get_user_games(user_id)
    return UserStatistics(
        total_games=len(games),
        win_rate=calculate_win_rate(games),
    )

# ❌ Bad
def calc_stats(uid):
    games = get_user_games(uid)
    return {'total': len(games)}
```

**Formatting**:
```bash
black .
pylint src/
```

### Testing

**Write tests for**:
- New features
- Bug fixes
- Edge cases

**Test Coverage**: Aim for >80%

```typescript
// Example test
describe('GameService', () => {
  it('should return game by id', async () => {
    const game = await service.getGame('game-123');
    expect(game).toBeDefined();
    expect(game.id).toBe('game-123');
  });
  
  it('should throw NotFoundException for invalid id', async () => {
    await expect(service.getGame('invalid')).rejects.toThrow(NotFoundException);
  });
});
```

## Pull Request Process

### PR Checklist

Before submitting:
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review your code
3. **Feedback**: Address review comments
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges your PR

### After Merge

- Delete your branch
- Update your fork
- Celebrate! 🎉

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Eligible for contributor badges
- Invited to contributor events

## Questions?

- **Discord**: [Join our server](https://discord.gg/eloinsight)
- **GitHub Discussions**: [Ask questions](https://github.com/yourusername/EloInsight/discussions)
- **Email**: contributors@eloinsight.dev

---

Thank you for contributing to EloInsight! ♟️
