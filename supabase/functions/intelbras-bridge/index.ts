// Intelbras DVR Bridge - Snapshots via CGI Digest Auth
// Deno Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ============================================================
// HTTP Digest Auth (RFC 2617) - Intelbras/Dahua usa MD5
// ============================================================
async function md5(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseDigestChallenge(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  const cleaned = header.replace(/^Digest\s+/i, "");
  const regex = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(cleaned)) !== null) {
    result[m[1]] = m[2] ?? m[3];
  }
  return result;
}

async function digestFetch(
  url: string,
  user: string,
  pass: string,
  timeoutMs = 15000,
): Promise<Response> {
  const u = new URL(url);
  const path = u.pathname + u.search;

  // Primeira request - espera 401 com challenge (timeout curto: falha rápido se host inalcançável)
  const firstTimeout = Math.min(timeoutMs, 8000);
  const ctrl1 = new AbortController();
  const t1 = setTimeout(() => ctrl1.abort(), firstTimeout);
  const first = await fetch(url, { signal: ctrl1.signal }).catch((e) => {
    const isAbort = e?.name === "AbortError" || /aborted/i.test(e?.message || "");
    if (isAbort) {
      throw new Error(
        `Não foi possível conectar a ${u.host} em ${firstTimeout / 1000}s. ` +
        `Verifique se o DDNS do DVR está ativo, se a porta ${u.port || (u.protocol === "https:" ? 443 : 80)} ` +
        `está redirecionada no roteador para o DVR e se o firewall não está bloqueando.`,
      );
    }
    throw new Error(`Conexão falhou: ${e.message}`);
  });
  clearTimeout(t1);

  if (first.status !== 401) return first;

  const wwwAuth = first.headers.get("www-authenticate") || "";
  if (!wwwAuth.toLowerCase().startsWith("digest")) {
    throw new Error(`Servidor não suporta Digest auth: ${wwwAuth}`);
  }

  const ch = parseDigestChallenge(wwwAuth);
  const realm = ch.realm || "";
  const nonce = ch.nonce || "";
  const qop = ch.qop;
  const algorithm = (ch.algorithm || "MD5").toUpperCase();
  const opaque = ch.opaque;

  const ha1 = await md5(`${user}:${realm}:${pass}`);
  const ha2 = await md5(`GET:${path}`);
  const cnonce = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const nc = "00000001";

  let response: string;
  if (qop) {
    response = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  } else {
    response = await md5(`${ha1}:${nonce}:${ha2}`);
  }

  const parts = [
    `username="${user}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${path}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
  ];
  if (qop) {
    parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  }
  if (opaque) parts.push(`opaque="${opaque}"`);

  const authHeader = `Digest ${parts.join(", ")}`;

  const ctrl2 = new AbortController();
  const t2 = setTimeout(() => ctrl2.abort(), timeoutMs);
  const second = await fetch(url, {
    headers: { Authorization: authHeader },
    signal: ctrl2.signal,
  });
  clearTimeout(t2);
  return second;
}

// ============================================================
// Encrypt/Decrypt simples (XOR + base64) - usa SERVICE_KEY como chave
// ============================================================
function xorCipher(text: string, key: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return out;
}
function encryptPassword(plain: string): string {
  return btoa(xorCipher(plain, SERVICE_KEY.slice(0, 32)));
}
function decryptPassword(enc: string): string {
  try {
    return xorCipher(atob(enc), SERVICE_KEY.slice(0, 32));
  } catch {
    return enc; // retro-compat
  }
}

// ============================================================
// Validação de host (defesa em profundidade)
// ============================================================
const PRIVATE_IPV4_REGEX = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
];
function isPrivateHost(host: string): boolean {
  const h = (host || "").trim().toLowerCase();
  if (!h || h === "localhost") return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    return PRIVATE_IPV4_REGEX.some((r) => r.test(h));
  }
  return false;
}

// ============================================================
// Snapshot CGI
// ============================================================
async function fetchSnapshot(
  host: string,
  port: number,
  user: string,
  pass: string,
  channel: number,
  protocol: "http" | "https" = "https",
): Promise<Uint8Array> {
  if (isPrivateHost(host)) {
    throw new Error(
      `Host "${host}" é endereço privado/local — inacessível a partir da nuvem. ` +
      `Configure o DDNS Intelbras no DVR e use o domínio público (ex: granja.ddns-intelbras.com.br).`,
    );
  }
  const url = `${protocol}://${host}:${port}/cgi-bin/snapshot.cgi?channel=${channel}`;

  const res = await digestFetch(url, user, pass);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Snapshot canal ${channel} falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 1000) {
    throw new Error(`Snapshot canal ${channel} retornou imagem inválida (${buf.length} bytes)`);
  }
  return buf;
}

