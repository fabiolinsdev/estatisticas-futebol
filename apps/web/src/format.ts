const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatAverage = (value: number) => decimal.format(value);

export function formatDay(isoDay: string) {
  const [year, month, day] = isoDay.split("-");
  return `${day}/${month}/${year}`;
}

const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${day.format(date)} às ${time.format(date)}`;
}
