import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Filter,
  GitBranch,
  Link2,
  LocateFixed,
  MapPinned,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Ticket,
  TrendingUp,
  Users,
  Wifi,
  XCircle,
} from 'lucide-react';
import {
  getGetBusesQueryKey,
  getGetBusQueryKey,
  getGetOperatorBusQueryKey,
  getGetOperatorOverviewQueryKey,
  getGetRouteQueryKey,
  getGetRouteStopsQueryKey,
  getGetRoutesQueryKey,
  getGetSecurityEventsQueryKey,
  getGetSecurityEventAuditQueryKey,
  getGetSecurityInvestigationQueryKey,
  getGetStopQueryKey,
  getGetStopsQueryKey,
  useGetBus,
  useGetBuses,
  useGetOperatorBus,
  useGetOperatorOverview,
  useGetRoute,
  useGetRouteStops,
  useGetRoutes,
  useGetSecurityEvents,
  useReviewSecurityEvent,
  useGetSecurityInvestigation,
  useGetStop,
  useGetStops,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppShell,
  BusCard,
  DemoBanner,
  EmptyState,
  ErrorState,
  LoadingState,
  MiniMap,
  OccupancyBar,
  PageTitle,
  RouteTimeline,
  SectionCard,
  StatusPill,
  cx,
} from '@/components/shared';

function Metric({ label, value, suffix, tone = 'primary', icon: Icon }: { label: string; value: string | number; suffix?: string; tone?: string; icon?: any }) {
  return <div className="rounded-xl border border-border bg-background/70 p-4"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span>{Icon && <Icon size={15} className={tone === 'warning' ? 'text-accent-foreground' : 'text-muted-foreground'} />}</div><div className={cx('mt-3 font-display text-3xl font-bold tracking-tight', tone === 'warning' ? 'text-[#a75e05]' : tone === 'danger' ? 'text-destructive' : 'text-primary')}>{value}<span className="ml-1 text-sm font-semibold text-muted-foreground">{suffix}</span></div></div>;
}

function Chart({ points, color = 'hsl(var(--primary))', height = 150 }: { points: number[]; color?: string; height?: number }) {
  const max = Math.max(...points, 1); const min = Math.min(...points); const range = Math.max(max - min, 1);
  const coords = points.map((value, i) => `${(i / Math.max(points.length - 1, 1)) * 100},${height - 18 - ((value - min) / range) * (height - 38)}`).join(' ');
  return <div className="relative" style={{ height }}><div className="absolute inset-0 flex flex-col justify-between py-2"><span className="border-t border-dashed border-border" /><span className="border-t border-dashed border-border" /><span className="border-t border-dashed border-border" /></div><svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="relative h-full w-full overflow-visible"><polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={coords} /><polygon fill={color} fillOpacity=".08" points={`0,${height} ${coords} 100,${height}`} />{points.map((value, i) => <circle key={i} cx={(i / Math.max(points.length - 1, 1)) * 100} cy={height - 18 - ((value - min) / range) * (height - 38)} r="1.7" fill={color} />)}</svg></div>;
}

