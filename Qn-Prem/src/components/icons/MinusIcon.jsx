const MinusIcon = ({ onClick }) => {
  return (
    <svg
      onClick={onClick}
      className="cursor-pointer"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
    >
      <g
        id="Group_173892"
        data-name="Group 173892"
        transform="translate(-1330.489 -276)"
      >
        <g
          id="Ellipse_210"
          data-name="Ellipse 210"
          transform="translate(1330.489 276)"
          fill="#3a6fbb"
          stroke="#fff"
          stroke-width="1"
        >
          <circle cx="12" cy="12" r="12" stroke="none" />
          <circle cx="12" cy="12" r="11.5" fill="none" />
        </g>
        <path
          id="Path_11752"
          data-name="Path 11752"
          d="M18,13H6a1,1,0,0,1,0-2H18a1,1,0,0,1,0,2Z"
          transform="translate(1330.489 276)"
          fill="#fff"
        />
        <path
          id="Path_11754"
          data-name="Path 11754"
          d="M18,13H13v5a1,1,0,0,1-2,0V13H6a1,1,0,0,1,0-2h5V6a1,1,0,0,1,2,0v5h5a1,1,0,0,1,0,2Z"
          transform="translate(1330.489 276)"
          fill="#fff"
          opacity="0"
        />
      </g>
    </svg>
  );
};

export default MinusIcon;
