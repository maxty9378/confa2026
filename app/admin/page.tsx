'use client';

import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import styles from './page.module.css';

interface Stats {
  averageAll: number | null;
  averageGdf: number | null;
  averageSv: number | null;
  totalVotes: number;
  countGdf: number;
  countSv: number;
}

const SESSION_OPTIONS = ['СЗФО', 'ЮФО', 'ДВФО', 'ПФО', 'ЦФО', 'СФО+УФО'] as const;

function fmt(v: number | null): string {
  return v != null ? `${v}%` : '—';
}

// Простые иконки
const IconStats = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const IconGlobe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const IconMap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
);
const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

export default function AdminPage() {
  const [courseTestGdf, setCourseTestGdf] = useState<string>('');
  const [courseTestSv, setCourseTestSv] = useState<string>('');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState<string>(SESSION_OPTIONS[0]);
  const [districts, setDistricts] = useState<Record<string, { gdf: string; sv: string }>>(
    SESSION_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt]: { gdf: '', sv: '' } }), {})
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDistricts, setSavingDistricts] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/districts').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([settingsData, districtsData, statsData]) => {
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
        setActiveSession(settingsData.active_session || null);
        
        if (Array.isArray(districtsData)) {
          const newDistricts = { ...districts };
          districtsData.forEach((d: { id: string; course_test_percent_gdf: number | null; course_test_percent_sv: number | null }) => {
            if (newDistricts[d.id]) {
              newDistricts[d.id] = {
                gdf: d.course_test_percent_gdf != null ? String(d.course_test_percent_gdf) : '',
                sv: d.course_test_percent_sv != null ? String(d.course_test_percent_sv) : '',
              };
            }
          });
          setDistricts(newDistricts);
        }

        setStats(statsData as Stats);
      })
      .catch(() => toast.error('Ошибка загрузки данных'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const rawGdf = courseTestGdf.trim();
    const rawSv = courseTestSv.trim();
    const valueGdf = rawGdf === '' ? null : parseInt(rawGdf, 10);
    const valueSv = rawSv === '' ? null : parseInt(rawSv, 10);
    
    if (valueGdf !== null && (Number.isNaN(valueGdf) || valueGdf < 0 || valueGdf > 100)) {
      toast.error('ГДф: введите число от 0 до 100');
      setSaving(false);
      return;
    }
    if (valueSv !== null && (Number.isNaN(valueSv) || valueSv < 0 || valueSv > 100)) {
      toast.error('СВ: введите число от 0 до 100');
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
      if (!res.ok) throw new Error();
      toast.success('Общие настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    }
    setSaving(false);
  };

  const handleSaveDistricts = async () => {
    setSavingDistricts(true);
    try {
      for (const id of SESSION_OPTIONS) {
        const d = districts[id];
        const gdf = d.gdf.trim() === '' ? null : parseInt(d.gdf, 10);
        const sv = d.sv.trim() === '' ? null : parseInt(d.sv, 10);
        
        await fetch('/api/admin/districts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, gdf, sv }),
        });
      }
      toast.success('Результаты по округам сохранены');
    } catch {
      toast.error('Ошибка при сохранении округов');
    }
    setSavingDistricts(false);
  };

  const handleResetVotes = async () => {
    if (!confirm('Начать новую сессию? Старые ответы сохранятся, но статистика будет считаться только по новым.')) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/admin/votes/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_label: sessionLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.stats as Stats);
      setActiveSession(sessionLabel);
      toast.success(`Сессия «${sessionLabel}» запущена`);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка запуска сессии');
    }
    setResetting(false);
  };

  const handleExportVotes = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/votes/export');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `answers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Файл экспортирован');
    } catch {
      toast.error('Ошибка экспорта');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <Toaster position="top-right" theme="dark" closeButton />
      
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Админ-панель</h1>
          <a href="/dashboard" className={styles.dashboardLink}>
            Перейти к дашборду
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </header>

        {/* Секция текущей статистики */}
        {stats && (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <IconStats />
              <h2 className={styles.sectionTitle}>Текущие показатели</h2>
            </div>
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

        {/* Секция управления сессиями */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <IconPlay />
            <h2 className={styles.sectionTitle}>Управление сессиями</h2>
          </div>
          {activeSession && (
            <div className={styles.activeSessionBadge}>
              Активная сессия: <strong>{activeSession}</strong>
            </div>
          )}
          <div className={styles.sessionRow}>
            <label className={styles.sessionLabel}>Выберите округ для новой сессии:</label>
            <div className={styles.sessionSelectWrap}>
              <select
                className={styles.sessionSelect}
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
              >
                {SESSION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleResetVotes}
              disabled={resetting}
            >
              <IconPlay />
              {resetting ? 'Запуск...' : 'Начать новую сессию'}
            </button>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleExportVotes}
              disabled={exporting || (stats?.totalVotes === 0)}
            >
              <IconDownload />
              {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
            </button>
          </div>
        </section>

        {/* Общие настройки тестирования */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <IconGlobe />
            <h2 className={styles.sectionTitle}>Общие результаты тестирования</h2>
          </div>
          <p className={styles.label}>
            Настройте средние значения прохождения тестов по всей стране.
          </p>
          <form onSubmit={handleSubmit}>
            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>ГДф</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    value={courseTestGdf}
                    onChange={(e) => setCourseTestGdf(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="0–100"
                  />
                  <span className={styles.percent}>%</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>СВ</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    value={courseTestSv}
                    onChange={(e) => setCourseTestSv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="0–100"
                  />
                  <span className={styles.percent}>%</span>
                </div>
              </div>
            </div>
            <button type="submit" className={styles.submit} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить общие'}
            </button>
          </form>
        </section>

        {/* Настройки по округам */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <IconMap />
            <h2 className={styles.sectionTitle}>Результаты по округам</h2>
          </div>
          <p className={styles.hint}>
            Значения будут использованы на дашборде при переключении на соответствующий округ.
          </p>
          
          <table className={styles.districtsTable}>
            <thead>
              <tr>
                <th>Округ</th>
                <th>ГДф %</th>
                <th>СВ %</th>
              </tr>
            </thead>
            <tbody>
              {SESSION_OPTIONS.map((id) => (
                <tr key={id}>
                  <td className={styles.districtName}>{id}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.tableInput}
                      value={districts[id].gdf}
                      onChange={(e) => setDistricts({
                        ...districts,
                        [id]: { ...districts[id], gdf: e.target.value.replace(/\D/g, '').slice(0, 3) }
                      })}
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.tableInput}
                      value={districts[id].sv}
                      onChange={(e) => setDistricts({
                        ...districts,
                        [id]: { ...districts[id], sv: e.target.value.replace(/\D/g, '').slice(0, 3) }
                      })}
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            type="button" 
            className={styles.submit} 
            onClick={handleSaveDistricts} 
            disabled={savingDistricts}
          >
            {savingDistricts ? 'Сохранение...' : 'Сохранить по округам'}
          </button>
        </section>

        <footer className={styles.footer}>
          <p className={styles.hint}>Конференция 2026 • Панель управления</p>
        </footer>
      </div>
    </main>
  );
}
