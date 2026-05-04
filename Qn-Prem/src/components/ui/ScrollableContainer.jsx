
const ScrollableContainer = ({ children, className = "", maxHeight = 'calc(100vh - 300px)'   }) => {
  return (
    <div className={`scrollbar fixHeight ${className}`} style={{maxHeight: maxHeight}}>
      {children}
    </div>
  );
};

export default ScrollableContainer;
