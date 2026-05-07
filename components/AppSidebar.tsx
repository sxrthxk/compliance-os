'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Applicants', href: '/app/applicants', disabled: true },
  { label: 'Settings', href: '/app/settings', disabled: true },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col">
      {/* Logo */}
      <Link href="/app/dashboard" className="px-5 py-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-black font-bold text-xs">
          C
        </div>
        <span className="font-mono font-semibold text-zinc-200 text-sm tracking-tight">
          ComplianceOS
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-3 py-2 text-sm text-zinc-600 cursor-not-allowed font-mono"
              >
                <span>{item.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-700">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 text-sm font-mono rounded-md transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-5 py-5 border-t border-zinc-900 flex items-center gap-3">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
        />
        <span className="text-xs text-zinc-500 font-mono">Account</span>
      </div>
    </aside>
  );
}
