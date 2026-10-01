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
