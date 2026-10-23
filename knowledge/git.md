# Git best practices

- Small, focused commits that each build and pass tests. Separate refactors from behavior changes.
- Commit messages: imperative subject ≤ 72 chars ("Add retry to upload client"), blank line, body explaining *why*. Follow Conventional Commits (`feat:`, `fix:`) if the repo does — check `git log --oneline`.
- Work on branches (`feature/…`, `fix/…`); keep them short-lived; rebase or merge from main often.
- Never commit secrets, build output, dependencies (`node_modules`, `venv`) or editor junk — maintain `.gitignore`. Use Git LFS for large binaries.
- Review your own diff (`git diff --staged`) before committing. Stage hunks deliberately (`git add -p`).
- Don't rewrite shared history: no `push --force` to shared branches (use `--force-with-lease` on your own branch if you must). Avoid `reset --hard` unless you're sure — `git stash` first.
- Tag releases with semantic versions. Use pull requests with CI checks before merging.
- Recover mistakes with `git reflog`.
