# Git Workflow Guide

A practical, day-to-day guide for working on LensFlow using Git.

---

## Daily Workflow

### Starting Your Day

```bash
# Always sync with the latest develop before starting work
git checkout develop
git fetch origin
git pull origin develop
```

### Starting a New Task

```bash
# 1. Check the task backlog (project-management/tasks/task_list.md)
# 2. Create a GitHub Issue for the task (use the Task template)
# 3. Create your branch

git checkout develop
git checkout -b feature/task-002-auth-jwt-service
```

### Working on Your Branch

```bash
# Make changes...

# Stage specific files (prefer this over git add .)
git add backend/src/auth/auth.service.ts
git add backend/src/auth/auth.module.ts

# Commit with Conventional Commits format
git commit -m "feat(auth): implement JWT access and refresh token service

Implements AuthService with:
- generateAccessToken() — 15m expiry
- generateRefreshToken() — 7d expiry
- validateToken() — Passport JWT strategy integration

Task: Task-002
Refs #12"
```

### Keeping Your Branch Updated

```bash
# Rebase approach (preferred — keeps linear history)
git fetch origin
git rebase origin/develop

# If conflicts occur during rebase:
git status                    # see what's conflicted
# ... fix conflicts in your editor ...
git add <resolved-file>
git rebase --continue

# If you need to abort the rebase:
git rebase --abort
```

### Pushing and Opening a PR

```bash
# Push your branch
git push -u origin feature/task-002-auth-jwt-service

# If you rebased (force push is needed)
git push --force-with-lease origin feature/task-002-auth-jwt-service
```

Then go to GitHub and open a PR:
- **Base**: `develop`
- **Title**: `feat(auth): implement JWT access and refresh token service`
- Fill out the PR template completely

### After Your PR Is Merged

```bash
# Clean up your local branch
git checkout develop
git pull origin develop
git branch -d feature/task-002-auth-jwt-service

# Clean up remote tracking (optional)
git remote prune origin
```

---

## Useful Git Commands

### Viewing History

```bash
# Pretty log with graph
git log --oneline --graph --decorate --all

# See what changed in a commit
git show <commit-hash>

# See file history
git log --follow -p backend/src/auth/auth.service.ts

# Search commit messages
git log --grep="feat(auth)"

# Find who wrote a specific line
git blame backend/src/auth/auth.service.ts
```

### Stashing Work

```bash
# Save incomplete work temporarily
git stash push -m "WIP: auth service half done"

# List stashes
git stash list

# Apply latest stash
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Drop a stash
git stash drop stash@{0}
```

### Fixing Mistakes

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset --mixed HEAD~1

# Completely undo last commit (DESTRUCTIVE — use carefully)
git reset --hard HEAD~1

# Fix the last commit message (before pushing)
git commit --amend -m "fix(auth): correct token expiry time"

# Add a forgotten file to the last commit
git add forgotten-file.ts
git commit --amend --no-edit

# Revert a pushed commit (safe — creates a new revert commit)
git revert <commit-hash>
git push origin develop
```

### Comparing Changes

```bash
# See unstaged changes
git diff

# See staged changes
git diff --staged

# Compare branch to develop
git diff develop...feature/your-branch

# See what files changed between branches
git diff --name-only develop...feature/your-branch
```

### Tagging Releases

```bash
# Create an annotated tag
git tag -a v1.0.0 -m "Release v1.0.0 — MVP"

# List tags
git tag -l

# Push tags to remote
git push origin --tags

# Delete a tag (before pushing)
git tag -d v1.0.0-wrong

# Delete a remote tag (use carefully)
git push origin --delete v1.0.0-wrong
```

---

## Git Aliases (Recommended Setup)

Add these to your `~/.gitconfig` for faster work:

```ini
[alias]
  # Short status
  s = status -sb
  
  # Pretty log
  lg = log --oneline --graph --decorate --all
  
  # Quick commit (still requires conventional format!)
  c = commit -m
  
  # Pull with rebase
  up = pull --rebase origin develop
  
  # Push new branch
  pub = push -u origin HEAD
  
  # List branches by date
  branches = branch --sort=-committerdate -v
  
  # Show last commit
  last = log -1 HEAD --stat
  
  # Undo last commit, keep changes
  undo = reset --soft HEAD~1
  
  # Clean up merged branches
  cleanup = "!git branch --merged develop | grep -v develop | grep -v main | xargs -r git branch -d"
```

---

## Git Configuration (First-Time Setup)

```bash
# Your identity (used in commits)
git config --global user.name "Tharindu Akalanka"
git config --global user.email "your@email.com"

# Default branch name
git config --global init.defaultBranch main

# Better diff output
git config --global diff.colorMoved zebra

# Rebase by default on pull
git config --global pull.rebase true

# Auto-setup remote tracking
git config --global push.autoSetupRemote true

# Store credentials (Windows)
git config --global credential.helper manager
```

---

## Common Scenarios

### "I accidentally committed to develop directly"

```bash
# 1. Create a branch from your current state
git checkout -b feature/the-thing-i-was-working-on

# 2. Reset develop back to origin/develop
git checkout develop
git reset --hard origin/develop

# 3. Continue work on your feature branch
git checkout feature/the-thing-i-was-working-on
```

### "I need to cherry-pick a fix from another branch"

```bash
# Get the commit hash from the other branch
git log feature/other-branch --oneline

# Apply it to your current branch
git cherry-pick <commit-hash>
```

### "I want to split a large commit into smaller ones"

```bash
# Interactive rebase to edit the commit
git rebase -i HEAD~1   # or HEAD~N to go back N commits

# Mark the commit as 'edit' in the editor
# Then:
git reset HEAD~1       # unstage everything
git add -p             # interactively stage specific hunks
git commit -m "feat(auth): add login endpoint"
git add -p
git commit -m "feat(auth): add JWT signing service"
git rebase --continue
```
