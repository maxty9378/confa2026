'use client';

import { useState } from 'react';
import styles from './page.module.css';

type Role = 'ГДф' | 'СВ';

type Step = 'role' | 'question' | 'done';

function clampPercent(n: number): number {
  return Math.max(10, Math.min(100, Math.round(n)));
}

export default function PollPage() {
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [value, setValue] = useState(50);
  const [inputStr, setInputStr] = useState('50');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSelectRole = (r: Role) => {
    setRole(r);
    setStep('question');
    setMessage(null);
  };

  const commitInput = () => {
    const n = clampPercent(parseInt(inputStr, 10) || value);
    setValue(n);
    setInputStr(String(n));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    const numToSend = clampPercent(parseInt(inputStr, 10) || value);
    setValue(numToSend);
    setInputStr(String(numToSend));
    setStep('done');
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, value: numToSend }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStep('question');
        setMessage({
          text:
            data.error ||
            (res.status === 503 ? 'Ошибка сети, попробуйте ещё раз' : 'Ошибка отправки'),
          error: true,
        });
        setLoading(false);
        return;
      }
      setMessage({ text: 'Спасибо! Ваш ответ учтён.\nВнимание на экран 👀' });
    } catch {
      setStep('question');
      setMessage({ text: 'Ошибка сети, попробуйте ещё раз', error: true });
    }
    setLoading(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.step}>
            <span className={step === 'role' ? styles.stepActive : styles.stepDot} />
            <span className={step === 'question' ? styles.stepActive : styles.stepDot} />
            <span className={step === 'done' ? styles.stepActive : styles.stepDot} />
          </div>
          <h1 className={styles.title}>
            {step === 'done'
              ? 'Спасибо! Ваш ответ учтён.'
              : 'Оцените, насколько вы владеете стандартами СПП?'}
          </h1>
        </div>

        {step === 'role' && (
          <>
            <p className={styles.label}>Выберите вашу роль</p>
            <div className={styles.roles} role="group" aria-label="Роль">
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'ГДф' ? styles.roleBtnSelected : ''}`}
                onClick={() => handleSelectRole('ГДф')}
              >
                ГДФ
              </button>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'СВ' ? styles.roleBtnSelected : ''}`}
                onClick={() => handleSelectRole('СВ')}
              >
                СВ
              </button>
            </div>
            <p className={styles.hint}>Можно выбрать одной кнопкой — сразу перейдёте к вопросу.</p>
          </>
        )}

        {step === 'question' && role && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <p className={styles.label}>
              Укажите от 10% до 100% — ползунком или числом (например, 55 или 64).
            </p>
            <div className={styles.rangeRow}>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={value}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setValue(n);
                  setInputStr(String(n));
                }}
                className={styles.range}
                style={{ ['--range' as string]: `${value}%` }}
              />
              <div className={styles.numberWrap}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputStr}
                  onChange={(e) => setInputStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  onBlur={commitInput}
                  className={styles.number}
                  aria-label="Процент"
                />
                <span className={styles.percent}>%</span>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep('role')}>
                Назад
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className={styles.doneWrap}>
            <p className={styles.thankYou}>Внимание на экран 👀</p>
            {loading && <p className={styles.sending}>Сохраняем ответ...</p>}
            <div className={styles.doneVisual} aria-hidden="true">
              <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice" className={styles.doneSvg}>
                <defs>
                  <linearGradient id="doneGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1cc998" />
                    <stop offset="100%" stopColor="#17a87a" />
                  </linearGradient>
                  <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d8fff1" />
                    <stop offset="100%" stopColor="#8bf0cd" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="1200" height="360" fill="url(#doneGradient)" opacity="0.15" />
                <rect
                  x="285"
                  y="48"
                  width="630"
                  height="248"
                  rx="28"
                  ry="28"
                  fill="#0f1f1a"
                  stroke="#66e7bf"
                  strokeWidth="6"
                  vectorEffect="non-scaling-stroke"
                />
                <rect x="310" y="76" width="580" height="198" rx="18" ry="18" fill="#123227" />
                <rect x="450" y="176" width="90" height="88" rx="8" fill="url(#barGradient)">
                  <animate
                    attributeName="y"
                    values="176;148;188;176"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="height"
                    values="88;116;76;88"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="650" y="136" width="90" height="128" rx="8" fill="url(#barGradient)">
                  <animate
                    attributeName="y"
                    values="136;170;118;136"
                    dur="2.2s"
                    begin="0.35s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="height"
                    values="128;94;146;128"
                    dur="2.2s"
                    begin="0.35s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="350" y="282" width="500" height="10" rx="5" fill="#66e7bf" opacity="0.75" />
                <rect x="555" y="306" width="90" height="12" rx="6" fill="#66e7bf" opacity="0.9" />
              </svg>
            </div>
          </div>
        )}

        {message && step !== 'done' && (
          <p className={message.error ? styles.msgError : styles.msgSuccess}>{message.text}</p>
        )}
      </div>
    </main>
  );
}
