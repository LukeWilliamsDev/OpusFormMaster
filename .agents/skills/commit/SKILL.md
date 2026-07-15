---
name: commit
description: Activates on the /commit command to stage, commit, and push all changes to the Dev branch (or a specified branch) on GitHub.
---

# Workflow: /commit

## 1. Parse Arguments
- **Message:** Use the quoted message if provided; otherwise analyze `git status` and generate a concise, professional one.
- **Branch:** Default `Dev` unless another branch is specified. All modifications target `Dev` and must push cleanly.

## 2. Execute (in the workspace root)
1. `git pull origin [Target Branch]` to align with remote.
2. Verify no new env files, secrets, or credentials are staged.
3. `git add .`
4. `git commit -m "[Message]"`
5. `git push origin [Target Branch]`

## 3. Output
Report a summary of committed changes and the target branch.
