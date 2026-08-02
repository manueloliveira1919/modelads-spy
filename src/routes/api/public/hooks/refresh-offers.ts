import { createFileRoute } from "@tanstack/react-router";
import { KEYWORDS_PER_SEARCH_JOB, serverSupabaseAnon } from "@/lib/meta-mining.server";

// Endpoint chamado pelo cron (pg_cron) e pelo painel admin.
// Segurança: exige x-cron-secret (cron) ou bearer de usuário admin logado.
//
// Não depende mais de SUPABASE_SERVICE_ROLE_KEY em nenhum momento — todas
// as escritas passam pelas funções `mining_*` do banco (RPC), chamadas
// com a chave pública. A proteção continua sendo esta verificação de
// autorização abaixo, que roda ANTES de qualquer chamada ao banco.

interface RunOptions {
  triggeredBy: "cron" | "admin" | "service";
  respectAutoRefresh: boolean;
}

async function enqueueRefresh(opts: RunOptions) {
  const supabase = await serverSupabaseAnon();
  const {
    loadActiveKeywords,
    loadMiningSettings,
    buildSearchPlan,
  } = await import("@/lib/mining-config.server");

  const startedAt = new Date().toISOString();

  const [keywords, settings] = await Promise.all([
    loadActiveKeywords(),
    loadMiningSettings(),
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

  const plan = buildSearchPlan(keywords, settings);
  if (plan.length === 0) {
    return { ok: false, error: "Plano de busca vazio — nenhuma keyword ativa elegível." };
  }

  const { data: runId, error: runErr } = await supabase.rpc("mining_create_run", {
    p_started_at: startedAt,
  });
  if (runErr || !runId) {
    throw new Error(`criar run: ${runErr?.message ?? "sem id retornado"}`);
  }

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

  await supabase.rpc("mining_log", {
    p_kind: "run",
    p_status: "queued",
    p_summary: `run enfileirada: ${jobs.length} jobs de busca (${plan.length} keywords)`,
    p_details: {
      run_id: runId,
      triggered_by: opts.triggeredBy,
      started_at: startedAt,
      plan_size: plan.length,
      jobs_enqueued: jobs.length,
    },
  });

  return {
    ok: true,
    run_id: runId,
    plan_size: plan.length,
    jobs_enqueued: jobs.length,
    note: "Mineração enfileirada. O worker (a cada minuto) processa os lotes aos poucos.",
  };
}

async function authorize(
  request: Request,
): Promise<{ ok: true; source: RunOptions["triggeredBy"] } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) {
    return { ok: true, source: "cron" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer) {
    try {
      const supabase = await serverSupabaseAnon();
      const { data, error } = await supabase.auth.getUser(bearer);
      if (error || !data.user) return { ok: false, reason: "invalid_token" };
      const { data: isAdmin } = await supabase.rpc("mining_is_admin", {
        p_user_id: data.user.id,
      });
      if (isAdmin) return { ok: true, source: "admin" };
      return { ok: false, reason: "not_admin" };
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
          hint: "POST autenticado (admin bearer ou x-cron-secret). Enfileira uma run — quem processa é /api/public/hooks/refresh-worker.",
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
          const result = await enqueueRefresh({
            triggeredBy: auth.source,
            respectAutoRefresh: auth.source === "cron",
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
