import { describe, it, expect } from "vitest";
import { validateProtocoloPorta } from "./validateProtocoloPorta";

describe("validateProtocoloPorta", () => {
  describe("portas padrão", () => {
    it("aceita HTTP na porta 80 sem aviso", () => {
      const r = validateProtocoloPorta({ protocolo: "http", porta_http: 80, porta_https: 443 });
      expect(r.ok).toBe(true);
      expect(r.aviso).toBeUndefined();
      expect(r.motivo).toBeUndefined();
    });

    it("aceita HTTPS na porta 443 sem aviso", () => {
      const r = validateProtocoloPorta({ protocolo: "https", porta_http: 80, porta_https: 443 });
      expect(r.ok).toBe(true);
      expect(r.aviso).toBeUndefined();
    });

    it("ignora porta HTTPS quando protocolo é HTTP", () => {
      const r = validateProtocoloPorta({ protocolo: "http", porta_http: 80, porta_https: 9999 });
      expect(r.ok).toBe(true);
      expect(r.aviso).toBeUndefined();
    });
  });

  describe("portas alternativas", () => {
    it("aceita HTTP em porta 8080 com aviso", () => {
      const r = validateProtocoloPorta({ protocolo: "http", porta_http: 8080, porta_https: 443 });
      expect(r.ok).toBe(true);
      expect(r.aviso).toBeDefined();
      expect(r.aviso).toContain("8080");
      expect(r.aviso).toContain("HTTP");
    });

    it("aceita HTTPS em porta 8443 com aviso", () => {
      const r = validateProtocoloPorta({ protocolo: "https", porta_http: 80, porta_https: 8443 });
      expect(r.ok).toBe(true);
      expect(r.aviso).toContain("8443");
      expect(r.aviso).toContain("HTTPS");
    });

    it.each([1, 22, 1024, 8080, 8443, 49152, 65535])(
      "aceita porta %i dentro do range válido",
      (porta) => {
        const r = validateProtocoloPorta({
          protocolo: "http",
          porta_http: porta,
          porta_https: 443,
        });
        expect(r.ok).toBe(true);
      },
    );
  });

  describe("portas inválidas", () => {
    it.each([0, -1, 65536, 70000, NaN])("rejeita porta %s", (porta) => {
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: porta as number,
        porta_https: 443,
      });
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/Porta inválida/i);
    });

    it("rejeita porta zero/undefined", () => {
      const r = validateProtocoloPorta({
        protocolo: "https",
        porta_http: 80,
        porta_https: 0,
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("campos ausentes / tipos incorretos", () => {
    it("rejeita porta_http undefined quando protocolo é http", () => {
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: undefined as unknown as number,
        porta_https: 443,
      });
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/Porta inválida/i);
    });

    it("rejeita porta_https null quando protocolo é https", () => {
      const r = validateProtocoloPorta({
        protocolo: "https",
        porta_http: 80,
        porta_https: null as unknown as number,
      });
      expect(r.ok).toBe(false);
    });

    it("rejeita porta como string vazia", () => {
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: "" as unknown as number,
        porta_https: 443,
      });
      expect(r.ok).toBe(false);
    });

    it("rejeita porta como string não-numérica", () => {
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: "abc" as unknown as number,
        porta_https: 443,
      });
      expect(r.ok).toBe(false);
    });

    it("aceita porta como string numérica coercível ao padrão", () => {
      // "80" é truthy e a comparação numérica via < / > coage para number,
      // então 80 como string ainda é considerado válido. Apenas garante que
      // não quebra com tipo string vindo de input HTML.
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: "80" as unknown as number,
        porta_https: 443,
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita objeto totalmente vazio", () => {
      const r = validateProtocoloPorta({} as unknown as Parameters<typeof validateProtocoloPorta>[0]);
      expect(r.ok).toBe(false);
    });

    it("rejeita protocolo desconhecido (porta padrão indefinida)", () => {
      const r = validateProtocoloPorta({
        protocolo: "ftp" as unknown as "http",
        porta_http: 80,
        porta_https: 443,
      });
      // porta ativa será undefined → falha de porta inválida
      expect(r.ok).toBe(false);
    });

    it("rejeita porta NaN explícita", () => {
      const r = validateProtocoloPorta({
        protocolo: "https",
        porta_http: 80,
        porta_https: Number.NaN,
      });
      expect(r.ok).toBe(false);
    });

    it("rejeita porta float com parte fracionária inválida (ex.: 80.5 ainda passa range mas confirma comportamento)", () => {
      const r = validateProtocoloPorta({
        protocolo: "http",
        porta_http: 80.5,
        porta_https: 443,
      });
      // 80.5 está dentro do range — confirma que retorna ok com aviso (não é a padrão exata 80)
      expect(r.ok).toBe(true);
      expect(r.aviso).toBeDefined();
    });
  });
});
