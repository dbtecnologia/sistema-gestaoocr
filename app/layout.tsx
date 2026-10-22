import './globals.css';
import { Sidebar } from '@/components/sidebar';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><div className="min-h-screen md:flex"><Sidebar/><main className="min-w-0 flex-1">{children}</main></div></body></html>; }
