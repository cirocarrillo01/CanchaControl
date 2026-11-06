import { priceFor, buildBlocks, resolveSpan } from "../src/services/schedule.service.js";

const rates = [
  { court_id: null, day_type: "semana", start_time: "08:00:00", end_time: "17:00:00", price: 50000 },
  { court_id: null, day_type: "semana", start_time: "17:00:00", end_time: "23:00:00", price: 70000 },
  { court_id: null, day_type: "finde", start_time: "08:00:00", end_time: "17:00:00", price: 60000 },
  { court_id: null, day_type: "finde", start_time: "17:00:00", end_time: "23:00:00", price: 80000 },
  { court_id: null, day_type: "festivo", start_time: "08:00:00", end_time: "23:00:00", price: 90000 },
];

describe("schedule.service.js", () => {
  describe("priceFor", () => {
    it("retorna precio de semana mañana", () => {
      expect(priceFor(rates, null, "2026-11-09", "10:00:00")).toBe(50000);
    });
    it("retorna precio de semana tarde", () => {
      expect(priceFor(rates, null, "2026-11-09", "19:00:00")).toBe(70000);
    });
    it("retorna precio de finde mañana", () => {
      expect(priceFor(rates, null, "2026-11-07", "10:00:00")).toBe(60000);
    });
    it("retorna precio de festivo", () => {
      expect(priceFor(rates, null, "2026-12-25", "10:00:00", ["2026-12-25"])).toBe(90000);
    });
    it("retorna 0 si no hay tarifa que coincida", () => {
      expect(priceFor([], null, "2026-11-09", "10:00:00")).toBe(0);
    });
  });

  describe("buildBlocks", () => {
    it("genera bloques entre open y close", () => {
      const blocks = buildBlocks({ open_time: "08:00:00", close_time: "12:00:00", block_minutes: 60 });
      expect(blocks).toHaveLength(4);
      expect(blocks[0].start).toBe("08:00:00");
      expect(blocks[0].end).toBe("09:00:00");
      expect(blocks[3].start).toBe("11:00:00");
      expect(blocks[3].end).toBe("12:00:00");
    });
    it("usa block_minutes personalizado", () => {
      const blocks = buildBlocks({ open_time: "08:00:00", close_time: "10:00:00", block_minutes: 30 });
      expect(blocks).toHaveLength(4);
    });
  });

  describe("resolveSpan", () => {
    it("retorna el valor numérico", () => {
      expect(resolveSpan(60)).toBe(60);
    });
    it("retorna 60 por defecto si es inválido", () => {
      expect(resolveSpan(null)).toBe(60);
      expect(resolveSpan(undefined)).toBe(60);
      expect(resolveSpan(0)).toBe(60);
    });
  });
});
