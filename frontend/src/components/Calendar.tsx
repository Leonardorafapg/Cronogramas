import { useEffect, useMemo, useState } from "react";
import type { Post } from "../types";

interface CalendarProps {
  cliente: string;
  posts: Post[];
  onSelectDate: (date: string) => void;
  onBack: () => void;
  onOpenReport: () => void;
  onMonthChange: (year: number, month: number) => void;
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function todayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function Calendar({ cliente, posts, onSelectDate, onBack, onOpenReport, onMonthChange }: CalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    onMonthChange(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (!map.has(post.data)) map.set(post.data, []);
      map.get(post.data)!.push(post);
    }
    return map;
  }, [posts]);

  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { key: string; day: number | null }[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      result.push({ key: `empty-${i}`, day: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ key: toDateKey(year, month, day), day });
    }
    return result;
  }, [year, month]);

  function goToPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const today = todayKey();

  return (
    <div className="calendar">
      <div className="calendar-client-header">
        <button className="btn-secondary" onClick={onBack}>‹ voltar aos clientes</button>
        <h2>{cliente}</h2>
        <button className="btn-secondary calendar-report-btn" onClick={onOpenReport}>
          Relatório para impressão
        </button>
      </div>

      <div className="calendar-header">
        <button className="btn-secondary" onClick={goToPrevMonth} aria-label="Mês anterior">
          ‹
        </button>
        <div className="calendar-title">
          <span>{MESES[month]} {year}</span>
          <button className="btn-link" onClick={goToToday}>hoje</button>
        </div>
        <button className="btn-secondary" onClick={goToNextMonth} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="calendar-grid calendar-weekdays">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell) => {
          if (cell.day === null) {
            return <div key={cell.key} className="calendar-cell calendar-cell-empty" />;
          }
          const dayPosts = postsByDate.get(cell.key) ?? [];
          const isToday = cell.key === today;
          return (
            <button
              key={cell.key}
              className={`calendar-cell${isToday ? " calendar-cell-today" : ""}`}
              onClick={() => onSelectDate(cell.key)}
            >
              <span className="calendar-day-number">{cell.day}</span>
              <div className="calendar-day-posts">
                {dayPosts.slice(0, 3).map((post) => (
                  <span key={post.id} className="calendar-post-chip" title={post.descricao}>
                    {post.descricao}
                  </span>
                ))}
                {dayPosts.length > 3 && (
                  <span className="calendar-post-more">+{dayPosts.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
