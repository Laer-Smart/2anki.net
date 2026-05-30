interface Props {
  width?: number;
  height?: number;
  className?: string;
}

export default function ChevronRightIcon({
  width = 20,
  height = 20,
  className,
}: Readonly<Props>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      width={width}
      height={height}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}
