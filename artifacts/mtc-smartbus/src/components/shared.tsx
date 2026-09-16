import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  CircleHelp,
  Gauge,
  Landmark,
  MapPin,
  Menu,
  Navigation,
  Radio,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Signal,
  Timer,
  X,
} from 'lucide-react';

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export function Logo() {
  return (
    <Link href="/" data-testid="link-logo" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary shadow-[3px_3px_0_hsl(var(--primary))]">
        <BusFront size={22} strokeWidth={2.4} />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[1.1rem] font-bold tracking-tight text-sidebar-foreground">MTC</span>
        <span className="mt-1 block font-data text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/60">SmartBus</span>
      </span>
    </Link>
  );
}

const navItems = [
  { href: '/', label: 'Find a bus', icon: Search },
  { href: '/stops', label: 'Physical stops', icon: MapPin },
  { href: '/routes', label: 'Routes', icon: RouteIcon },
];
const operatorItems = [
  { href: '/operator', label: 'Fleet overview', icon: Gauge },
  { href: '/operator/security', label: 'Security events', icon: ShieldCheck },
  { href: '/operator/security/investigation', label: 'Object tracking', icon: Signal },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <button type="button" aria-label="Open menu" data-testid="button-open-menu" className="fixed right-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:hidden" onClick={() => setMobileOpen(true)}>
        <Menu size={20} />
      </button>
      {mobileOpen && <button type="button" aria-label="Close menu backdrop" data-testid="button-close-backdrop" className="fixed inset-0 z-40 bg-primary/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cx('fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" aria-label="Close menu" data-testid="button-close-menu" className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-9 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.13em] text-accent"><span className="pulse-dot h-2 w-2 rounded-full bg-accent" /> Demo data</div>
          <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/60">Useful for exploring the experience. Not a live production feed.</p>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Passenger navigation">
          <p className="mb-3 px-3 font-data text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Passenger</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href.split('/').slice(0, 2).join('/'));
            return <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)} className={cx('group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold', active ? 'bg-accent text-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground')}><Icon size={17} /><span>{item.label}</span>{active && <ArrowRight size={15} className="ml-auto" />}</Link>;
          })}
        </nav>
        <nav className="mt-8 space-y-1" aria-label="Operator navigation">
          <p className="mb-3 px-3 font-data text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Operator desk</p>
          {operatorItems.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)} className={cx('group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold', active ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground')}><Icon size={17} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-5">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/55"><Landmark size={15} /> Chennai Metropolitan Transport</div>
          <p className="mt-2 font-data text-[10px] text-sidebar-foreground/35">BUILD 0.4.17 · DEMO ENVIRONMENT</p>
        </div>
      </aside>
      <main className="min-h-[100dvh] md:pl-[268px]">
        <div className="mx-auto max-w-[1480px] px-5 pb-16 pt-7 sm:px-8 lg:px-12">{children}</div>
      </main>
    </div>
  );
}

export function DemoBanner() {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/45 bg-accent/20 px-4 py-3 text-sm text-primary">
    <div className="flex items-center gap-2"><Signal size={16} /><span><strong>Demo mode.</strong> Occupancy and arrival times are simulated for this preview.</span></div>
    <span className="font-data text-[10px] uppercase tracking-[.13em] text-primary/60">Refreshes every 30 sec</span>
  </div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5 animate-rise">
    <div><div className="mb-3 flex items-center gap-2 font-data text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</div><h1 className="font-display text-4xl font-bold tracking-[-.045em] text-primary sm:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>
    {action}
  </div>;
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" data-testid="status-loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}</div>;
}

