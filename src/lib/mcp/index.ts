import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarLotes from "./tools/listar-lotes";
import resumoLote from "./tools/resumo-lote";
import ambienciaLote from "./tools/ambiencia-lote";
import decisoesBrain from "./tools/decisoes-brain";
import registrarMortalidade from "./tools/registrar-mortalidade";

// O issuer OAuth precisa ser o host direto do Supabase, construído a partir do
// project ref (inline em build time pelo Vite) — nunca de SUPABASE_URL.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gsa-tibiri-mcp",
  title: "GSA Tibiri — Gestão Avícola",
  version: "0.1.0",
  instructions:
    "Ferramentas do GSA Tibiri, sistema de gestão avícola. Use `listar_lotes` para descobrir os lotes e obter os IDs, `resumo_lote` para indicadores zootécnicos (aves vivas, mortalidade, conversão alimentar), `ambiencia_lote` para temperatura/umidade/ITH dos sensores IoT, `decisoes_brain` para auditar as decisões do Climate Brain e `registrar_mortalidade` para lançar baixas do dia. Pesos sempre em KG.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarLotes, resumoLote, ambienciaLote, decisoesBrain, registrarMortalidade],
});
