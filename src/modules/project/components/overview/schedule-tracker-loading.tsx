export function ScheduleTrackerLoading() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2].map((item) => (
        <div key={item} className="h-8 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}
