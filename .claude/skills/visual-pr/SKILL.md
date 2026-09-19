---
name: visual-pr
description: Only use when the user explicitly invokes this skill by name.
---

<!--
Adapted from humanlayer/skills (plugins/visual-pr/skills/visual-pr), MIT License.
Copyright (c) 2026 HumanLayer. Full license text: ./LICENSE

Modifications from upstream:
- Output paths moved from `.humanlayer/tasks/` to `.claude/tmp/visual-pr/`.
- `gh` CLI calls replaced with GitHub MCP tools (this environment has no `gh`).
- `{SKILLBASE}` replaced with skill-relative paths.
- HumanLayer-specific `task-artifact` fence and "cloud permalink from hook" removed.
-->

# Describe a Pull Request

Create or update the pull request for the current task with a concise description that helps a reviewer understand why the change exists and the shape of the implementation.

## Environment notes

- There is no `gh` CLI here. Every GitHub read and write goes through the `mcp__github__*` tools.
- Resolve `{owner}` and `{repo}` once from `git remote get-url origin`, and pass them to every MCP call.
- `git` itself works normally: use it for status, diff, commit, and push.
- Paths in this file starting with `references/` are relative to this skill's own directory.

## Workflow

1. Read the description template:

   `references/pr_description_template.md`

2. Identify or create the pull request:
   - Get the current branch with `git rev-parse --abbrev-ref HEAD`.
   - Look for an existing PR with `mcp__github__list_pull_requests` using `head: "{owner}:{branch}"` and `state: "open"`. Request only the fields you need, for example `["number","title","state","html_url","head","base"]`.
   - If no PR exists, inspect `git status --short --branch` and the commits on the current branch. Commit task-related changes when needed, push with `git push -u origin {branch}`, then create the PR with `mcp__github__create_pull_request`.
   - Creating a PR is outward-facing. If the user asked only for a description and no PR exists yet, confirm with them before creating one.
   - Never push to a branch other than the one you were told to work on.
   - Ask the user to select a PR only when the current branch has no relevant work and there is no safe current-branch PR to create.

3. Gather only the context needed to explain the change:
   - Read the ticket and any relevant task artifacts.
   - Read the complete PR diff and enough surrounding code to understand behavior and ownership. Use `mcp__github__pull_request_read` with `method: "get_diff"`, or `git diff {base}...HEAD` when the branch is local.
   - Use `mcp__github__pull_request_read` with `method: "get"` for PR metadata and `method: "get_files"` for the changed-file list.
   - Read `references/show-me.md` for the visual-outline conventions used in the PR body.

4. Write the PR description using the template:
   - Keep **Why the change** to exactly one sentence.
   - Keep **Special things to note** to 1-3 bullets. Prioritize reviewer warnings, migrations, compatibility constraints, deliberate omissions, or surprising decisions. Write `- None.` when there are no special considerations.
   - Make **Change outline** a compact, `show-me`-inspired structural view rather than prose or a file-by-file changelog.
   - Include only the views that help explain this PR:
     - SQL table and endpoint contract changes, plus pseudocode for business logic.
     - key data structure / type changes
     - A shallow file tree showing changed responsibilities.
     - React component tree changes, including important hooks, state, and package boundaries.
     - Call-tree, call-stack, control-flow, or data-flow changes.
   - Prefer `diff` blocks when showing changes to an existing shape. Show the complete target shape when most of it is new or diff notation would obscure ownership or order.
   - Keep each view focused on what a reviewer needs. Omit categories that did not change.
   - Optional: if you are aware of a ticket id/url, or related plan/document urls, or other relevant links, include them in the header, otherwise omit the header.

5. Save and publish the description:
   - Save the body to `.claude/tmp/visual-pr/pr-{number}-description.md`. That directory is gitignored, so the draft never lands in the PR diff.
   - There is no `--body-file` equivalent. Read the saved file and pass its full contents as the `body` argument to `mcp__github__update_pull_request` with the PR's `pullNumber`.
   - Confirm the update succeeded with `mcp__github__pull_request_read` using `method: "get"`.

6. Report completion:
   - Read `references/describe_pr_final_answer.md`.
   - Respond using that final answer template with the PR URL, the saved description path, and a concise list of changed files.

Always read and follow `references/pr_description_template.md`. Do not expand the PR body beyond that template.

Write as one human talking to another: avoid jargon and slang, and use simple, coherent, concise language.
