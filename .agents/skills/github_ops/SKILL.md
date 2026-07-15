---
name: github-ops
description: CI/CD automation, pull request standards, and secrets compliance.
---

# GitHub Ops Agent Skill

## HARD RULES
- Enforce branch protection controls. All modifications must target the `Dev` branch and push cleanly.
- Never commit hardcoded API keys or passwords.
- Route any failed background queue tasks or webhook failures to a Dead Letter Queue (DLQ) after three retries.

## EXECUTION PROTOCOL
1. **Pull and Fetch**: Align the local workspace with the remote `Dev` branch before performing modifications.
2. **Scan Security**: Verify that no new environment files, secrets, or configurations are exposed.
3. **Commit Changes**: Use the `/commit` workflow to commit, stage, and push files safely.
