import { StatusIcon } from "@/constants";
import { formatDateYMDTime } from "@/utils/formatDate";
import { CloseOutlined } from "@ant-design/icons";
import { Drawer, Steps } from "antd";
import { calculateTimeAgo } from "../../../utils";
import "./TrackStatusModal.css";

const { Step } = Steps;

// Status Map
const statusMap = {
  start_date: {
    title: "Start",
    description: "QN : ",
    titleStyle: { color: "var(--success-color)" },
    icon: <img src={StatusIcon.start} alt="start" />,
  },
  created_date: {
    title: "Pending",
    description: "Created QN",
    titleStyle: { color: "var(--warning-color)" },
    icon: (
      <img
        src={StatusIcon.pending}
        alt="pending"
        style={{ background: "var(--warning-color-light)" }}
      />
    ),
  },
  analyse_date: {
    title: "In Progress",
    description: "In Progress QN",
    titleStyle: { color: "var(--primary-color)" },
    icon: (
      <img
        src={StatusIcon.analyse}
        alt="analyse"
        style={{ background: "var(--primary-color-light)" }}
      />
    ),
  },
  accept_date: {
    title: "Accepted",
    description: "Accepted the QN",
    titleStyle: { color: "var(--success-color)" },
    icon: (
      <img
        src={StatusIcon.accept}
        alt="accepted"
        style={{ background: "var(--success-color-light)" }}
      />
    ),
  },
  reject_date: {
    title: "Rejected",
    description: "Rejected the QN",
    titleStyle: { color: "var(--danger-color)" },
    icon: (
      <img
        src={StatusIcon.reject}
        alt="reject"
        style={{ background: "var(--danger-color-light)" }}
      />
    ),
  },
};

const QnTrackStatusModal2 = ({
  isOpen,
  onClose,
  selectedqn,
  transformedData = [],
}) => {
  if (!transformedData || transformedData.length === 0) {
    return null;
  }
  const stepsData = [{ date: "", status: "start_date" }, ...transformedData];

  const renderSteps = () =>
    stepsData.map((step, index) => {
      const { status, date } = step;
      const stepDetails = statusMap[status] || {};
      const { title, description, icon, titleStyle } = stepDetails;

      const timeAgo = calculateTimeAgo(new Date() - new Date(date));

      return (
        <Step
          key={index}
          // title={title}
          icon={icon}
          description={
            <div className="step-box">
              <p className="step-box-title" style={titleStyle}>{title}</p>
              <span>
                <span className="font-bold">
                  {description}
                  {status === "start_date" ? (
                    selectedqn
                  ) : (
                    <span> - {timeAgo}</span>
                  )}
                </span>
              </span>
              {date && <p>{formatDateYMDTime(date)}</p>}
            </div>
          }
        />
      );
    });

  return (
    <Drawer
      width={"30vw"}
      title="Track"
      headerStyle={{ backgroundColor: "#1677FF", color: "#fff" }}
      bodyStyle={{ backgroundColor: "var(--color-25)" }}
      closable={false}
      extra={
        <CloseOutlined
          style={{ color: "#fff", fontSize: "16px" }}
          onClick={onClose}
        />
      }
      onClose={onClose}
      open={isOpen}
    >
      <section className="steps-wrapper">
        <Steps direction="vertical" current={stepsData.length - 1}>
          {renderSteps()}
        </Steps>
      </section>
    </Drawer>
  );
};

export default QnTrackStatusModal2;
