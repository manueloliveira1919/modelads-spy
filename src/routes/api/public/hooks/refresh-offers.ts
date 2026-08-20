import { createFileRoute } from "@tanstack/react-router";
import { KEYWORDS_PER_SEARCH_JOB, serverSupabaseAnon } from "@/lib/meta-mining.server";

// Endpoint chamado pelo cron (pg_cron) e pelo painel admin.
// Segurança: exige x-cron-secret (cron) ou bearer de usuário admin logado.
//
// As operações internas da fila usam o cliente privilegiado do servidor.
// As RPCs de mineração permanecem inacessíveis para anon/authenticated.

interface RunOptions {
  triggeredBy: "cron" | "admin" | "service";
  respectAutoRefresh: boolean;
  category?: string | null;
}

async function enqueueRefresh(supabase: any, opts: RunOptions) {
  const {
    loadActiveKeywords,
    loadMiningSettings,
    buildSearchPlan,
    countEligibleKeywords,
    markKeywordsMined,
    getCycleState,
  } = await import("@/lib/mining-config.server");

  const startedAt = new Date().toISOString();

  const [keywords, settings, cycleState] = await Promise.all([
    loadActiveKeywords(),
    loadMiningSettings(),
    getCycleState(),
  ]);

  if (opts.respectAutoRefresh && !settings.auto_refresh) {
    await supabase.rpc("mining_log", {
      p_kind: "run",
      p_status: "skipped",
      p_summary: "auto_refresh desligado — cron ignorado",
      p_details: { triggered_by: opts.triggeredBy, started_at: startedAt },
    });
    return { ok: true, skipped: true, reason: "auto_refresh_disabled" };
  }

  const category = opts.category?.trim() || null;
  const plan = buildSearchPlan(keywords, settings, category);
  if (plan.length === 0) {
    return {
      ok: false,
      error: category
        ? `Nenhuma palavra-chave ativa na categoria "${category}".`
        : "Plano de busca vazio — nenhuma keyword ativa elegível.",
    };
  }

  // Cobertura: só é "full" quando a run roda TODAS as palavras elegíveis,
  // sem filtro de categoria e sem corte de rotação. Runs parciais nunca podem
  // desativar ofertas globalmente na finalização.
  const eligible = countEligibleKeywords(keywords, settings, category);
  const coverage: "full" | "partial" = !category && plan.length >= eligible ? "full" : "partial";

  // Fecha o ciclo quando esta run consome as últimas palavras pendentes.
  const keywordIds = plan.map((s) => s.id).filter(Boolean);
  const closesCycle = !category && keywordIds.length >= cycleState.pending;

  const { data: runId, error: runErr } = await supabase.rpc("mining_create_run", {
    p_started_at: startedAt,
  });
  if (runErr || !runId) {
    throw new Error(`criar run: ${runErr?.message ?? "sem id retornado"}`);
  }

  await supabase.rpc("mining_update_run", {
    p_run_id: runId,
    p_status: "running",
    p_details: {
      category,
      triggered_by: opts.triggeredBy,
      coverage,
      plan_size: plan.length,
      eligible_keywords: eligible,
      cycle: cycleState.cycle,
      cycle_pending_before: cycleState.pending,
      cycle_total_keywords: cycleState.total,
      closes_cycle: closesCycle,
    },
  });

  const jobs: Record<string, unknown>[] = [];
  for (let i = 0; i < plan.length; i += KEYWORDS_PER_SEARCH_JOB) {
    const chunk = plan.slice(i, i + KEYWORDS_PER_SEARCH_JOB);
    jobs.push({
      run_id: runId,
      kind: "meta.search",
      payload: { settings, steps: chunk },
    });
  }

  const { error: jobsErr } = await supabase.rpc("mining_enqueue_jobs", { p_jobs: jobs });
  if (jobsErr) {
    await supabase.rpc("mining_update_run", {
      p_run_id: runId,
      p_status: "blocked",
      p_finished_at: new Date().toISOString(),
      p_error: `enfileirar jobs: ${jobsErr.message}`,
    });
    throw new Error(`enfileirar jobs: ${jobsErr.message}`);
  }

  // Avança o ciclo das palavras usadas para que não repitam antes das demais.
  await markKeywordsMined(supabase, keywordIds, cycleState.cycle);

  await supabase.rpc("mining_log", {
    p_kind: "run",
    p_status: "queued",
    p_summary: `run enfileirada: ${jobs.length} jobs de busca (${plan.length} keywords, ciclo ${cycleState.cycle})`,
    p_details: {
      run_id: runId,
      triggered_by: opts.triggeredBy,
      started_at: startedAt,
      plan_size: plan.length,
      jobs_enqueued: jobs.length,
      category,
      coverage,
      eligible_keywords: eligible,
      cycle: cycleState.cycle,
      closes_cycle: closesCycle,
    },
  });

  return {
    ok: true,
    run_id: runId,
    category,
    plan_size: plan.length,
    jobs_enqueued: jobs.length,
    coverage,
    cycle: cycleState.cycle,
    cycle_pending_before: cycleState.pending,
    closes_cycle: closesCycle,
    note: "Mineração enfileirada. O worker (a cada minuto) processa os lotes aos poucos.",
  };
}


