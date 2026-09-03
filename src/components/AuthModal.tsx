import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiRequest } from '../lib/api';
import type { User, Wallet } from '../types';
import { BrandLogo } from './BrandLogo';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: (user: User, wallet?: Wallet | null) => void; }
type Mode = 'login' | 'forgot';

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  if (!isOpen) return null;

  const friendlyError = (err:any) => {
    const code = String(err?.code || '').toLowerCase();
    if (code.includes('invalid-credential')) return 'E-mail ou senha inválidos.';
    if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde e tente novamente.';
    if (String(err?.message || '').includes('Acesso administrativo')) return 'Acesso restrito ao administrador do Portal Vip Brasil.';
    return err?.message || 'Não foi possível concluir a autenticação.';
  };

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'forgot') {
        if (!email.trim()) throw new Error('Informe seu e-mail cadastrado.');
        await sendPasswordResetEmail(auth, email.trim(), { url: window.location.origin + '/' });
        setSuccess('Link seguro de redefinição enviado para o e-mail administrativo.');
        return;
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const data = await apiRequest<{ user: User; wallet?: Wallet | null }>('/api/auth/me');
      onSuccess(data.user, data.wallet || null);
      onClose();
    } catch (err:any) { await signOut(auth).catch(() => undefined); setError(friendlyError(err)); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-xl" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-[28px] border border-slate-700/80 bg-[#0F172A] p-6 shadow-2xl md:p-8"><button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18}/></button><div className="mb-6 text-center"><div className="mb-3 flex justify-center"><BrandLogo size="lg" showText={false}/></div><h2 className="text-xl font-extrabold text-white">{mode === 'forgot' ? 'Recuperar acesso' : 'Acesso administrativo'}</h2><p className="mt-1 text-xs text-slate-400">Portal Vip Brasil é uma central privada. Não há cadastro público.</p></div>{success&&<div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 size={16}/>{success}</div>}{error&&<div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">⚠️ {error}</div>}<form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-300">E-mail<div className="relative mt-1.5"><Mail className="absolute left-3.5 top-3 text-slate-500" size={16}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" className="froc-input pl-10" required/></div></label>{mode==='login'&&<label className="block text-xs font-semibold text-slate-300">Senha<div className="relative mt-1.5"><Lock className="absolute left-3.5 top-3 text-slate-500" size={16}/><input type={showPassword?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" className="froc-input pl-10 pr-11" required/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-2.5 p-1 text-slate-400">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}<button disabled={loading} className="froc-primary w-full">{loading?'Processando…':mode==='forgot'?'Enviar link seguro':'Entrar'}</button></form><div className="mt-5 flex items-center justify-between text-xs">{mode==='login'?<><span className="text-slate-500">Acesso somente autorizado</span><button onClick={()=>{setMode('forgot');setError('');setSuccess('')}} className="text-slate-400 hover:text-white">Esqueci minha senha</button></>:<button onClick={()=>{setMode('login');setError('');setSuccess('')}} className="flex items-center gap-1 text-slate-400"><ArrowLeft size={13}/>Voltar ao login</button>}</div><div className="mt-5 flex items-center justify-center gap-1 text-[10px] text-slate-500"><ShieldCheck size={12}/>Firebase Authentication + API restrita a administrador</div></div></div>;
};
