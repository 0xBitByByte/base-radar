function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text sm:text-3xl dark:text-radar-white">
        {getGreeting()}, RK
      </h1>
      <p className="mt-1.5 text-sm text-radar-light-muted sm:text-base dark:text-radar-muted">
        Here&apos;s what&apos;s happening across Base today.
      </p>
    </div>
  );
}
