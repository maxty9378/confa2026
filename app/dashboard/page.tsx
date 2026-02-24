'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface Stats {
  averageAll: number | null;
  averageGdf: number | null;
  averageSv: number | null;
  totalVotes: number;
  countGdf: number;
  countSv: number;
}

function fmt(v: number | null): string {
  return v != null ? `${Math.round(v)}%` : '—';
}

const SCALE = [100, 75, 50, 25, 0];

function ChartSection({
  title,
  pollValue,
  testValue,
  pollLabel,
  testLabel,
  showTest,
}: {
  title: string;
  pollValue: number;
  testValue: number;
  pollLabel: string;
  testLabel: string;
  showTest: boolean;
}) {
  const pPoll = Math.max(0, Math.min(100, pollValue));
  const pTest = Math.max(0, Math.min(100, testValue));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.chart}>
        <div className={styles.yAxis}>
          {SCALE.map((n) => (
            <span key={n} className={styles.yTick}>
              {n}%
            </span>
          ))}
        </div>

        <div className={styles.barsArea}>
          <div className={styles.barGroup}>
            <div className={styles.barWrapper}>
              <div
                className={styles.barFillPoll}
                style={{ height: `${pPoll}%` }}
              >
                {pPoll >= 12 && (
                  <span className={styles.barValue} data-variant="poll">
                    {fmt(pollValue)}
                  </span>
                )}
              </div>
            </div>
            <span className={styles.barCaption}>{pollLabel}</span>
          </div>

          {showTest && (
            <>
              <span className={styles.vs}>VS</span>
              <div className={styles.barGroup}>
                <div className={styles.barWrapper}>
                  <div
                    className={styles.barFillTest}
                    style={{ height: `${pTest}%` }}
                  >
                    {pTest >= 12 && (
                      <span className={styles.barValue} data-variant="test">
                        {fmt(testValue)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={styles.barCaption}>{testLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [courseTestGdf, setCourseTestGdf] = useState<number | null>(null);
  const [courseTestSv, setCourseTestSv] = useState<number | null>(null);
  const [showTests, setShowTests] = useState(true);

  useEffect(() => {
    let es: EventSource | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/stats/stream');
      es.onmessage = (e) => {
        try {
          setStats(JSON.parse(e.data) as Stats);
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        timeoutId = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      clearTimeout(timeoutId);
      es?.close();
    };
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setCourseTestGdf(data.course_test_percent_gdf ?? null);
        setCourseTestSv(data.course_test_percent_sv ?? null);
      })
      .catch(() => {
        setCourseTestGdf(null);
        setCourseTestSv(null);
      });
  }, []);

  if (!stats) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Загрузка…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.question}>
          Насколько вы владеете стандартами СПП?
        </h1>
        <div className={styles.toggleWrap}>
          <button
            type="button"
            role="switch"
            aria-checked={showTests}
            className={styles.toggle}
            onClick={() => setShowTests((v) => !v)}
          >
            <span className={styles.toggleThumb} />
          </button>
          <span className={styles.toggleLabel}>вкл тестирование</span>
        </div>
      </header>

      <div className={styles.sections}>
        <ChartSection
          title="СВ"
          pollValue={stats.averageSv ?? 0}
          testValue={courseTestSv ?? 0}
          pollLabel="Опрос СВ"
          testLabel="Тестирование СВ"
          showTest={showTests}
        />
        <ChartSection
          title="ГДф"
          pollValue={stats.averageGdf ?? 0}
          testValue={courseTestGdf ?? 0}
          pollLabel="Опрос ГДф"
          testLabel="Тестирование ГДф"
          showTest={showTests}
        />
      </div>
    </main>
  );
}
