# Verification — account-deletion request page

Commands used the installed Node entry points because `pnpm exec` in this
workspace did not resolve executable shims (despite installed dependencies).

| Check | Result |
| --- | --- |
| `node node_modules/prisma/build/index.js generate` | Passed |
| `node node_modules/prisma/build/index.js validate` | Passed |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node node_modules/next/dist/bin/next build` | Passed; public page, intake API and protected review route included |
| ESLint on every changed TS/TSX file | Passed |
| Repository-wide ESLint | Failed: 107 errors, 18 warnings in existing files outside this change |
| New account-deletion tests | 7 passed |
| Account-deletion + footer/policy + dashboard-auth + auth-return + Google-auth tests | 26 passed total, including the 7 new tests |
| Additional Android destination, dual-auth, dashboard-redesign and production-route suites | 10 passed, 19 failed, 1 skipped; 3 dashboard content assertions fail, and 16 production tests fail their shared startup hook because DATABASE_URL is absent |
| Existing rendered-HTML test | 1 passed, 1 failed: expects missing `dist/server/index.js`, while the current build produces `.next` |
| Local production HTTP smoke checks | Anonymous page returned 200 with the expected title/form; foreign-origin POST 403; invalid identifier 400; valid input with missing configuration 503; anonymous admin route 302 |
| `git diff --check` | Passed |

No production migration was applied. No account was deleted or modified.
Successful database persistence, multi-process PostgreSQL locking, administrator
review and live deployment still need staging verification with a migrated
database and AUTH_SECRET. Unit tests exercise intake with a fake transaction;
they do not substitute for that integration check.

Browser visual inspection was attempted but the computer-use runtime failed to
initialize with a Windows sandbox ACL error. The page uses the existing LegalPage
component and production-rendered HTML was checked, but no screenshot review is
claimed.
