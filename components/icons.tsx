import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Icon>
);
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Icon>
);
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>
);
export const ClockIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 10m2 4a7 7 0 0 0 12 2.5L20 14" /></Icon>
);
export const QrIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2M20 14v3M14 18h3M20 20h-3" /></Icon>
);
export const EditIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></Icon>
);
export const LogOutIcon = (props: IconProps) => (
  <Icon {...props}><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></Icon>
);
export const XIcon = (props: IconProps) => (
  <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>
);
export const WifiOffIcon = (props: IconProps) => (
  <Icon {...props}><path d="m2 2 20 20M8.5 8.5A9 9 0 0 1 21 9M3 9a15 15 0 0 1 2.4-2M6 13a9 9 0 0 1 6-2c1 0 2 .2 3 .5M9.5 16.5a4 4 0 0 1 5 0M12 20h.01" /></Icon>
);
