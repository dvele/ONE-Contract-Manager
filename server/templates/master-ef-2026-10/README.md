This folder holds the Dvele Master Factory Built Home Agreement (2026-10) as reviewed source: `source.docx` is legal's draft, and `clauses.json` and `exhibit-{a..f}.html` are the tool's hand-edited content, which `scripts/install_master_ef_2026.ts` installs.
To revise it when legal sends a new draft, replace `source.docx` and run `npx tsx scripts/draft_master_ef_2026_content.ts server/templates/master-ef-2026-10/source.docx <scratch dir>` to get a fresh first draft.
Diff that draft against the committed files and carry the wording changes over by hand, keeping every `{{VARIABLE}}` substitution, the `MEF26_` slugs, the header/body splits and Exhibit E's numbered headings.
Run `npx vitest run server/lib/__tests__/master-ef-2026-content.test.ts`; its "agreement text is preserved" test fails on any source sentence the content dropped or altered.
Install as a new template version: never edit the clauses of a template that contracts have already been generated from.
