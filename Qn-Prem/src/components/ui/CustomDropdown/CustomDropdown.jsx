

import { Select } from 'antd';
import {  DownCircleFilled } from "@ant-design/icons";
import { useState } from 'react';
import  './CustomDropdown.css';


const CustomDropdown = ({value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
   <>
    <Select
    value={value}
    size='small'
      style={{ width: 160, height: 10 }}
      onChange={onChange}
      options={options}
      variant="borderless"
      open={open}
      onDropdownVisibleChange={(visible) => setOpen(visible)}
      suffixIcon={<DownCircleFilled className={`custom-dropdown-icon ${open ? "rotate" : ""}`} />}
      className='custom-dropdown'
    />
   </>
  );
};


export default CustomDropdown;