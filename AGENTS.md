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
