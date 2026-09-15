const DAY = 24 * 60 * 60 * 1000;

export function bangkokDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
}

/** ช่วง 7 วันล่าสุด (รวมวันนี้) ตามเวลาไทย */
export function lastSevenDays(now: number = Date.now()) {
  const days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(now - (6 - idx) * DAY);
    return {
      key: bangkokDayKey(d),
      label: new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", timeZone: "Asia/Bangkok" }).format(d),
    };
  });
  const since = new Date(`${days[0].key}T00:00:00+07:00`).toISOString();
  return { days, since };
}
