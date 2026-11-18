# Agent guidance

- Inspect the relevant code and tests before changing behavior. Keep changes
  focused and preserve unrelated work in the working tree.
- Never commit, push, or create branches unless the user explicitly asks.
- Never expose, log, or commit secrets. Keep local credentials in ignored
  environment files; do not put real passwords, tokens, or personal data in
  tests or examples.
- Keep database access least-privileged. Use parameterized SQL, and do not use
  the application runtime login for schema changes or database setup.
- Add or update tests for behavior changes. Before finishing, run the relevant
  checks from this list:

  ```bash
  npm test
  npm run lint
  npx tsc --noEmit
  npm run format:check -- .
  npm run build
  ```

  Run `npm run test:db` for database-related changes, only against its
  explicitly disposable local test database.
- Review the final diff for unrelated changes and report checks that could not
  be run or passed.
