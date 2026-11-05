'use client';

import React, { useId } from 'react';

/** Peças de formulário do painel: rótulo associado, erro anunciado, alvo de 44 px e foco visível */
export const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const look = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`min-h-[44px] px-4 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${look} ${FOCUS} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-200">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

export const INPUT = `w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-500 ${FOCUS}`;

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: React.ReactNode }) {
  const look = { info: 'border-slate-700 bg-slate-900 text-slate-200', error: 'border-rose-700/70 bg-rose-950/50 text-rose-100', ok: 'border-emerald-700/70 bg-emerald-950/40 text-emerald-100' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-sm ${look}`}>
      {children}
    </div>
  );
}

export function Card({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
