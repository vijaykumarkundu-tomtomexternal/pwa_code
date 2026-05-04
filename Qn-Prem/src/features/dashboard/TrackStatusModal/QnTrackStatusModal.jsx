import React from "react";
import { Modal, Button, Steps, Typography } from "antd";
import {
  CloseOutlined,
  CheckOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { calculateTimeAgo } from "../../utils";

const { Title } = Typography;
const { Step } = Steps;

// Status Map
const statusMap = {
  created_date: {
    title: "Pending",
    description: "Created QN",
    className: "pending",
    icon: <FieldTimeOutlined style={{ fontSize: "15px" }} />,
  },
  analyse_date: {
    title: "In Progress",
    description: "In Progress QN",
    className: "analyzed",
    icon: <CheckOutlined style={{ fontSize: "15px" }} />,
  },
  accept_date: {
    title: "Accepted",
    description: "Accepted the QN",
    className: "accepted",
    icon: <CheckOutlined style={{ fontSize: "15px" }} />,
  },
  reject_date: {
    title: "Rejected",
    description: "Rejected the QN",
    className: "rejected",
    icon: <CloseOutlined style={{ fontSize: "15px" }} />,
  },
};

const styleWrapper = {
  border: "1px solid #ccc",
  padding: 8,
  borderRadius: 4,
  height: "400px",
  maxHeight: "300px",
  overflow: "auto",
  marginTop: 20,
  fontSize: 12,
  display: "flex",
  justifyContent: "center",
};

const QnTrackStatusModal = ({ isOpen, onClose, selectedqn, transformedData }) => {
  if (!transformedData || transformedData.length === 0) {
    return null;
  }

  const renderSteps = () =>
    transformedData.map((step, index) => {
      const { status, date } = step;
      const stepDetails = statusMap[status] || {};
      const { title, description, className, icon } = stepDetails;

      const timeAgo = calculateTimeAgo(new Date() - new Date(date));

      return (
        <Step
          key={index}
          title={title}
          className={className}
          icon={icon}
          description={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>{description}</span>
              <FieldTimeOutlined style={{ fontSize: "14px" }} />
              <span>{timeAgo}</span>
            </div>
          }
        />
      );
    });

  return (
    <Modal
      centered
      open={isOpen}
      onCancel={onClose}
      // width={600}
      // style={{ top: 30 }}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{ backgroundColor: "#212a42", color: "white" }}
        >
          Cancel
        </Button>,
      ]}
    >
      <div>
        <Title level={5} style={{ color: "#47479b" }}>
          {selectedqn}
        </Title>

        <div style={styleWrapper}>
          <div style={{ margin: "10px 0" }}>
            <Steps direction="vertical" current={transformedData.length - 1}>
              {renderSteps()}
            </Steps>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QnTrackStatusModal;