async function authorize(
  request: Request,
): Promise<
  | { ok: true; source: RunOptions["triggeredBy"]; userId?: string }
  | { ok: false; reason: string }
> {
  const cronSecret = process.env.CRON_SECRET;
  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) {
    return { ok: true, source: "cron" };
  }

  // Canonical pg_cron authentication: apikey header with the Supabase anon key.
  const apikey = request.headers.get("apikey");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (apikey && publishableKey && apikey === publishableKey) {
    return { ok: true, source: "cron" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer) {
    try {
      const supabase = await serverSupabaseAnon();
      const { data, error } = await supabase.auth.getUser(bearer);
      if (error || !data.user) return { ok: false, reason: "invalid_token" };
      return { ok: true, source: "admin", userId: data.user.id };
    } catch (err) {
      return { ok: false, reason: `auth_error: ${(err as Error).message}` };
    }
  }

  return { ok: false, reason: "missing_credentials" };
}

export const Route = createFileRoute("/api/public/hooks/refresh-offers")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "refresh-offers",
          hint: "POST autenticado (admin bearer, x-cron-secret ou apikey). Enfileira uma run — quem processa é /api/public/hooks/refresh-worker.",
        }),
      POST: async ({ request }) => {
        const auth = await authorize(request);
        if (!auth.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "unauthorized", reason: auth.reason }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (auth.source === "admin") {
            if (!auth.userId) {
              return Response.json(
                { ok: false, error: "unauthorized", reason: "invalid_token" },
                { status: 401 },
              );
            }
            const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc(
              "mining_is_admin",
              { p_user_id: auth.userId },
            );
            if (roleError) {
              console.error("refresh-offers admin role check error", roleError.message);
              return Response.json(
                { ok: false, error: "authorization_check_failed" },
                { status: 500 },
              );
            }
            if (!isAdmin) {
              return Response.json(
                { ok: false, error: "unauthorized", reason: "not_admin" },
                { status: 403 },
              );
            }
          }

          let category: string | null = null;
          try {
            const body = (await request.json()) as { category?: string | null };
            if (typeof body?.category === "string") category = body.category;
          } catch {
            /* corpo vazio = minerar todas as categorias */
          }

          const result = await enqueueRefresh(supabaseAdmin, {
            triggeredBy: auth.source,
            respectAutoRefresh: auth.source === "cron",
            category,
          });
          return Response.json(result);
        } catch (err) {
          const message = (err as Error).message;
          console.error("refresh-offers (enqueue) error", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
