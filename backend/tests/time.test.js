import {
  nowBogota,
  dayType,
  isHoliday,
  toMin,
  fromMin,
  addMinutes,
  diffSeconds,
  isDate,
  isTime,
} from "../src/utils/time.js";

describe("time.js", () => {
  describe("nowBogota", () => {
    it("debe retornar fecha, hora y datetime en formato correcto", () => {
      const r = nowBogota();
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(r.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("dayType", () => {
    it("retorna 'finde' para sábado", () => {
      expect(dayType("2026-11-07")).toBe("finde"); // sábado
    });
    it("retorna 'finde' para domingo", () => {
      expect(dayType("2026-11-08")).toBe("finde"); // domingo
    });
    it("retorna 'semana' para lunes", () => {
      expect(dayType("2026-11-09")).toBe("semana"); // lunes
    });
    it("retorna 'festivo' si la fecha está en holidays", () => {
      expect(dayType("2026-11-09", ["2026-11-09"])).toBe("festivo");
    });
  });

  describe("isHoliday", () => {
    it("retorna true si la fecha está en holidays", () => {
      expect(isHoliday("2026-12-25", ["2026-12-25"])).toBe(true);
    });
    it("retorna false si la fecha no está en holidays", () => {
      expect(isHoliday("2026-12-24", ["2026-12-25"])).toBe(false);
    });
  });

  describe("toMin / fromMin", () => {
    it("convierte hora a minutos", () => {
      expect(toMin("08:00:00")).toBe(480);
      expect(toMin("18:30")).toBe(1110);
    });
    it("convierte minutos a hora", () => {
      expect(fromMin(480)).toBe("08:00:00");
      expect(fromMin(1110)).toBe("18:30:00");
    });
  });

  describe("addMinutes / diffSeconds", () => {
    it("agrega minutos correctamente", () => {
      const r = addMinutes("2026-11-01 10:00:00", 90);
      expect(r).toBe("2026-11-01 11:30:00");
    });
    it("calcula diferencia en segundos", () => {
      const d = diffSeconds("2026-11-01 10:00:00", "2026-11-01 10:05:00");
      expect(d).toBe(300);
    });
  });

  describe("isDate / isTime", () => {
    it("valida fechas", () => {
      expect(isDate("2026-11-01")).toBe(true);
      expect(isDate("not-a-date")).toBe(false);
    });
    it("valida horas", () => {
      expect(isTime("18:30")).toBe(true);
      expect(isTime("18:30:00")).toBe(true);
      expect(isTime("25:00")).toBe(false);
    });
  });
});
