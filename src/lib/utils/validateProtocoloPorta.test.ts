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
});
