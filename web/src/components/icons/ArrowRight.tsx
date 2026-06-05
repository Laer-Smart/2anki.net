interface ChevronProps {
  width?: string;
  height?: string;
  outerFill?: string;
  innerFill?: string;
}

function ArrowRight({
  width,
  height,
  outerFill,
  innerFill,
}: Readonly<ChevronProps>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={outerFill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.172 12L8.22205 7.04999L9.63605 5.63599L16 12L9.63605 18.364L8.22205 16.95L13.172 12Z"
        fill={innerFill}
      />
    </svg>
  );
}

ArrowRight.defaultProps = {
  width: '24',
  height: '24',
  outerFill: 'none',
  innerFill: '#fff',
};

export default ArrowRight;
