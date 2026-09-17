import { avatarColor, initials } from "@/lib/avatar";

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

export default function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${avatarColor(name)}`}
    >
      {initials(name)}
    </span>
  );
}
