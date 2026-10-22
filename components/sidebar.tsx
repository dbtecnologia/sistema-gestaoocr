'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileCheck2, Gauge, LayoutDashboard, Settings, Radar, Users, PackageSearch, LogOut } from 'lucide-react';
const links = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/concorrentes', label: 'Concorrentes', icon: Users },
  { href: '/dashboard/catalogo', label: 'Meu catálogo', icon: PackageSearch },
  { href: '/dashboard/encartes', label: 'Encartes e validação', icon: FileCheck2 },
  { href: '/dashboard/benchmarking', label: 'Benchmarking', icon: Radar },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/configuracoes', label: 'Integrações', icon: Settings },
];
export function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <aside className="w-full border-b border-line bg-ink text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0"><div className="flex h-full flex-col p-5"><Link href="/" className="mb-8 flex items-center gap-3"><span className="rounded-xl bg-lime p-2 text-ink"><Gauge size={22}/></span><span className="font-semibold">mercadoradar</span></Link><nav className="space-y-1">{links.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${pathname === href || href !== '/' && pathname.startsWith(href) ? 'bg-white/10 text-lime' : 'text-white/70 hover:bg-white/5'}`}><Icon size={17}/>{label}</Link>)}</nav><div className="mt-auto pt-8 text-xs leading-5 text-white/50">Seus cadastros e encartes ficam vinculados à sua conta.</div><button onClick={async () => { await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action:'logout' }) }); window.location.assign('/login'); }} className="focus-ring mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/70"><LogOut size={16}/>Sair da conta</button></div></aside>;
}