export function HomePage() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [route, setRoute] = useState(urlParams.get('route') || '');
  const [selectedStop, setSelectedStop] = useState(urlParams.get('stop') || '');
  const busesQuery = useGetBuses({ search: search || undefined, routeId: route || undefined }, { query: { refetchInterval: 30000, queryKey: getGetBusesQueryKey({ search: search || undefined, routeId: route || undefined }) } });
  const routesQuery = useGetRoutes({ query: { queryKey: getGetRoutesQueryKey() } });
  const allStopsQuery = useGetStops({}, { query: { queryKey: getGetStopsQueryKey({}) } });
  const stopsQuery = useGetStops({ search: search || undefined }, { query: { enabled: !!search, queryKey: getGetStopsQueryKey({ search: search || undefined }) } });
  const stopQuery = useGetStop({ stopId: selectedStop }, { query: { enabled: !!selectedStop, refetchInterval: 15000, queryKey: getGetStopQueryKey({ stopId: selectedStop }) } });
  const buses = busesQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const allStops = allStopsQuery.data ?? [];
  const stops = stopsQuery.data ?? [];
  return <AppShell><DemoBanner /><PageTitle eyebrow="Passenger companion · Chennai" title={<>Make the next bus<br /><span className="text-muted-foreground">the right bus.</span></>} description="Choose a route or bus, then set the physical stop where you will board. We will keep the occupancy picture close at hand." action={<div className="hidden rounded-full border border-border bg-card px-3 py-2 font-data text-[10px] uppercase tracking-[.12em] text-muted-foreground sm:flex sm:items-center sm:gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Data checked just now</div>} />
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <SectionCard className="animate-rise-delay-1 overflow-hidden !bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.35)]"><div className="relative"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[28px] border-accent/15" /><div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-accent/20" /><div className="relative"><div className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[.16em] text-accent"><LocateFixed size={14} /> Plan your ride</div><h2 className="mt-4 max-w-lg font-display text-3xl font-bold tracking-[-.04em] sm:text-4xl">Where are you heading from?</h2><p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/65">Search a bus number, route, or familiar stop name. Filter by route or choose your boarding stop directly.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 focus-within:border-accent"><Search size={18} className="shrink-0 text-primary-foreground/55" /><input aria-label="Search buses or stops" data-testid="input-search-home" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bus 21G, 102, Adyar, Guindy, Central..." className="w-full bg-transparent text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/45" />{search && <button type="button" aria-label="Clear search" data-testid="button-clear-search" onClick={() => setSearch('')}><XCircle size={16} /></button>}</div><select aria-label="Filter by route" data-testid="select-route-home" value={route} onChange={(e) => setRoute(e.target.value)} className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-3 text-sm text-primary-foreground outline-none"><option value="" className="text-primary">All routes</option>{routes.map((item: any) => <option key={item.id} value={item.id} className="text-primary">{item.routeNumber} · {item.origin}</option>)}</select><select aria-label="Filter by boarding stop" data-testid="select-stop-home" value={selectedStop} onChange={(e) => setSelectedStop(e.target.value)} className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-3 text-sm text-primary-foreground outline-none"><option value="" className="text-primary">Boarding stop (All)</option>{allStops.map((item: any) => <option key={item.id} value={item.id} className="text-primary">{item.name}</option>)}</select></div>{search && stops.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{stops.slice(0, 4).map((stop: any) => <button key={stop.id} type="button" data-testid={`button-stop-suggestion-${stop.id}`} onClick={() => { setSelectedStop(stop.id); setSearch(''); }} className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-left text-xs hover:bg-primary-foreground/20"><MapPinned size={13} className="mr-1 inline" />Set stop: {stop.name}</button>)}</div>}</div></div></SectionCard>
      <SectionCard title="Quick actions" eyebrow="Small decisions, made easy" className="animate-rise-delay-2"><div className="space-y-2">{[{ href: '/stops', icon: MapPinned, title: 'Find a physical stop', text: 'Live arrivals & buses at all 11+ stops' }, { href: '/routes', icon: CalendarClock, title: 'Explore routes', text: 'View Route 102, 21G, 23C stops in sequence' }, { href: '/operator', icon: Activity, title: 'Operator desk', text: 'Fleet visibility for transport teams' }].map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} data-testid={`link-quick-${item.title.toLowerCase().replaceAll(' ', '-')}`} className="group flex items-center gap-3 rounded-xl border border-transparent p-3 hover:border-border hover:bg-background"><span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-primary">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.text}</span></span><ChevronRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>; })}</div></SectionCard>
    </div>
    {selectedStop && stopQuery.data && <div className="mt-5 animate-rise"><SectionCard className="border-accent/50 bg-accent/10"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="font-data text-[10px] uppercase tracking-[.14em] text-muted-foreground">Selected boarding stop</div><h2 className="mt-1 font-display text-2xl font-bold text-primary">{stopQuery.data.stop.name}</h2><p className="mt-1 text-sm text-muted-foreground">Routes: {stopQuery.data.routes.join(' · ')} · {stopQuery.data.upcomingBuses?.length || 0} buses approaching</p></div><div className="flex items-center gap-2"><Link href={`/stops?stop=${selectedStop}`} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary hover:bg-secondary">Stop details</Link><button type="button" data-testid="button-clear-stop" className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary hover:bg-secondary" onClick={() => setSelectedStop('')}>Change stop</button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stopQuery.data.upcomingBuses.length === 0 ? <p className="text-xs text-muted-foreground col-span-3">No upcoming buses currently tracked for this stop.</p> : stopQuery.data.upcomingBuses.map((bus: any) => <BusCard key={bus.id} bus={bus} compact />)}</div></SectionCard></div>}
    <div className="mt-9 flex items-end justify-between gap-4"><div><div className="font-data text-[10px] uppercase tracking-[.16em] text-muted-foreground">Around your network</div><h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-primary">Nearby buses</h2></div><Link href="/stops" data-testid="link-see-stops" className="text-xs font-bold text-primary underline decoration-accent decoration-2 underline-offset-4">Browse all stops</Link></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-3">{busesQuery.isLoading ? <LoadingState rows={3} /> : busesQuery.isError ? <div className="xl:col-span-3"><ErrorState /></div> : buses.length === 0 ? <div className="xl:col-span-3"><EmptyState title="No buses match that search" text="Try a route number, a stop name, or clear the filters." /></div> : buses.slice(0, 6).map((bus: any, i: number) => <div key={bus.id} className={cx('animate-rise', `animate-rise-delay-${Math.min(i + 1, 3)}`)}><BusCard bus={bus} /></div>)}</div>
  </AppShell>;
}

export function BusPage() {
  const { busId = '' } = useParams<{ busId: string }>();
  const [targetStopId, setTargetStopId] = useState('');
  const query = useGetBus({ busId, targetStopId: targetStopId || undefined }, { query: { enabled: !!busId, refetchInterval: 7000, queryKey: getGetBusQueryKey({ busId, targetStopId: targetStopId || undefined }) } });
  const bus: any = query.data;
  const selectedStop = targetStopId || bus?.targetStop?.id || '';
  if (query.isLoading) return <AppShell><LoadingState rows={6} /></AppShell>;
  if (query.isError || !bus) return <AppShell><ErrorState /></AppShell>;
  const displayStops = [bus.targetStop, ...bus.nextStops.map((item: any) => item.stop)].filter((stop: any, index: number, stops: any[]) => stops.findIndex((item) => item.id === stop.id) === index);
  return <AppShell><Link href="/" data-testid="link-back-home" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={15} />Back to nearby buses</Link><DemoBanner /><PageTitle eyebrow={`${bus.routeNumber} · bus ${bus.number}`} title={bus.origin} description={`Towards ${bus.destination} · ${bus.serviceType} service`} action={<StatusPill status={bus.status} />} /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><SectionCard className="overflow-hidden p-0"><MiniMap points={displayStops} bus={bus} activeStopId={selectedStop} height="300px" /><div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">{[['ETA', `${bus.etaMinutes} min`], ['At', bus.currentLocation], ['Speed', `${bus.gps.speed} km/h`], ['Updated', `${bus.lastUpdatedSeconds}s ago`]].map(([label, value]) => <div key={label} className="bg-card p-4"><div className="font-data text-[10px] uppercase tracking-[.1em] text-muted-foreground">{label}</div><div className="mt-2 truncate font-display text-lg font-bold text-primary">{value}</div></div>)}</div></SectionCard><SectionCard title="Choose your stop" eyebrow="Forecast follows the stop"><p className="text-sm leading-6 text-muted-foreground">The crowding estimate is more useful when it is tied to where you board.</p><select aria-label="Select target stop" data-testid="select-target-stop" value={selectedStop} onChange={(e) => setTargetStopId(e.target.value)} className="mt-5 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm font-semibold text-primary outline-none focus:ring-2 focus:ring-accent">{displayStops.map((stop: any) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select><div className="mt-6 rounded-xl bg-secondary p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">At your stop</span><span className="font-data text-[10px] uppercase tracking-[.1em] text-muted-foreground">{bus.forecastConfidence} confidence</span></div><div className="mt-3 flex items-end justify-between"><div><span className="font-display text-4xl font-bold text-primary">{bus.predictedOccupancy}</span><span className="ml-1 text-sm text-muted-foreground">people</span></div><OccupancyBar value={bus.predictedOccupancy} capacity={bus.capacity} /></div></div></SectionCard></div><div className="mt-5 grid gap-5 lg:grid-cols-[.95fr_1.05fr]"><SectionCard title="Current occupancy" eyebrow="On-board picture"><div className="flex items-end justify-between gap-4"><div><div className="font-display text-5xl font-bold text-primary">{bus.currentOccupancy}</div><div className="mt-1 text-sm text-muted-foreground">of {bus.capacity} seats and standing capacity</div></div><StatusPill status={bus.crowding} /></div><div className="mt-5"><OccupancyBar value={bus.currentOccupancy} capacity={bus.capacity} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg border border-border p-3"><span className="text-muted-foreground">Recent entries</span><strong className="mt-1 block font-display text-xl text-primary">+{bus.flow.entriesRecent}</strong></div><div className="rounded-lg border border-border p-3"><span className="text-muted-foreground">Recent exits</span><strong className="mt-1 block font-display text-xl text-primary">-{bus.flow.exitsRecent}</strong></div></div></SectionCard><SectionCard title="Coming up" eyebrow="Next physical stops"><RouteTimeline stops={displayStops} active={0} /><div className="mt-5 space-y-2 border-t border-border pt-4">{bus.nextStops.slice(0, 3).map((item: any) => <div key={item.stop.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{item.stop.name}</span><span className="font-data text-xs font-medium text-primary">{item.etaMinutes} min · {item.predictedOccupancy} pax</span></div>)}</div></SectionCard></div><SectionCard title="Ride notes" eyebrow="Helpful context" className="mt-5"><div className="grid gap-3 sm:grid-cols-2"><div className="flex gap-3 rounded-xl bg-accent/15 p-4"><AlertTriangle className="shrink-0 text-[#a75e05]" size={18} /><div><div className="text-sm font-bold text-primary">Forecast, not a promise</div><p className="mt-1 text-xs leading-5 text-muted-foreground">This estimate blends recent passenger flow with the demo timetable. Keep a little room in your plan.</p></div></div><div className="flex gap-3 rounded-xl bg-secondary p-4"><Wifi className="shrink-0 text-primary" size={18} /><div><div className="text-sm font-bold text-primary">Tracking is active</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Location last refreshed {bus.lastUpdatedSeconds} seconds ago. The route may move between refreshes.</p></div></div></div></SectionCard></AppShell>;
}

export function RoutePage() {
  const params = useParams<{ routeId?: string }>();
  const allRoutesQuery = useGetRoutes({ query: { queryKey: getGetRoutesQueryKey() } });
  const allRoutes: any[] = allRoutesQuery.data ?? [];

  const activeRouteParam = params.routeId?.trim();
  const effectiveRouteId = activeRouteParam || (allRoutes[0]?.id ?? 'route-21g');

  const routeQuery = useGetRoute(
    { routeId: effectiveRouteId },
    { query: { enabled: !!effectiveRouteId, queryKey: getGetRouteQueryKey({ routeId: effectiveRouteId }) } },
  );
  const stopsQuery = useGetRouteStops(
    { routeId: effectiveRouteId },
    { query: { enabled: !!effectiveRouteId, queryKey: getGetRouteStopsQueryKey({ routeId: effectiveRouteId }) } },
  );
  const route: any = routeQuery.data;
  const stops: any[] = stopsQuery.data ?? route?.stops ?? [];

  if (routeQuery.isLoading || stopsQuery.isLoading) return <AppShell><LoadingState rows={6} /></AppShell>;

  if (routeQuery.isError || stopsQuery.isError || !route) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Link href="/" data-testid="link-back-route" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
            <ArrowLeft size={15} /> Passenger home
          </Link>
          <PageTitle eyebrow="Route directory" title="Select a Route" description="Choose one of the available active routes to inspect its physical stops and live status." />
          {allRoutes.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allRoutes.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/routes/${r.id}`}
                  className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-primary px-3 py-1 font-display text-sm font-bold text-primary-foreground">{r.routeNumber}</span>
                    <StatusPill status={r.serviceType} />
                  </div>
                  <div className="mt-4 text-base font-bold text-primary">{r.origin} <span className="text-muted-foreground">to</span> {r.destination}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{r.stops?.length || 0} stops</span>
                    <span className="font-semibold text-primary group-hover:underline">View stops →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <ErrorState message="The requested route ID was not found. Please select from the available routes above." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" data-testid="link-back-route" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
          <ArrowLeft size={15} /> Passenger home
        </Link>
        {allRoutes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">All routes:</span>
            {allRoutes.map((r: any) => {
              const isSelected = r.id === route?.id || r.routeNumber.toLowerCase() === route?.routeNumber?.toLowerCase();
              return (
                <Link
                  key={r.id}
                  href={`/routes/${r.id}`}
                  data-testid={`link-switch-route-${r.routeNumber.toLowerCase()}`}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-card text-foreground hover:bg-secondary',
                  )}
                >
                  {r.routeNumber}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <DemoBanner />
      <PageTitle
        eyebrow={`Route ${route.routeNumber} · ${route.serviceType}`}
        title={`${route.origin} to ${route.destination}`}
        description="A physical-stop timeline for planning where you will board and where you will get off."
        action={<StatusPill status={route.liveTracking ? 'Live tracking' : 'Schedule only'} />}
      />

      <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
        <SectionCard title="Route at a glance" eyebrow="One line, all the way">
          <MiniMap points={stops} busPoint={false} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Physical stops" value={stops.length} icon={MapPinned} />
            <Metric label="Tracking" value={route.liveTracking ? 'Live' : 'Off'} icon={Radio} />
          </div>
        </SectionCard>
        <SectionCard title="Stop sequence" eyebrow="Boarding order">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
            <span><strong className="text-primary">{stops.length}</strong> stops on this direction</span>
            <span className="font-data text-[10px] uppercase tracking-[.1em]">First to last</span>
          </div>
          <RouteTimeline stops={stops} active={-1} />
        </SectionCard>
      </div>

      <SectionCard title="Choose a stop to start a bus view" eyebrow="Next step" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stops.slice(0, 8).map((stop: any) => (
            <Link
              key={stop.id}
              href={`/stops?stop=${stop.id}`}
              data-testid={`link-route-stop-${stop.id}`}
              className="group rounded-xl border border-border p-3 hover:border-accent hover:bg-accent/10"
            >
              <div className="font-data text-[10px] text-muted-foreground">STOP {String(stop.sequence).padStart(2, '0')}</div>
              <div className="mt-2 text-sm font-bold text-primary">{stop.name}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                See buses <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}

export function StopsPage() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [search, setSearch] = useState('');
  const query = useGetStops({ search: search || undefined }, { query: { refetchInterval: 60000, queryKey: getGetStopsQueryKey({ search: search || undefined }) } });
  const stops: any[] = query.data ?? [];
  const [selectedStopId, setSelectedStopId] = useState(urlParams.get('stop') || '');

  const activeStopId = selectedStopId || (stops.length > 0 ? stops[0].id : '');
  const stopDetailQuery = useGetStop(
    { stopId: activeStopId },
    { query: { enabled: !!activeStopId, refetchInterval: 15000, queryKey: getGetStopQueryKey({ stopId: activeStopId }) } }
  );
  const stopDetail = stopDetailQuery.data;

  return (
    <AppShell>
      <DemoBanner />
      <PageTitle
        eyebrow="Physical stop directory"
        title="Find where to stand."
        description="Stops are physical places. Select any stop to see live approaching buses, predicted occupancies, and arrival ETAs."
        action={
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-muted-foreground">
            <MapPinned size={14} /> {stops.length || '—'} stops indexed
          </div>
        }
      />
      <SectionCard className="mb-5">
        <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-accent">
          <Search size={18} className="text-muted-foreground" />
          <input
            aria-label="Search physical stops"
            data-testid="input-search-stops"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stop name (e.g. Adyar, Guindy, Central, Tambaram...)"
            className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button type="button" aria-label="Clear stops search" data-testid="button-clear-stops-search" onClick={() => setSearch('')}>
              <XCircle size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </SectionCard>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Stops in network" eyebrow="Select a stop to inspect">
          {query.isLoading ? (
            <LoadingState rows={5} />
          ) : query.isError ? (
            <ErrorState />
          ) : stops.length === 0 ? (
            <EmptyState title="No stop found" text="Try a wider name, such as T Nagar, Adyar, or Central." />
          ) : (
            <div className="divide-y divide-border">
              {stops.map((stop: any, i: number) => (
                <StopRow
                  key={stop.id}
                  stop={stop}
                  index={i}
                  isSelected={stop.id === activeStopId}
                  onSelect={() => setSelectedStopId(stop.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title={stopDetail ? stopDetail.stop.name : 'Select a physical stop'}
            eyebrow="Stop live monitor"
            action={
              stopDetail ? (
                <Link
                  href={`/?stop=${stopDetail.stop.id}`}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-secondary"
                >
                  Board here on Find a bus →
                </Link>
              ) : undefined
            }
          >
            {stopDetailQuery.isLoading ? (
              <LoadingState rows={4} />
            ) : stopDetail ? (
              <div>
                <MiniMap points={stops} activeStopId={activeStopId} busPoint={false} height="220px" className="mb-4" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-data font-semibold text-primary">
                    {stopDetail.stop.latitude.toFixed(4)}, {stopDetail.stop.longitude.toFixed(4)}
                  </span>
                  <span>·</span>
                  <span>Serving routes:</span>
                  {stopDetail.routes.map((r: string) => (
                    <span key={r} className="rounded-md bg-primary/10 px-2 py-0.5 font-display text-xs font-bold text-primary">
                      {r}
                    </span>
                  ))}
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-primary">Approaching buses</h3>
                      {(stopDetail as any).source && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-data text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {(stopDetail as any).source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-xs text-muted-foreground">
                        {stopDetail.upcomingBuses?.length || 0} buses en route
                      </span>
                      <button
                        type="button"
                        onClick={() => stopDetailQuery.refetch()}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                        title="Refresh approaching buses"
                      >
                        <RefreshCw size={13} className={stopDetailQuery.isFetching ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {stopDetail.upcomingBuses && stopDetail.upcomingBuses.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {stopDetail.upcomingBuses.map((b: any) => {
                        const isArriving = b.etaMinutes <= 1;
                        const isApproaching = b.etaMinutes > 1 && b.etaMinutes <= 5;
                        return (
                          <div
                            key={b.id}
                            className={`group rounded-xl border p-4 transition-all hover:shadow-sm ${
                              isArriving
                                ? 'border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20'
                                : isApproaching
                                ? 'border-amber-500/40 bg-card'
                                : 'border-border bg-card hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className={`grid h-10 w-10 place-items-center rounded-xl font-display text-sm font-bold ${
                                  isArriving ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                                }`}>
                                  {b.number}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-data text-[10px] text-muted-foreground">
                                      Route {b.routeNumber} · {b.serviceType}
                                    </span>
                                    {isArriving && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.2 font-data text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        ARRIVING
                                      </span>
                                    )}
                                    {isApproaching && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 font-data text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        APPROACHING
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-bold text-primary">
                                    {b.origin} <span className="text-muted-foreground font-normal">to</span> {b.destination}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-display text-2xl font-bold ${isArriving ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                                  {isArriving ? 'NOW' : `${b.etaMinutes}m`}
                                </div>
                                <div className="font-data text-[10px] uppercase text-muted-foreground">
                                  {isArriving ? 'At platform' : 'ETA to stop'}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Navigation size={13} /> {b.currentLocation}
                              </span>
                              <span className="font-medium text-primary">
                                {b.currentOccupancy} / {b.capacity} pax ({b.crowding})
                              </span>
                            </div>

                            <div className="mt-3">
                              <OccupancyBar value={b.currentOccupancy} capacity={b.capacity} />
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <StatusPill status={isArriving ? 'LIVE' : b.status} />
                              <Link
                                href={`/bus/${b.id}?targetStopId=${activeStopId}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                              >
                                Track bus live <ArrowRight size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-border/80 bg-secondary/40 p-5 text-center text-sm text-muted-foreground">
                      No live buses approaching this stop right now. Check back in a few minutes or switch routes.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState title="Select a stop" text="Click any stop on the left to see live approaching buses, ETAs, and occupancy." />
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

function StopRow({
  stop,
  index,
  isSelected,
  onSelect,
}: {
  stop: any;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 py-3 px-2 rounded-xl transition-colors cursor-pointer',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/60'
      )}
      onClick={onSelect}
      data-testid={`row-stop-${stop.id}`}
    >
      <div className="font-data text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</div>
      <div className={cx("grid h-10 w-10 place-items-center rounded-xl", isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
        <MapPinned size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-primary">{stop.name}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{stop.routes?.join(' · ') || 'Multiple routes'}</span>
          <span className="font-data">{stop.latitude.toFixed(3)}, {stop.longitude.toFixed(3)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        data-testid={`button-select-stop-${stop.id}`}
        className={cx(
          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
          isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border hover:bg-secondary text-primary'
        )}
      >
        {isSelected ? 'Viewing' : 'View buses'}
      </button>
    </div>
  );
}

export function OperatorPage() {
  const query = useGetOperatorOverview({ query: { refetchInterval: 30000, queryKey: getGetOperatorOverviewQueryKey() } });
  const overview: any = query.data;
  if (query.isLoading) return <AppShell><LoadingState rows={7} /></AppShell>;
  if (query.isError || !overview) return <AppShell><ErrorState /></AppShell>;
  return <AppShell><DemoBanner /><PageTitle eyebrow="Operator desk · network view" title="Keep the fleet legible." description="A quick operational read on where buses are, how full they are, and which signals need attention." action={<button type="button" data-testid="button-refresh-overview" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary hover:bg-secondary" onClick={() => query.refetch()}><RefreshCw size={14} />Refresh view</button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Active buses" value={overview.activeBuses} suffix="on road" icon={BusIcon} /><Metric label="Live tracked" value={overview.liveTrackedBuses} suffix={`/ ${overview.activeBuses}`} icon={Radio} /><Metric label="Forecast alerts" value={overview.forecastAlerts} suffix="need review" tone="warning" icon={AlertTriangle} /><Metric label="Security alerts" value={overview.securityAlerts} suffix="event-level" tone="danger" icon={ShieldAlert} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><SectionCard title="Fleet monitor" eyebrow="Live demo snapshot"><div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Updated {new Date(overview.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />All feeds responding</span></div><div className="space-y-3">{overview.fleet?.map((bus: any) => <OperatorFleetRow key={bus.id} bus={bus} />)}</div></SectionCard><SectionCard title="Occupancy mix" eyebrow="At this moment"><div className="space-y-4">{[['Low', overview.lowOccupancyBuses, 'bg-emerald-500'], ['Moderate', overview.mediumOccupancyBuses, 'bg-accent'], ['High', overview.highOccupancyBuses, 'bg-destructive']].map(([label, value, color]) => <div key={label as string}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold text-primary">{label}</span><span className="font-data text-xs text-muted-foreground">{value} buses</span></div><div className="h-3 overflow-hidden rounded-full bg-secondary"><div className={cx('h-full rounded-full', color as string)} style={{ width: `${Math.min(100, (Number(value) / Math.max(overview.activeBuses, 1)) * 100)}%` }} /></div></div>)} </div><div className="mt-8 border-t border-border pt-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Data quality issues</span><span className="font-data font-medium text-primary">{overview.dataQualityIssues}</span></div><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 size={15} className="text-emerald-600" /> ETM and camera feeds reconciled where available</div></div></SectionCard></div><div className="mt-5 flex flex-wrap gap-3"><Link href="/operator/security" data-testid="link-operator-security" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:opacity-90"><ShieldAlert size={15} />Review security events <ArrowUpRight size={14} /></Link>{overview.fleet?.[0] && <Link href={`/operator/bus/${overview.fleet[0].id}`} data-testid="link-first-operator-bus" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs font-bold text-primary hover:bg-secondary">Open bus analytics <ArrowUpRight size={14} /></Link>}</div></AppShell>;
}

function BusIcon(props: any) { return <Activity {...props} />; }
function OperatorFleetRow({ bus }: { bus: any }) {
  return <Link href={`/operator/bus/${bus.id}`} data-testid={`row-fleet-${bus.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-accent hover:bg-accent/10"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-data text-[10px] font-medium text-primary-foreground">{bus.number}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm font-bold text-primary">{bus.routeNumber}<StatusPill status={bus.status} /></div><div className="mt-1 truncate text-xs text-muted-foreground">{bus.currentLocation} · {bus.etaMinutes} min ETA</div></div><div className="hidden w-32 sm:block"><OccupancyBar value={bus.currentOccupancy} capacity={bus.capacity} label={false} /></div><ChevronRight size={16} className="text-muted-foreground" /></Link>;
}

export function OperatorBusPage() {
  const { busId = '' } = useParams<{ busId: string }>();
  const query = useGetOperatorBus({ busId }, { query: { enabled: !!busId, refetchInterval: 30000, queryKey: getGetOperatorBusQueryKey({ busId }) } });
  const bus: any = query.data;
  if (query.isLoading) return <AppShell><LoadingState rows={8} /></AppShell>;
  if (query.isError || !bus) return <AppShell><ErrorState /></AppShell>;
  const occupancy = bus.occupancyTimeline?.map((point: any) => point.camera) ?? [20, 28, 35, 42, 38, 49, 54];
  const reconciled = bus.occupancyTimeline?.map((point: any) => point.reconciled ?? point.camera) ?? occupancy;
  return <AppShell><Link href="/operator" data-testid="link-back-operator" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={15} />Fleet overview</Link><DemoBanner /><PageTitle eyebrow={`Bus ${bus.number} · ${bus.routeNumber}`} title="A bus, in context." description={`${bus.origin} to ${bus.destination} · operational analytics across location, occupancy, and ticketing`} action={<StatusPill status={bus.status} />} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Current load" value={bus.currentOccupancy} suffix={`/ ${bus.capacity} pax`} icon={Users} /><Metric label="Reconciled" value={bus.reconciledOccupancy} suffix="passengers" icon={CheckCircle2} /><Metric label="Flow, last read" value={`+${bus.flow.entriesRecent}`} suffix={`/ -${bus.flow.exitsRecent}`} icon={TrendingUp} /><Metric label="Forecast confidence" value={bus.forecastConfidence} icon={Activity} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><SectionCard title="Occupancy timeline" eyebrow="Camera vs reconciled count"><div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="h-2 w-5 rounded-full bg-primary" />Camera estimate</span><span className="flex items-center gap-2"><i className="h-2 w-5 rounded-full bg-accent" />Reconciled</span></div><div className="relative"><Chart points={occupancy} /><svg viewBox="0 0 100 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><polyline fill="none" stroke="hsl(var(--accent))" strokeWidth="1.8" strokeDasharray="3 2" points={reconciled.map((value: number, i: number) => `${(i / Math.max(reconciled.length - 1, 1)) * 100},${150 - 18 - ((value - Math.min(...reconciled)) / Math.max(Math.max(...reconciled) - Math.min(...reconciled), 1)) * 112}`).join(' ')} /></svg></div><div className="mt-2 flex justify-between font-data text-[10px] text-muted-foreground"><span>First read</span><span>Now</span></div></SectionCard><SectionCard title="Reconciliation" eyebrow="System agreement"><div className="rounded-xl bg-secondary p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-primary">Status</span><StatusPill status={bus.reconciliationStatus} /></div><div className="mt-5 flex items-end justify-between"><div><div className="font-display text-4xl font-bold text-primary">{bus.reconciledOccupancy}</div><div className="text-xs text-muted-foreground">reconciled passengers</div></div><div className="text-right"><div className="font-data text-2xl font-medium text-primary">{Math.abs(bus.currentOccupancy - bus.reconciledOccupancy)}</div><div className="text-xs text-muted-foreground">difference</div></div></div></div><div className="mt-5 space-y-3 text-xs text-muted-foreground"><div className="flex justify-between"><span>Camera reading</span><strong className="text-primary">{bus.currentOccupancy} pax</strong></div><div className="flex justify-between"><span>ETM reading</span><strong className="text-primary">{bus.reconciledOccupancy} pax</strong></div><div className="flex justify-between"><span>Last sync</span><strong className="text-primary">{bus.lastUpdatedSeconds}s ago</strong></div></div></SectionCard></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><SectionCard title="ETM timeline" eyebrow="Ticketing events"><div className="divide-y divide-border">{bus.etmTimeline?.map((event: any, i: number) => <div key={`${event.time}-${i}`} className="flex items-center gap-3 py-3"><span className="font-data text-[10px] text-muted-foreground">{event.time}</span><Ticket size={16} className="text-primary" /><span className="flex-1 text-sm text-primary">{event.quantity} tickets <span className="text-muted-foreground">to {event.destinationStage}</span></span><StatusPill status={event.status} /></div>)}</div></SectionCard><SectionCard title="Physical-stop forecast" eyebrow="Passenger impact"><div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 p-4"><div><div className="text-sm font-bold text-primary">Target: {bus.targetStop.name}</div><div className="mt-1 text-xs text-muted-foreground">Expected load at arrival</div></div><div className="text-right"><div className="font-display text-3xl font-bold text-primary">{bus.predictedOccupancy}</div><div className="font-data text-[10px] uppercase text-muted-foreground">{bus.forecastConfidence}</div></div></div><div className="mt-5"><OccupancyBar value={bus.predictedOccupancy} capacity={bus.capacity} /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Updated {new Date(bus.forecastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Use this as a service signal, not a fixed schedule.</p></SectionCard></div></AppShell>;
}

export function SecurityPage() {
  const query = useGetSecurityEvents({ query: { refetchInterval: 30000, queryKey: getGetSecurityEventsQueryKey() } });
  const events: any[] = query.data ?? [];
  const [filter, setFilter] = useState('All');
  const visible = events.filter((event) => filter === 'All' || event.status === filter);
  return <AppShell><DemoBanner /><PageTitle eyebrow="Operator desk · event review" title="Security, without the noise." description="Review event-level alerts with enough context to decide what needs attention now. Every alert is a demo AI signal, not a confirmed crime." action={<div className="flex flex-wrap items-center justify-end gap-2"><div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-muted-foreground"><ShieldAlert size={14} /> {events.length} events in feed</div><Link href="/operator/security/investigation" data-testid="link-security-investigation" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">Object tracking <ArrowUpRight size={13} /></Link></div>} /><SectionCard className="mb-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold text-primary"><Filter size={15} />Filter by status</div><div className="flex flex-wrap gap-2">{['All', 'Under review', 'Acknowledged', 'Escalated', 'Dismissed'].map((item) => <button key={item} type="button" data-testid={`button-filter-security-${item.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setFilter(item)} className={cx('rounded-lg px-3 py-2 text-xs font-bold', filter === item ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-primary')}>{item}</button>)}</div></div></SectionCard>{query.isLoading ? <LoadingState rows={5} /> : query.isError ? <ErrorState /> : visible.length === 0 ? <EmptyState title="No events in this view" text="Try another status filter. The feed itself is still healthy." /> : <SectionCard title="Event ledger" eyebrow="Most recent first"><div className="space-y-3">{visible.map((event) => <SecurityRow key={event.id} event={event} />)}</div></SectionCard>}</AppShell>;
}

export function SecurityInvestigationPage() {
  const [busNumber, setBusNumber] = useState('');
  const [time, setTime] = useState('');
  const [stop, setStop] = useState('');
  const [eventType, setEventType] = useState('');
  const [minConfidence, setMinConfidence] = useState('0');
  const [selectedId, setSelectedId] = useState('');
  const params = {
    busNumber: busNumber || undefined,
    stop: stop || undefined,
    eventType: eventType || undefined,
    minConfidence: Number(minConfidence) || undefined,
  };
  const query = useGetSecurityInvestigation(params, { query: { refetchInterval: 30000, queryKey: getGetSecurityInvestigationQueryKey(params) } });
  const events: any[] = query.data ?? [];
  const visible = events.filter((event) => !time || event.time.toLowerCase().includes(time.toLowerCase()));
  const selected = visible.find((event) => event.id === selectedId) ?? visible[0];

  return <AppShell><DemoBanner /><PageTitle eyebrow="Admin security investigation · simulated" title="Follow the interaction, not the identity." description="Map camera track IDs to nearby objects and ETM context across the physical-stop timeline. No facial recognition, names, or identity information is used." action={<StatusPill status="DEMO / SIMULATED" />} /><SectionCard className="mb-5"><div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary"><Filter size={15} />Investigation filters</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><label className="text-xs font-semibold text-muted-foreground">Bus number<input aria-label="Filter by bus number" data-testid="input-investigation-bus" value={busNumber} onChange={(event) => setBusNumber(event.target.value)} placeholder="102" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-primary outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-muted-foreground">Time<input aria-label="Filter by time" data-testid="input-investigation-time" value={time} onChange={(event) => setTime(event.target.value)} placeholder="10:42" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-primary outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-muted-foreground">Physical stop<input aria-label="Filter by physical stop" data-testid="input-investigation-stop" value={stop} onChange={(event) => setStop(event.target.value)} placeholder="Adyar O.T." className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-primary outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-muted-foreground">Event type<select aria-label="Filter by event type" data-testid="select-investigation-event-type" value={eventType} onChange={(event) => setEventType(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"><option value="">All event types</option><option value="theft">Theft pattern</option><option value="displacement">Object displacement</option></select></label><label className="text-xs font-semibold text-muted-foreground">Minimum confidence <span className="font-data text-primary">{minConfidence}%</span><input aria-label="Minimum confidence" data-testid="input-investigation-confidence" type="range" min="0" max="100" step="1" value={minConfidence} onChange={(event) => setMinConfidence(event.target.value)} className="mt-4 w-full accent-primary" /></label></div></SectionCard>{query.isLoading ? <LoadingState rows={5} /> : query.isError ? <ErrorState /> : !selected ? <EmptyState title="No simulated events match" text="Try a wider bus, stop, time, or confidence filter." /> : <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><SectionCard title="Detection ledger" eyebrow={`${visible.length} matching event${visible.length === 1 ? '' : 's'}`}><div className="space-y-3">{visible.map((event) => <button type="button" key={event.id} data-testid={`button-select-investigation-${event.id}`} onClick={() => setSelectedId(event.id)} className={cx('w-full rounded-xl border p-4 text-left transition-colors', selected.id === event.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-accent')}><div className="flex items-start justify-between gap-3"><div><div className={cx('text-sm font-bold', selected.id === event.id ? 'text-primary-foreground' : 'text-primary')}>{event.eventType}</div><div className={cx('mt-1 text-xs', selected.id === event.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>Bus {event.busNumber} · {event.physicalStop} · {event.time}</div></div><span className={cx('font-data text-xs font-bold', selected.id === event.id ? 'text-accent' : 'text-primary')}>{event.confidence}%</span></div><div className={cx('mt-3 text-xs', selected.id === event.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{event.personTrackId} → {event.objectId} · {event.objectType}</div></button>)}</div></SectionCard><InvestigationDetail event={selected} /></div>}</AppShell>;
}

function InvestigationDetail({ event }: { event: any }) {
  return <div className="space-y-5"><SectionCard title="Person ↔ object map" eyebrow="Track relationships"><div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-background p-5 sm:gap-6"><TrackNode label={event.personTrackId} detail="person track" tone="primary" /><div className="flex items-center gap-2 text-accent-foreground"><span className="hidden h-px w-12 bg-accent sm:block" /><Link2 size={20} /><span className="hidden h-px w-12 bg-accent sm:block" /></div><TrackNode label={event.objectId} detail={event.objectType} tone="accent" /></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><GitBranch size={14} />{event.interactionType}</div><div className="mt-4 rounded-xl bg-accent/15 p-4 text-xs leading-5 text-primary"><strong>DEMO / AI-generated potential security event.</strong> {event.statusDetail}. This feed does not confirm a crime or identify a person.</div><SecurityReviewActions event={event} /><ReviewHistory entries={event.reviewHistory} /></SectionCard><SectionCard title="Sequence of activity" eyebrow="Video timeline"><div className="space-y-0">{event.timeline.map((step: any, index: number) => <div key={`${step.time}-${step.label}`} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><span className={cx('z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-card', step.state === 'complete' ? 'bg-emerald-500 text-white' : step.state === 'active' ? 'bg-accent text-primary' : 'bg-secondary text-muted-foreground')}>{index + 1}</span>{index < event.timeline.length - 1 && <span className="absolute top-5 h-full w-px bg-border" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-sm font-bold text-primary"><span>{step.label}</span><span className="font-data text-[10px] text-muted-foreground">{step.time}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p></div></div>)}</div></SectionCard><div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Event context" eyebrow="Bus and location"><div className="space-y-3 text-xs"><ContextRow label="Bus number" value={event.busNumber} /><ContextRow label="Timestamp" value={event.timestamp} /><ContextRow label="Current physical stop" value={event.physicalStop} /><ContextRow label="GPS location" value={`${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`} /><ContextRow label="Detection source" value={event.source} /><ContextRow label="Event status" value={event.status} /></div></SectionCard><SectionCard title="ETM destination context" eyebrow="Passenger-flow correlation"><div className="space-y-3 text-xs"><ContextRow label="Transaction" value={event.etmContext.transactionId} /><ContextRow label="Boarding stop" value={event.etmContext.boardingStop} /><ContextRow label="Current stop" value={event.etmContext.currentStop} /><ContextRow label="Destination stage" value={event.etmContext.destinationStop} /><ContextRow label="Passenger count" value={`${event.etmContext.passengerCount} pax`} /><ContextRow label="ETM timestamp" value={event.etmContext.timestamp} /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">ETM destination data is used only to correlate passenger flow and security context. Fare rules are not inferred or changed.</p></SectionCard></div></div>;
}

function TrackNode({ label, detail, tone }: { label: string; detail: string; tone: 'primary' | 'accent' }) {
  return <div className={cx('min-w-28 rounded-xl border p-3 text-center', tone === 'primary' ? 'border-primary/20 bg-primary/5' : 'border-accent/50 bg-accent/20')}><div className="font-data text-sm font-bold text-primary">{label}</div><div className="mt-1 text-[10px] uppercase tracking-[.12em] text-muted-foreground">{detail}</div></div>;
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"><span className="text-muted-foreground">{label}</span><strong className="text-right text-primary">{value}</strong></div>;
}

function operatorRequestOptions(): RequestInit {
  const token = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('smartbus-operator-token') || (import.meta.env.DEV ? 'demo-operator-token' : '')
    : '';
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Operator-Id': 'operator-console',
    },
  };
}

function SecurityReviewActions({ event }: { event: any }) {
  const queryClient = useQueryClient();
  const mutation = useReviewSecurityEvent({
    request: operatorRequestOptions(),
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetSecurityEventsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetSecurityInvestigationQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetSecurityEventAuditQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetOperatorOverviewQueryKey() }),
        ]);
      },
    },
  });
  const actions = [
    { action: 'acknowledge' as const, label: 'Acknowledge', className: 'border-primary/30 text-primary hover:bg-primary/10' },
    { action: 'escalate' as const, label: 'Escalate', className: 'border-destructive/30 text-destructive hover:bg-destructive/10' },
    { action: 'dismiss' as const, label: 'Dismiss', className: 'border-border text-muted-foreground hover:bg-secondary hover:text-primary' },
  ];
  return <div className="mt-3 border-t border-current/10 pt-3">
    <div className="flex flex-wrap gap-2">
      {actions.map((item) => <button
        key={item.action}
        type="button"
        data-testid={`button-${item.action}-${event.id}`}
        disabled={mutation.isPending || event.status === ({ acknowledge: 'Acknowledged', escalate: 'Escalated', dismiss: 'Dismissed' } as const)[item.action]}
        onClick={() => mutation.mutate({ data: { eventId: event.id, action: item.action } })}
        className={cx('rounded-lg border px-3 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40', item.className)}
      >{mutation.isPending ? 'Saving…' : item.label}</button>)}
    </div>
    {mutation.isError && <p className="mt-2 text-xs font-semibold text-destructive">Review could not be saved. Confirm your operator session and try again.</p>}
  </div>;
}

function ReviewHistory({ entries }: { entries?: any[] }) {
  if (!entries?.length) return null;
  return <div className="mt-3 rounded-lg bg-secondary/60 p-3">
    <div className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Review audit trail</div>
    <div className="space-y-2">
      {entries.slice().reverse().map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-bold text-primary">{entry.toStatus}</span>
        <span>by {entry.operatorId}</span>
        <span>·</span>
        <span>{new Date(entry.timestamp).toLocaleString()}</span>
        {entry.note && <span className="basis-full text-primary">“{entry.note}”</span>}
      </div>)}
    </div>
  </div>;
}

function SecurityRow({ event }: { event: any }) {
  const tone = event.status === 'Escalated' ? 'border-destructive/40 bg-destructive/5' : event.status === 'Under review' ? 'border-accent/50 bg-accent/10' : 'border-border bg-background/50';
  return <div className={cx('rounded-xl border p-4', tone)} data-testid={`row-security-${event.id}`}><div className="flex flex-wrap items-start gap-3"><span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', event.status === 'Escalated' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-primary')}><ShieldAlert size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-primary">{event.eventType}</span><StatusPill status={event.status} /></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Bus {event.busNumber}</span><span>{event.physicalStop}</span><span>{event.time}</span></div></div><div className="text-right"><div className="font-display text-xl font-bold text-primary">{event.confidence}%</div><div className="font-data text-[9px] uppercase tracking-[.1em] text-muted-foreground">confidence</div></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{event.statusDetail}</p><div className="mt-3 flex items-center justify-between border-t border-current/10 pt-3 text-xs text-muted-foreground"><span>Source: {event.source}</span><Link href="/operator/security/investigation" data-testid={`button-review-${event.id}`} className="font-bold text-primary underline decoration-accent underline-offset-4">Open investigation</Link></div><SecurityReviewActions event={event} /><ReviewHistory entries={event.reviewHistory} /></div>;
}

export function NotFoundPage() {
  const [, navigate] = useLocation();
  return <AppShell><div className="flex min-h-[70vh] items-center justify-center"><div className="max-w-md text-center"><div className="font-data text-sm text-accent-foreground">404 · ROUTE NOT FOUND</div><h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-primary">That bus left the page.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">This view is not part of the passenger or operator routes yet.</p><button type="button" data-testid="button-go-home" className="mt-7 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-primary-foreground hover:opacity-90" onClick={() => navigate('/')}>Return to SmartBus</button></div></div></AppShell>;
}

export { SimulatorPage } from './simulator-page';