// Resolve protocolo+porta a partir do registro do DVR (com defaults para retro-compat)
function resolveDvrConn(dvr: any): { protocol: "http" | "https"; port: number } {
  const protocol: "http" | "https" = dvr?.protocolo === "http" ? "http" : "https";
  const port = protocol === "http"
    ? Number(dvr?.porta_http ?? 80)
    : Number(dvr?.porta_https ?? 443);
  return { protocol, port };
}

// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/intelbras-bridge/, "").replace(/\/+$/, "") || "/";

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ============================================================
    // POST /snapshot-all-cron — acionado pelo pg_cron, sem JWT de usuário
    // Itera todos os DVRs ativos e captura snapshots de todos os canais
    // ============================================================
    if (req.method === "POST" && path === "/snapshot-all-cron") {
      const { data: dvrs } = await supabase
        .from("cameras_dvr")
        .select("*")
        .eq("ativo", true);

      let totalOk = 0, totalFail = 0, dvrsProcessados = 0;

      for (const dvr of dvrs || []) {
        const { data: canais } = await supabase
          .from("cameras_canais")
          .select("*")
          .eq("dvr_id", dvr.id)
          .eq("ativo", true);
        if (!canais || canais.length === 0) continue;

        // Respeita snapshot_intervalo_seg por canal
        const agora = Date.now();
        const canaisDevidos = canais.filter((c: any) => {
          if (!c.ultimo_snapshot_em) return true;
          const ultimoMs = new Date(c.ultimo_snapshot_em).getTime();
          const intervaloMs = (c.snapshot_intervalo_seg || 300) * 1000;
          return (agora - ultimoMs) >= intervaloMs;
        });
        if (canaisDevidos.length === 0) continue;

        const senha = decryptPassword(dvr.senha_encrypted);
        const { protocol: dvrProto, port: dvrPort } = resolveDvrConn(dvr);
        const results = await Promise.allSettled(
          canaisDevidos.map(async (c: any) => {
            const buf = await fetchSnapshot(
              dvr.host, dvrPort, dvr.usuario, senha, c.canal_numero, dvrProto,
            );
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const storagePath = `${dvr.integrado_id}/${c.id}/${dateStr}/${now.getTime()}.jpg`;
            await supabase.storage.from("camera-snapshots")
              .upload(storagePath, buf, { contentType: "image/jpeg" });
            await supabase.from("cameras_snapshots").insert({
              canal_id: c.id, lote_id: c.lote_id, storage_path: storagePath,
              tipo: "agendado", tamanho_bytes: buf.length, capturado_em: now.toISOString(),
            });
            await supabase.from("cameras_canais")
              .update({ ultimo_snapshot_em: now.toISOString() }).eq("id", c.id);
          }),
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;
        totalOk += ok; totalFail += fail; dvrsProcessados++;

        await supabase.from("cameras_dvr").update({
          ultimo_sync: new Date().toISOString(),
          status_conexao: fail === results.length ? "erro" : "online",
          ultimo_erro: fail > 0 ? `${fail}/${results.length} canal(is) falharam` : null,
        }).eq("id", dvr.id);
      }

      console.log(`intelbras-cron: ${dvrsProcessados} DVRs, ${totalOk} ok, ${totalFail} falhas`);
      return new Response(
        JSON.stringify({ dvrs: dvrsProcessados, ok: totalOk, fail: totalFail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extrai user da JWT
    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("integrado_id")
      .eq("id", user.id)
      .single();
    const integradoId = profile?.integrado_id || user.id;

    // ============================================================
    // POST /test-connection { host, porta_https, usuario, senha }
    // ============================================================
    if (req.method === "POST" && path === "/test-connection") {
      const body = await req.json();
      const { host, porta_https = 443, usuario, senha } = body;
      if (!host || !usuario || !senha) {
        return new Response(JSON.stringify({ error: "host, usuario e senha são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Tenta capturar snapshot do canal 1
        const buf = await fetchSnapshot(host, porta_https, usuario, senha, 1);
        return new Response(
          JSON.stringify({
            ok: true,
            mensagem: "Conexão bem-sucedida",
            tamanho_bytes: buf.length,
            preview_base64: btoa(String.fromCharCode(...buf.slice(0, 50000))),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, error: (e as Error).message }),
          {
            status: 200, // 200 com ok=false para o front tratar
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // ============================================================
    // POST /encrypt-password { senha }
    // ============================================================
    if (req.method === "POST" && path === "/encrypt-password") {
      const { senha } = await req.json();
      if (!senha) {
        return new Response(JSON.stringify({ error: "senha obrigatória" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ encrypted: encryptPassword(senha) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // POST /snapshot { canal_id, tipo? }
    // ============================================================
    if (req.method === "POST" && path === "/snapshot") {
      const { canal_id, tipo = "manual" } = await req.json();
      if (!canal_id) {
        return new Response(JSON.stringify({ error: "canal_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: canal, error: cErr } = await supabase
        .from("cameras_canais")
        .select("*, dvr:cameras_dvr(*)")
        .eq("id", canal_id)
        .single();
      if (cErr || !canal) {
        return new Response(JSON.stringify({ error: "Canal não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const dvr: any = canal.dvr;
      if (dvr.integrado_id !== integradoId) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const senha = decryptPassword(dvr.senha_encrypted);
      const buf = await fetchSnapshot(
        dvr.host,
        dvr.porta_https,
        dvr.usuario,
        senha,
        canal.canal_numero,
      );

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const ts = now.getTime();
      const storagePath = `${integradoId}/${canal_id}/${dateStr}/${ts}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("camera-snapshots")
        .upload(storagePath, buf, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

      const { data: snap, error: insErr } = await supabase
        .from("cameras_snapshots")
        .insert({
          canal_id,
          lote_id: canal.lote_id,
          storage_path: storagePath,
          tipo,
          tamanho_bytes: buf.length,
          capturado_em: now.toISOString(),
        })
        .select()
        .single();
      if (insErr) throw insErr;

      await supabase
        .from("cameras_canais")
        .update({ ultimo_snapshot_em: now.toISOString() })
        .eq("id", canal_id);

      await supabase
        .from("cameras_dvr")
        .update({
          ultimo_sync: now.toISOString(),
          status_conexao: "online",
          ultimo_erro: null,
        })
        .eq("id", dvr.id);

      const { data: signed } = await supabase.storage
        .from("camera-snapshots")
        .createSignedUrl(storagePath, 300);

      return new Response(
        JSON.stringify({ snapshot: snap, signed_url: signed?.signedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============================================================
    // POST /snapshot-all { dvr_id }
    // ============================================================
    if (req.method === "POST" && path === "/snapshot-all") {
      const { dvr_id } = await req.json();
      if (!dvr_id) {
        return new Response(JSON.stringify({ error: "dvr_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: dvr, error: dErr } = await supabase
        .from("cameras_dvr")
        .select("*")
        .eq("id", dvr_id)
        .single();
      if (dErr || !dvr || (dvr.integrado_id !== integradoId)) {
        return new Response(JSON.stringify({ error: "DVR não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: canais } = await supabase
        .from("cameras_canais")
        .select("*")
        .eq("dvr_id", dvr_id)
        .eq("ativo", true);

      const senha = decryptPassword(dvr.senha_encrypted);
      const results = await Promise.allSettled(
        (canais || []).map(async (c: any) => {
          const buf = await fetchSnapshot(
            dvr.host, dvr.porta_https, dvr.usuario, senha, c.canal_numero,
          );
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const storagePath = `${integradoId}/${c.id}/${dateStr}/${now.getTime()}.jpg`;
          await supabase.storage.from("camera-snapshots")
            .upload(storagePath, buf, { contentType: "image/jpeg" });
          await supabase.from("cameras_snapshots").insert({
            canal_id: c.id, lote_id: c.lote_id, storage_path: storagePath,
            tipo: "agendado", tamanho_bytes: buf.length, capturado_em: now.toISOString(),
          });
          await supabase.from("cameras_canais")
            .update({ ultimo_snapshot_em: now.toISOString() }).eq("id", c.id);
          return { canal_id: c.id, ok: true };
        }),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      await supabase.from("cameras_dvr").update({
        ultimo_sync: new Date().toISOString(),
        status_conexao: fail === results.length ? "erro" : "online",
        ultimo_erro: fail > 0 ? `${fail} canal(is) falharam` : null,
      }).eq("id", dvr.id);

      return new Response(JSON.stringify({ total: results.length, ok, fail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET /signed-url?path=...
    // ============================================================
    if (req.method === "GET" && path === "/signed-url") {
      const storagePath = url.searchParams.get("path");
      if (!storagePath) {
        return new Response(JSON.stringify({ error: "path obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!storagePath.startsWith(`${integradoId}/`) && !storagePath.startsWith("admin/")) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.storage
        .from("camera-snapshots")
        .createSignedUrl(storagePath, 300);
      if (error) throw error;
      return new Response(JSON.stringify({ signed_url: data.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada", path }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("intelbras-bridge erro:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
