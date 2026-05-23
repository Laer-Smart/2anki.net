interface IconProps {
  width?: number;
  height?: number;
}

export default function ExternalLinkIcon({
  width = 16,
  height = 16,
}: Readonly<IconProps>) {
  return (
    <svg
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 3h5v5" />
      <path d="M17 3 9 11" />
      <path d="M14 11.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
    </svg>
  );
}
