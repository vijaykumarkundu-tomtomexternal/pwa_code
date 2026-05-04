import { useEffect, useState } from "react";
import { STATUS_OPTIONS } from "../../constants";
import { Button, Flex } from "antd";
import { StatusCircle } from "./StatusCircle";

const DashboardFilterStatus = ({ onStatusChange, size = "small", fontSize, status }) => {
  const [activeStatus, setActiveStatus] = useState('ALL');

  const handleClick = (ele) => {
    setActiveStatus(ele.value)
    onStatusChange?.(ele);
  };

  useEffect(() => {
    setActiveStatus(status)
  }, [status])

  return (
    <Flex gap="small" wrap="wrap">
      {STATUS_OPTIONS.map((ele, i) => (
        <Button
          key={i}
          size={size}
          onClick={() => handleClick(ele)}
          type={ele.value === activeStatus ? "primary" : "default"}
          style={{fontWeight: 500, fontSize: fontSize}}
          icon={
            i && (
              <StatusCircle color={ele.value === activeStatus ? "white" : ele.color} />
            )
          }
        >
          {ele.label}
        </Button>
      ))}
    </Flex>
  );
};

export default DashboardFilterStatus;
