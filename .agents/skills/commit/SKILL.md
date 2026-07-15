---
name: commit
description: Activates when the user issues the /commit command to stage, commit, and push all current codebase changes to the Dev branch (or a specified branch) on GitHub.
---

# Workflow: /commit

This command automates staging, committing, and pushing codebase updates to GitHub.

## 1. Parse Arguments
- Review the user's `/commit` command parameters.
- **Commit Message:** If a commit message is provided in quotes, use it. If not, analyze `git status` and generate a concise, professional commit message.
- **Branch Name:** Default to `Dev` unless a specific target branch (e.g., `main`, `feature-auth`) is explicitly specified in the arguments.

## 2. Execute Git Steps
Execute the following commands sequentially inside the codebase directory [opus-form-builder](file:///C:/Users/Luke/Documents/OpusForm/opus-form-builder):
1. Run `git add .` to stage all modified and untracked files.
2. Run `git commit -m "[Commit Message]"` with the parsed/generated message.
3. Run `git push origin [Target Branch]` to upload to the remote GitHub repository.

## 3. Output Completion
- Report the results to the user with a summary of committed changes and the target branch URL.
