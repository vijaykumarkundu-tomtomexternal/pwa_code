const RenderDescriptions = ({ items }) => (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '14px'}}>
      {items.map((item, index) => (
        <div className="flex gap-2" key={index} style={{fontSize: '14px', lineHeight: '1.4'}}>
          <p className="font-semibold" style={{'white-space': 'nowrap', fontSize: '14px'}}>{item.label} : </p>
          <p className="flex-1" style={{'overflow-wrap': 'break-word', fontSize: '14px'}}>{item.value}</p>
        </div>
      ))}
    </div>
  );

  export default  RenderDescriptions;