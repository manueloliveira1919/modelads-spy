<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Extension tokens: store only SHA-256 hashes; access checks (suspended, active subscription, feature) live in SQL `extension_access_check` and run on every validation — keeps one source of truth.
- Suspension checks reuse `is_user_suspended` via `src/lib/account-guard.server.ts` — single reusable guard for all future protected access.
- Extension candidates never write to meta_offers/offers directly: they land in extension_candidates and are injected as a partial-coverage run starting at the classify phase — so they pass the same classification and never deactivate the catalog.
- Extension candidates are claimed atomically (claim_token + SKIP LOCKED) before processing; stale claims return to pending and become failed after 3 attempts, so retries never duplicate offers or touch the catalog.
- Extension gallery renders keyed, data-only in-memory snapshots scoped to the current Meta search; exclude extension UI from discovery and observation to preserve Facebook-owned DOM and prevent feedback loops.
- Sales page builder: one `sales_pages` row holds sections/settings as JSON, and one `PageRenderer` (inline styles + `PAGE_CSS`, container queries) feeds the editor, HTML export and the public page — keeps all outputs identical. Public `/p/$slug` renders the exported HTML in a sandboxed iframe without same-origin so user pixels/scripts can't reach the app session.
- Sales page buttons normalize legacy single-button fields without rewriting saved pages; optional section element order and page backgrounds stay in the existing JSON and pass through the shared renderer — preserves history and output parity without migrations.
- Sales page element overrides, custom elements and sibling-group ordering are optional section JSON interpreted by the shared renderer; legacy flattened ordering is preserved — prevents edits to one element from mutating siblings or persisted history.
- Sales page button destinations resolve against visible section IDs and the selected popular plan in one shared helper; interactive scripts own carousel, accordion and countdown teardown — keeps editor warnings and exported navigation consistent without new backend logic.
- Sales page share links use a single published-origin resolver, with current origin on published/custom domains and a production fallback on preview hosts — prevents copying draft preview URLs.
- Sales-page-only interactive sections use scoped data-attribute event delegation serialized into HTML export, while guarantee badges are self-contained SVG and section fields remain JSON — ensures editor/public/export parity without touching the quiz engine or adding schema.

- Quiz elements render through `QuizElementView` in editor and runner; session, navigation, scoring and lead submission stay in `QuizRunner` — prevents visual drift without changing execution rules.
- Quiz creation defaults are separate from legacy normalization defaults — new styling never overwrites saved or missing legacy settings.
- Quiz image uploads reuse the existing authenticated private asset upload helper — persist signed URLs rather than embedding file data in JSON.
- Quiz rich text is data-only validated runs with synchronized plain text; selection edits update the focused DOM before autosave to preserve the cursor and avoid user HTML execution.
- Quiz font stylesheets are stable per editor or complete runner dataset; await font faces before applying selections to prevent fallback flashes.
- Result presentation owns analysis/count-up timing and signals readiness to the runner; session navigation, scoring and lead writes remain unchanged.
- Extension releases: every change in extension/ must bump manifest.json version and regenerate public/modelads-extension.zip via `bun scripts/pack-extension.ts` — the app reads the version from the manifest, so zip and displayed version must match.
- Cakto payments: the webhook only verifies the signature and calls SQL `cakto_ingest_event`; matching, subscription writes and plan role sync live in SQL (`cakto_process_event`), and signups replay unmatched events via `handle_new_user` — one idempotent path for webhook and late signup.
