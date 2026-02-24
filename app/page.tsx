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
        setMessage({ text: data.error || 'Ошибка отправки', error: true });
        setLoading(false);
        return;
      }
      setStep('done');
      setMessage({ text: 'Спасибо! Ваш ответ учтён.' });
    } catch {
      setMessage({ text: 'Нет связи с сервером', error: true });
    }
    setLoading(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Региональная конференция</h1>

        {step === 'role' && (
          <>
            <p className={styles.label}>Выберите свою роль</p>
            <div className={styles.roles}>
              <button
                type="button"
                className={styles.roleBtn}
                onClick={() => handleSelectRole('ГДф')}
              >
                ГДф
              </button>
              <button
                type="button"
                className={styles.roleBtn}
                onClick={() => handleSelectRole('СВ')}
              >
                СВ
              </button>
            </div>
          </>
        )}

        {step === 'question' && role && (
          <form onSubmit={handleSubmit}>
            <p className={styles.label}>
              Оцените, насколько вы владеете стандартами СПП?
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
              />
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
            <p className={styles.hint}>От 10% до 100%. Можно ввести число вручную (например 55 или 64).</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setStep('role')}
              >
                Назад
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <p className={styles.thankYou}>{message?.text ?? 'Спасибо!'}</p>
        )}

        {message && step !== 'done' && (
          <p className={message.error ? styles.msgError : styles.msgSuccess}>
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}
