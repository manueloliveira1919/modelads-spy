<!-- LOVABLE:BEGIN -->
Do not rewrite published Git history; keep synced branches working.
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
- Sales-page interactions, including optional offer duration timers, serialize into export for output parity. Hero defaults use shared heading/media/button siblings; explicit manual orders remain authoritative without rewriting legacy pages.

- QuizElementView serves editor/runner/public; QuizRunner owns navigation, scoring and leads to prevent drift.
- Quiz creation defaults stay separate from legacy normalization — preserve saved styles and opt-in result buttons.
- Quiz uploads use the authenticated asset helper and signed URLs, never embedded data.
- Quiz rich text uses validated runs plus synchronized text; edit the focused DOM before autosave to preserve cursors, never execute user HTML.
- Quiz fonts load once per editor/runner dataset; await font faces before selection to avoid fallback flashes.
- Quiz result presentation owns analysis timing; per-visit readiness gates delayed buttons and shared runner actions, keeping session/scoring/leads unchanged.
- Quiz import/export/AI share a validated portable JSON contract and creation path; remapped section keys preserve logic with fresh identities.
- Extension releases: every change in extension/ must bump manifest.json version and regenerate public/modelads-extension.zip via `bun scripts/pack-extension.ts` — the app reads the version from the manifest, so zip and displayed version must match.
- Cakto payments: the webhook only verifies the signature and calls SQL `cakto_ingest_event`; matching, subscription writes and plan role sync live in SQL (`cakto_process_event`), and signups replay unmatched events via `handle_new_user` — one idempotent path for webhook and late signup.
- Effective plan: SQL `get_effective_plan` (admin > manual override in user_plan_overrides > active Cakto subscription > free) is the only plan source; current_plan_code/has_feature/can_view_offers and the UI's isPro derive from it, and only `admin_set_user_plan` (server-checked admin) changes another user's plan — Cakto never overrides a manual plan.
- Offer covers arrive as admin extension JPEG thumbnails: bounded body/pixel decoding precedes service-only storage, extension_preview_assets retains archive-ID assets, and isolated attachment triggers write only offer_previews on asset arrival or ad linkage. Bounded authenticated reconciliation repairs concurrent attachment races before cover reads. Existing ads bypass candidate reclassification; Meta download claims stay disabled to preserve retries and mining rules.

- Quiz copy controls share copyText and a selected-text fallback dialog; the external AI guide uses the same portable contract and parser to avoid incompatible imports.
