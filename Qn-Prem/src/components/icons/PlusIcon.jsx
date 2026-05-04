const PlusIcon = ({onClick}) => {
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
        id="Group_173893"
        data-name="Group 173893"
        transform="translate(-1344.489 -274)"
      >
        <g
          id="Ellipse_211"
          data-name="Ellipse 211"
          transform="translate(1344.489 274)"
          fill="#888f98"
          stroke="#fff"
          stroke-width="1"
        >
          <circle cx="12" cy="12" r="12" stroke="none" />
          <circle cx="12" cy="12" r="11.5" fill="none" />
        </g>
        <path
          id="Path_11753"
          data-name="Path 11753"
          d="M18,13H13v5a1,1,0,0,1-2,0V13H6a1,1,0,0,1,0-2h5V6a1,1,0,0,1,2,0v5h5a1,1,0,0,1,0,2Z"
          transform="translate(1344.489 274)"
          fill="#fff"
        />
        <path
          id="Path_11755"
          data-name="Path 11755"
          d="M18,13H6a1,1,0,0,1,0-2H18a1,1,0,0,1,0,2Z"
          transform="translate(1344.489 274)"
          fill="#fff"
          opacity="0"
        />
      </g>
    </svg>
  );
};

export default PlusIcon;
