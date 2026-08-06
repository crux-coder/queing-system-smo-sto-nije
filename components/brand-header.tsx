import { LogOutIcon, MapPinIcon } from "@/components/icons";
import { copy } from "@/lib/copy";

export function BrandHeader({
  locationName,
  onLogout,
}: {
  locationName: string;
  onLogout?: () => void;
}) {
  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="navbar mx-auto min-h-20 w-full max-w-3xl gap-3 px-5 sm:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-content">S</div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">{copy.brand}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-base-content/55">
              <MapPinIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{locationName}</span>
            </p>
          </div>
        </div>
        {onLogout ? (
          <button type="button" onClick={onLogout} className="btn btn-ghost min-h-12 px-3 text-primary" aria-label="Odjava">
            <LogOutIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Odjava</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
