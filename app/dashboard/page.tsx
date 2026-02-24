'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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

  const [displayPoll, setDisplayPoll] = useState(pPoll);
  const [displayTest, setDisplayTest] = useState(0);
  const [displayPollLabel, setDisplayPollLabel] = useState(pPoll);
  const [displayTestLabel, setDisplayTestLabel] = useState(pTest);
  const [pulsePoll, setPulsePoll] = useState(false);
  const [pulseTest, setPulseTest] = useState(false);
  const prevPollRef = useRef(pPoll);
  const prevTestRef = useRef(pTest);
  const prevShowTestRef = useRef(showTest);
  const deltaValue =
    pTest > pPoll ? pTest - pPoll : pTest < pPoll ? pPoll - pTest : 0;
  const [displayDelta, setDisplayDelta] = useState(deltaValue);
  const [pulseDelta, setPulseDelta] = useState(false);
  const prevDeltaRef = useRef(deltaValue);

  useEffect(() => {
    setDisplayPoll(0);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDisplayPoll(pPoll));
    });
    return () => cancelAnimationFrame(t);
  }, [pPoll]);

  useEffect(() => {
    if (!showTest) {
      setDisplayTest(0);
      return;
    }
    setDisplayTest(0);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDisplayTest(pTest));
    });
    return () => cancelAnimationFrame(t);
  }, [pTest, showTest]);

  useLayoutEffect(() => {
    const wasOff = !prevShowTestRef.current;
    prevShowTestRef.current = showTest;
    if (!showTest) {
      setDisplayTest(0);
      setDisplayTestLabel(0);
      return;
    }
    if (wasOff) {
      setDisplayTest(0);
      setDisplayTestLabel(0);
      setPulseTest(true);
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisplayTest(pTest));
      });
      const duration = 600;
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - (1 - t) * (1 - t);
        setDisplayTestLabel(pTest * eased);
        if (t >= 1) setPulseTest(false);
        else requestAnimationFrame(tick);
      };
      const id = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(rafId);
        cancelAnimationFrame(id);
      };
    }
  }, [showTest, pTest]);

  useEffect(() => {
    const start = prevPollRef.current;
    prevPollRef.current = pPoll;
    if (start === pPoll) return;
    setPulsePoll(true);
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayPollLabel(start + (pPoll - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setPulsePoll(false);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [pPoll]);

  useEffect(() => {
    const start = prevTestRef.current;
    prevTestRef.current = pTest;
    if (start === pTest) return;
    setPulseTest(true);
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayTestLabel(start + (pTest - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setPulseTest(false);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [pTest]);

  useEffect(() => {
    const start = prevDeltaRef.current;
    prevDeltaRef.current = deltaValue;
    if (start === deltaValue) return;
    setPulseDelta(true);
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayDelta(start + (deltaValue - start) * eased);
      if (t >= 1) setPulseDelta(false);
      else requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [deltaValue]);

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
              <span
                className={`${styles.barValue} ${pulsePoll ? styles.barValuePulse : ''}`}
                data-variant="poll"
              >
                {Math.round(displayPollLabel)}%
              </span>
              <div
                className={styles.barFillPoll}
                style={{ height: `${displayPoll}%` }}
              />
            </div>
            <span className={styles.barCaption}>{pollLabel}</span>
          </div>

          {showTest && (
            <>
              <div
                className={`${styles.deltaWrap} ${pTest > pPoll ? styles.deltaUp : pTest < pPoll ? styles.deltaDown : styles.deltaZero} ${pulseDelta ? styles.deltaPulse : ''}`}
              >
                <span className={styles.deltaLabel}>
                  {pTest > pPoll
                    ? `LFL +${Math.round(displayDelta)}%`
                    : pTest < pPoll
                      ? `LFL −${Math.round(displayDelta)}%`
                      : 'Без изменений'}
                </span>
              </div>
              <div className={styles.barGroup}>
                <div className={styles.barWrapper}>
                  <span
                    className={`${styles.barValue} ${pulseTest ? styles.barValuePulse : ''}`}
                    data-variant="test"
                  >
                    {Math.round(displayTestLabel)}%
                  </span>
                  <div
                    className={styles.barFillTest}
                    style={{ height: `${displayTest}%` }}
                  />
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
  const [showTests, setShowTests] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevTotalVotesRef = useRef<number | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeoutId: ReturnType<typeof setTimeout>;
    let staleCheckIntervalId: ReturnType<typeof setInterval>;
    const STALE_MS = 25000;
    const RECONNECT_DELAY_MS = 3000;
    let lastMessageAt = 0;

    const connect = () => {
      lastMessageAt = Date.now();
      es = new EventSource('/api/stats/stream');
      es.onopen = () => {
        lastMessageAt = Date.now();
      };
      es.onmessage = (e) => {
        lastMessageAt = Date.now();
        try {
          const data = JSON.parse(e.data) as Stats & { heartbeat?: boolean; _error?: boolean };
          if (data.heartbeat) return;
          if (data._error) {
            toast.error('Нет связи с сервером', {
              description: 'Нажмите кнопку обновления',
              duration: 8000,
            });
          }
          const newStats = data as Stats;
          const prev = prevTotalVotesRef.current;
          if (!data._error && prev !== null && newStats.totalVotes > prev) {
            toast.dismiss();
            toast.success('Получен новый ответ', {
              description: `Всего ответов: ${newStats.totalVotes}`,
              duration: 6000,
            });
          }
          prevTotalVotesRef.current = newStats.totalVotes;
          setStats(newStats);
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (staleCheckIntervalId) clearInterval(staleCheckIntervalId);
        reconnectTimeoutId = setTimeout(connect, RECONNECT_DELAY_MS);
      };
      staleCheckIntervalId = setInterval(() => {
        if (Date.now() - lastMessageAt > STALE_MS) {
          if (staleCheckIntervalId) clearInterval(staleCheckIntervalId);
          es?.close();
          es = null;
          reconnectTimeoutId = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      }, 5000);
    };

    connect();
    return () => {
      clearTimeout(reconnectTimeoutId);
      if (staleCheckIntervalId) clearInterval(staleCheckIntervalId);
      es?.close();
    };
  }, [refreshKey]);

  const fetchSettings = () => {
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
  };

  useEffect(() => {
    fetchSettings();
    const id = setInterval(fetchSettings, 60000);
    return () => clearInterval(id);
  }, [refreshKey]);

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
            className={styles.refreshBtn}
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Обновить данные"
            aria-label="Обновить данные"
          >
            <svg
              className={styles.refreshIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
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
