'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/components/classroom/apiClient';
import { Button, Field, INPUT, Notice } from '@/components/professor/ui';

type Mode = 'login' | 'register' | 'recover';

/** Entrada do professor (#76): usuário e senha, sem e-mail; código de recuperação exibido uma vez */
export default function ProfessorLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    void apiFetch('/auth/me').then((r) => {
      if (r.ok) router.replace('/professor/turmas');
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r =
      mode === 'login'
        ? await apiFetch('/auth/login', { body: { username, password } })
        : mode === 'register'
          ? await apiFetch<{ recoveryCode: string }>('/auth/register', { body: { username, password, displayName } })
          : await apiFetch<{ recoveryCode: string }>('/auth/recover', { body: { username, recoveryCode: recoveryInput, newPassword: password } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    const code = (r.data as { recoveryCode?: string }).recoveryCode;
    if (code) setRecoveryCode(code);
    else router.replace('/professor/turmas');
  };

  if (recoveryCode) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-black">Guarde o seu código de recuperação</h1>
        <p className="text-sm text-slate-300">
          Sem e-mail, este código é o único jeito de trocar a senha se você esquecê-la. Ele aparece <strong>só agora</strong>: anote no caderno ou tire uma foto.
        </p>
        <p className="text-center font-mono text-3xl font-black tracking-widest text-cyan-200 bg-slate-900 border border-cyan-500/60 rounded-2xl py-5 select-all" aria-label={`Código de recuperação: ${recoveryCode.split('').join(' ')}`}>
          {recoveryCode}
        </p>
        <label className="flex items-center gap-2 text-sm min-h-[44px]">
          <input type="checkbox" checked={noted} onChange={(e) => setNoted(e.target.checked)} className="w-5 h-5 accent-cyan-500" />
          Anotei o código em um lugar seguro
        </label>
        <Button className="w-full" disabled={!noted} onClick={() => router.replace('/professor/turmas')}>
          Ir para as minhas turmas
        </Button>
      </div>
    );
  }

  const titles: Record<Mode, string> = { login: 'Entrar', register: 'Criar conta de professor', recover: 'Recuperar a senha' };
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black">{titles[mode]}</h1>
        <p className="text-sm text-slate-400 mt-1">Crie turmas, escolha a atividade da aula e acompanhe o ranking ao vivo. Os alunos entram só com o código da turma e um apelido.</p>
      </div>
      <div role="tablist" aria-label="Acesso do professor" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1">
        {(['login', 'register', 'recover'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer ${mode === m ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            {m === 'login' ? 'Entrar' : m === 'register' ? 'Criar conta' : 'Esqueci a senha'}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        {mode === 'register' && (
          <Field label="Seu nome" hint="Aparece no painel e no telão (ex.: Profa. Ana).">
            {(p) => <input {...p} className={INPUT} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required />}
          </Field>
        )}
        <Field label="Usuário" hint={mode === 'register' ? '3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.' : undefined}>
          {(p) => <input {...p} className={INPUT} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />}
        </Field>
        {mode === 'recover' && (
          <Field label="Código de recuperação" hint="O código de 12 caracteres que apareceu no cadastro.">
            {(p) => <input {...p} className={`${INPUT} font-mono uppercase`} value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} autoComplete="one-time-code" required />}
          </Field>
        )}
        <Field label={mode === 'recover' ? 'Nova senha' : 'Senha'} hint={mode === 'login' ? undefined : 'Pelo menos 8 caracteres.'}>
          {(p) => (
            <input {...p} type="password" className={INPUT} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          )}
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Aguarde…' : titles[mode]}
        </Button>
      </form>
    </div>
  );
}
