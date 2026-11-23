import { AppErrorBoundary } from '@/components/dashboard/app-error-boundary';
import { GongjeRadarApp } from '@/components/dashboard/gongje-radar-app';

export default function Home() {
  return (
    <AppErrorBoundary>
      <GongjeRadarApp />
    </AppErrorBoundary>
  );
}