export function ErrorState({ message = 'The demo feed could not be reached.' }: { message?: string }) {
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center" data-testid="status-error"><AlertTriangle className="mx-auto text-destructive" size={24} /><h3 className="mt-3 font-display text-xl font-bold text-primary">Feed unavailable</h3><p className="mt-2 text-sm text-muted-foreground">{message}</p><button type="button" data-testid="button-retry" className="mt-5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90" onClick={() => window.location.reload()}>Try again</button></div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center" data-testid="status-empty"><CircleHelp className="mx-auto text-muted-foreground" size={26} /><h3 className="mt-3 font-display text-xl font-bold text-primary">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

export function StatusPill({ status }: { status: string }) {
  const tone = status.toLowerCase().includes('live') || status.toLowerCase().includes('low') || status.toLowerCase().includes('acknowledged') ? 'bg-emerald-100 text-emerald-800' : status.toLowerCase().includes('high') || status.toLowerCase().includes('delay') || status.toLowerCase().includes('escalated') ? 'bg-red-100 text-red-800' : 'bg-accent/30 text-primary';
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-data text-[10px] font-medium uppercase tracking-[.08em]', tone)} data-testid={`status-pill-${status.replaceAll(' ', '-').toLowerCase()}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

export function OccupancyBar({ value, capacity, label = true }: { value: number; capacity: number; label?: boolean }) {
  const percent = Math.min(100, Math.round((value / Math.max(capacity, 1)) * 100));
  const color = percent >= 85 ? 'bg-destructive' : percent >= 65 ? 'bg-accent' : 'bg-emerald-500';
  return <div className="min-w-[110px]">{label && <div className="mb-1.5 flex items-center justify-between font-data text-[10px] text-muted-foreground"><span>{value} / {capacity}</span><span>{percent}%</span></div>}<div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${percent}%` }} /></div></div>;
}

export function BusCard({ bus, compact = false }: { bus: any; compact?: boolean }) {
  return <Link href={`/bus/${bus.id}`} data-testid={`card-bus-${bus.id}`} className={cx('group block rounded-2xl border border-border bg-card p-4 shadow-[0_5px_0_hsl(var(--border))] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_7px_0_hsl(var(--border))]', compact ? 'p-3' : '')}>
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">{bus.number}</span><div><div className="font-data text-[10px] text-muted-foreground">{bus.routeNumber} · {bus.serviceType}</div><div className="mt-1 font-semibold text-primary">{bus.origin} <span className="text-muted-foreground">to</span> {bus.destination}</div></div></div><StatusPill status={bus.status} /></div>
    <div className="mt-4 flex items-end justify-between gap-4"><div><div className="font-display text-2xl font-bold tracking-tight text-primary">{bus.etaMinutes}<span className="ml-1 text-sm font-semibold text-muted-foreground">min</span></div><div className="font-data text-[10px] uppercase tracking-[.1em] text-muted-foreground">to {bus.currentLocation}</div></div><OccupancyBar value={bus.currentOccupancy} capacity={bus.capacity} /></div>
    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Navigation size={13} /> {bus.currentLocation}</span><span className="font-data text-[10px]">{bus.lastUpdatedSeconds}s ago <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-1" /></span></div>
  </Link>;
}

export { MiniMap } from './live-map';

export function RouteTimeline({ stops, active = 0 }: { stops: any[]; active?: number }) {
  return <div className="relative space-y-0">{stops.map((stop, i) => <div key={stop.id ?? i} className="relative flex gap-4 pb-5 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><div className={cx('z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-card', i < active ? 'bg-emerald-500' : i === active ? 'bg-accent ring-4 ring-accent/25' : 'bg-muted-foreground/35')} />{i < stops.length - 1 && <div className={cx('absolute top-5 h-full w-px', i < active ? 'bg-emerald-500' : 'bg-border')} />}</div><div className="min-w-0 flex-1"><div className={cx('text-sm font-semibold', i === active ? 'text-primary' : 'text-muted-foreground')}>{stop.name}</div><div className="mt-1 flex items-center gap-2 font-data text-[10px] text-muted-foreground">{i === active ? <><Timer size={12} />Your selected stop</> : <>{String(i + 1).padStart(2, '0')} · physical stop</>}</div></div></div>)}</div>;
}

export function SectionCard({ title, eyebrow, children, className }: { title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return <section className={cx('rounded-2xl border border-border bg-card p-5 shadow-[0_4px_0_hsl(var(--border)/.7)] sm:p-6', className)}>{(title || eyebrow) && <div className="mb-5"><div className="font-data text-[10px] uppercase tracking-[.16em] text-muted-foreground">{eyebrow}</div>{title && <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-primary">{title}</h2>}</div>}{children}</section>;
}