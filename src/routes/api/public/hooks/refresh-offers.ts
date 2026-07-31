import { createFileRoute } from "@tanstack/react-router";
import { KEYWORDS_PER_SEARCH_JOB } from "@/lib/meta-mining.server";

// Endpoint chamado pelo cron (pg_cron) e pelo painel admin.
// Segurança: exige service-role, x-cron-secret ou bearer de usuário admin.
//
// A partir da Fase 3 (batch processing), esse endpoint NÃO roda mais a
// mineração inteira numa única request. Ele só monta o plano, cria a run
// e enfileira os jobs em `meta_refresh_jobs`. Quem de fato processa é o
// worker (`/api/public/hooks/refresh-worker`), chamado repetidamente pelo
// pg_cron a cada minuto, pegando alguns jobs por vez — cada chamada cabe
// folgadamente no limite de CPU do Worker, então a run nunca mais "morre"
// no meio do caminho.

interface RunOptions {
  triggeredBy: "cron" | "admin" | "service";
  respectAutoRefresh: boolean;
}

async function enqueueRefresh(opts: RunOptions) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

  // Cron respeita mining_settings.auto_refresh, igual antes.
  if (opts.respectAutoRefresh && !settings.auto_refresh) {
    await supabaseAdmin.from("mining_logs").insert({
      kind: "run",
      status: "skipped",
      summary: "auto_refresh desligado — cron ignorado",
      details: { triggered_by: opts.triggeredBy, started_at: startedAt } as never,
    });
    return { ok: true, skipped: true, reason: "auto_refresh_disabled" };
  }

  const plan = buildSearchPlan(keywords, settings);
  if (plan.length === 0) {
    return { ok: false, error: "Plano de busca vazio — nenhuma keyword ativa elegível." };
  }

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("meta_refresh_runs")
    .insert({ status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runErr || !runRow) {
    throw new Error(`criar run: ${runErr?.message ?? "sem id retornado"}`);
  }
  const runId = runRow.id as string;

  // Divide o plano em lotes de N keywords — cada lote vira 1 job.
  const jobs: { run_id: string; kind: string; payload: Record<string, unknown> }[] = [];
  for (let i = 0; i < plan.length; i += KEYWORDS_PER_SEARCH_JOB) {
    const chunk = plan.slice(i, i + KEYWORDS_PER_SEARCH_JOB);
    jobs.push({
      run_id: runId,
      kind: "meta.search",
      payload: {
        settings: settings as unknown as Record<string, unknown>,
        steps: chunk,
      },
    });
  }

  const { error: jobsErr } = await supabaseAdmin.from("meta_refresh_jobs").insert(jobs as never);
  if (jobsErr) {
    await supabaseAdmin
      .from("meta_refresh_runs")
      .update({
        status: "blocked",
        finished_at: new Date().toISOString(),
        error: `enfileirar jobs: ${jobsErr.message}`,
      })
      .eq("id", runId);
    throw new Error(`enfileirar jobs: ${jobsErr.message}`);
  }

  await supabaseAdmin.from("mining_logs").insert({
    kind: "run",
    status: "queued",
    summary: `run enfileirada: ${jobs.length} jobs de busca (${plan.length} keywords)`,
    details: {
      run_id: runId,
      triggered_by: opts.triggeredBy,
      started_at: startedAt,
      plan_size: plan.length,
      jobs_enqueued: jobs.length,
    } as never,
  });

  return {
    ok: true,
    run_id: runId,
    plan_size: plan.length,
    jobs_enqueued: jobs.length,
    note:
      "Mineração enfileirada. O worker (rodando a cada minuto) processa os lotes aos poucos — acompanhe o progresso em meta_refresh_runs / mining_logs.",
  };
}

// ---------- Autenticação do endpoint (idêntica à versão anterior) ----------
async function authorize(
  request: Request,
): Promise<{ ok: true; source: RunOptions["triggeredBy"] } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) {
    return { ok: true, source: "cron" };
  }

  const apiKey = request.headers.get("apikey");
  if (serviceKey && apiKey && apiKey === serviceKey) {
    return { ok: true, source: "service" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer && serviceKey && bearer === serviceKey) {
    return { ok: true, source: "service" };
  }
  if (bearer) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.auth.getUser(bearer);
      if (error || !data.user) return { ok: false, reason: "invalid_token" };
      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) return { ok: true, source: "admin" };
      return { ok: false, reason: "not_admin" };
    } catch {
      return { ok: false, reason: "auth_error" };
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
          hint: "POST autenticado (admin bearer, service role ou x-cron-secret). Enfileira uma run — quem processa é /api/public/hooks/refresh-worker.",
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
          return new Response(
            JSON.stringify({ ok: false, error: message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
      
