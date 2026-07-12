import { BrandSpinner } from "@/components/ui/BrandSpinner";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      {/* `br-loader-reveal`: invisible for the first ~300ms, then fades in —
          so a navigation that resolves faster than that never flashes a
          spinner at all. */}
      <div className="animate-[br-loader-reveal_600ms_ease-out_forwards] motion-reduce:animate-none">
        <BrandSpinner tier="xl" />
      </div>
    </div>
  );
}
