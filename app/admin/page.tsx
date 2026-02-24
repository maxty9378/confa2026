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
  return v != null ? `${v}%` : '—';
}

export default function AdminPage() {
  const [courseTestGdf, setCourseTestGdf] = useState<string>('');
  const [courseTestSv, setCourseTestSv] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([settingsData, statsData]) => {
        setCourseTestGdf(
          settingsData.course_test_percent_gdf != null
            ? String(settingsData.course_test_percent_gdf)
            : ''
        );
        setCourseTestSv(
          settingsData.course_test_percent_sv != null
            ? String(settingsData.course_test_percent_sv)
            : ''
        );
        setStats(statsData as Stats);
      })
      .catch(() => setMessage({ text: 'Ошибка загрузки', error: true }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const rawGdf = courseTestGdf.trim();
    const rawSv = courseTestSv.trim();
    const valueGdf = rawGdf === '' ? null : parseInt(rawGdf, 10);
    const valueSv = rawSv === '' ? null : parseInt(rawSv, 10);
    if (valueGdf !== null && (Number.isNaN(valueGdf) || valueGdf < 0 || valueGdf > 100)) {
      setMessage({ text: 'ГДф: введите число от 0 до 100 или оставьте пустым', error: true });
      setSaving(false);
      return;
    }
    if (valueSv !== null && (Number.isNaN(valueSv) || valueSv < 0 || valueSv > 100)) {
      setMessage({ text: 'СВ: введите число от 0 до 100 или оставьте пустым', error: true });
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_test_percent_gdf: valueGdf,
          course_test_percent_sv: valueSv,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Ошибка сохранения', error: true });
        setSaving(false);
        return;
      }
      setMessage({ text: 'Сохранено. Значения отображаются на дашборде.' });
    } catch {
      setMessage({ text: 'Ошибка сети', error: true });
    }
    setSaving(false);
  };

  const handleResetVotes = async () => {
    if (!confirm('Удалить все ответы на опрос? Это действие нельзя отменить.')) return;
    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/votes/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Ошибка обнуления', error: true });
        setResetting(false);
        return;
      }
      setStats({
        averageAll: null,
        averageGdf: null,
        averageSv: null,
        totalVotes: 0,
        countGdf: 0,
        countSv: 0,
      });
      setMessage({ text: 'Ответы на опрос обнулены. Дашборд обновлён.' });
    } catch {
      setMessage({ text: 'Ошибка сети', error: true });
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Загрузка…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Админка конференции</h1>

        {stats && (
          <section className={styles.statsSection}>
            <h2 className={styles.statsTitle}>Среднее по опросу (самооценка)</h2>
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Общее среднее</div>
                <div className={styles.statValue}>{fmt(stats.averageAll)}</div>
                <div className={styles.statMeta}>{stats.totalVotes} ответов</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Среднее — ГДф</div>
                <div className={styles.statValue}>{fmt(stats.averageGdf)}</div>
                <div className={styles.statMeta}>{stats.countGdf} ответов</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Среднее — СВ</div>
                <div className={styles.statValue}>{fmt(stats.averageSv)}</div>
                <div className={styles.statMeta}>{stats.countSv} ответов</div>
              </div>
            </div>
          </section>
        )}

        {stats && stats.totalVotes > 0 && (
          <section className={styles.resetSection}>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleResetVotes}
              disabled={resetting}
            >
              {resetting ? 'Обнуление…' : 'Обнулить ответы на опрос'}
            </button>
          </section>
        )}

        <p className={styles.label}>
          Результат тестирования по курсам (%): насколько участники прошли тестирование. Укажите отдельно для ГДф и СВ — значения показываются на дашборде.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ГДф</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                value={courseTestGdf}
                onChange={(e) => setCourseTestGdf(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="0–100"
                aria-label="Процент ГДф"
              />
              <span className={styles.percent}>%</span>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>СВ</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                value={courseTestSv}
                onChange={(e) => setCourseTestSv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="0–100"
                aria-label="Процент СВ"
              />
              <span className={styles.percent}>%</span>
            </div>
          </div>
          <button type="submit" className={styles.submit} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </form>
        {message && (
          <p className={message.error ? styles.msgError : styles.msgSuccess}>{message.text}</p>
        )}
        <p className={styles.hint}>
          <a href="/dashboard">Открыть дашборд</a>
        </p>
      </div>
    </main>
  );
}
