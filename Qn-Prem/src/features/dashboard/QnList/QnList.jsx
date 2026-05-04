import { InfoCircleFilled, InfoCircleOutlined } from "@ant-design/icons";
import {
  Avatar,
  Card,
  Descriptions,
  Dropdown,
  Flex,
  List,
  Popover,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { assets } from "../../../assets";
import {
  StatusColors,
  StatusColorSLight,
  StatusIcon,
  StatusTags,
  StatusTitle,
} from "../../../constants";
import styles from "./QnList.module.css";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchQnData, setSelectedQn } from "../../../state/qnSlice";
import { qnAPI } from "../../../api";
import { useDownloadQN } from "../../../hooks/useDownloadQN";
import UpdateQnStatusModal from "../../decisionSupport/UpdateQnStatusModal";
import useMessageApi from "@/hooks/useMessageApi";
import QnTrackStatusModal2 from "../TrackStatusModal/QnTrackStatusModal2";

const actionIconStyles = {
  width: "14px",
  height: "14px",
  objectFit: "contain",
};

// components
const ActionItem = ({ icon, label, onClick }) => (
  <div
    key={label}
    className="flex items-center justify-center gap-1"
    style={{ color: "var(--color-8)" }}
    onClick={onClick}
  >
    {icon}
    <span style={{ fontSize: 12 }}>{label}</span>
  </div>
);

const ChangeStatus = ({ status, onChangeStatus }) => {
  let availableTags = StatusTags;

  if (status === "analyse") {
    availableTags = StatusTags.filter(
      ({ key }) => key === "accept" || key === "reject"
    );
  }

  const menuItems = availableTags.map(({ key, label, color }) => ({
    key,
    label: (
      <Tag bordered={false} color={color}>
        {label}
      </Tag>
    ),
  }));

  const handleMenuClick = (info) => {
    if (onChangeStatus) {
      onChangeStatus(info.key);
    }
  };

  return (
    <>
      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        placement="top"
        arrow={false}
      >
        <div>
          <ActionItem
            icon={<img src={assets.changeStatus} style={actionIconStyles} alt="Change Status" />}
            label="Change Status"
          />
        </div>
      </Dropdown>
    </>
  );
};

const QnDetailPopover = ({ content }) => {
  const [open, setOpen] = useState(false);

  const detailItems = [
    { label: "QN", value: content["QN"] },
    { label: "Part No", value: content["Part Number"] },
    { label: "Revision", value: content["Rev"] },
    { label: "Defect Code", value: content["Defect Code"] },
    { label: "Vendor Code", value: content["Vendor Code "] },
    { label: "Vendor", value: content["Vendor"] },
    { label: "Issue Date", value: content["Issue date"] },
    { label: "Received Date", value: content["Received date"] },
    { label: "MQI", value: content["MQI"] },
    { label: "Long Text", value: content["Long Text"] },
  ];

  const renderDescription = () => (
    <Descriptions title="" column={1} style={{ width: 300 }} size="small">
      {detailItems.map((item) => (
        <Descriptions.Item key={item.label} label={item.label}>
          {item.value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );

  return (
    <>
      <Popover
        onOpenChange={(open) => setOpen(open)}
        content={renderDescription()}
        title={<span className="primary-text">QN Notification Details</span>}
        placement="rightTop"
      >
        {open ? (
          <InfoCircleFilled className={styles.infoIcon} />
        ) : (
          <InfoCircleOutlined className={styles.infoIcon} />
        )}
      </Popover>
    </>
  );
};

export const QnListHeader = ({ color, title, count }) => {
  return (
    <div className={styles.headerQn}>
      <div
        className={styles.headerStatus}
        style={{ backgroundColor: color }}
      ></div>
      <div className={styles.headerText}>{title}</div>
      <div className={styles.headerTag}>{count}</div>
    </div>
  );
};

const QnProgress = ({ color }) => {
  return (
    <div
      className={styles.cardProgress}
      style={{ backgroundColor: color }}
    ></div>
  );
};

const QNList = ({
  loading,
  dataSource,
  status,
  filtered,
  draggedQN,
  onDragStartQN,
  onDragEndQN,
  enableDraggable = false
}) => {
  const navigate = useNavigate();
  const { contextHolder, success } = useMessageApi();
  const [column, setColumn] = useState(1);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedTrackQn, setSelectedTrackQn] = useState(null);
  const [trackQn, setTrackQn] = useState(null);
  const [formData, setFormData] = useState({
    qn: "",
    status: "",
    feedback: "",
  });
  const [loadingUpdateStatus, setLoadingUpdateStatus] = useState(false);
  const [isStatusModal, setIsStatusModal] = useState(false);
  const [draggingQN, setDraggingQN] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const downloadQN = useDownloadQN();

  const dispatch = useDispatch();

  const handleAnalyze = (item) => {
    dispatch(setSelectedQn(item));
    
    navigate("/decisionSupport");
  };
  const handleTrack = (QN) => {
    qnAPI.getQnTrack(QN).then((d) => {
      setSelectedTrackQn(QN);
      const transformedSteps = transformStepsData(d.data);
      setTrackQn(transformedSteps);
      setIsTrackModalOpen(true);
    });
  };

  const transformStepsData = (data) => {
    const transformedSteps = [];
    for (const entry of data) {
      for (const [key, value] of Object.entries(entry)) {
        if (key !== "status" && value !== "") {
          transformedSteps.push({ status: key, date: value });
        }
      }
    }

    const statusOrder = {
      created_date: 1,
      analyse_date: 2,
      accept_date: 3,
      reject_date: 4,
    };

    return transformedSteps.sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  };

  useEffect(() => {
    // console.log(dataSource);
  }, [dataSource]);

  useEffect(() => {
    setColumn(filtered ? 4 : 1);
  }, [filtered]);

  const onChangeStatus = (status, qn) => {
    setFormData({
      ...formData,
      qn: qn,
      status: status,
    });
    setIsStatusModal(true);
  };

  const handleStatusSubmit = () => {
    setLoadingUpdateStatus(true);
    qnAPI.updateQNStatus(formData)
      .then(() => {
        success('Status Updated');
        dispatch(fetchQnData());
      })
      .finally(() => {
        setLoadingUpdateStatus(false);
        setIsStatusModal(false);
      });
  };

  return (
    <>
      {contextHolder}
      <section className="flex-column">
        <QnListHeader
          title={StatusTitle[status]}
          color={StatusColors[status]}
          count={dataSource?.length}
        />
        <div className="scrollbar fixHeight" style={{ border: draggedQN && draggedQN.qn !== draggingQN ? '1px dashed #1677FF' : '' }}>
          <List
            loading={loading}
            dataSource={dataSource}
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: column,
              lg: column,
              xl: column,
              xxl: column,
            }}
            renderItem={(item) => {
              return (
                <List.Item
                  draggable={enableDraggable && !['accept', 'reject'].includes(status)}
                  onDragStart={() => {
                    setDraggingQN(item.QN);
                    onDragStartQN?.({ qn: item.QN, status });
                  }}
                  onDragEnd={() => {
                    setDraggingQN(null);
                    onDragEndQN?.();
                  }}
                  className={`${draggingQN === item.QN ? styles.draggingCard : ""}`}
                >
                  <Card
                    size="small"
                    className={`${styles.qnCard} ${enableDraggable && !['accept', 'reject'].includes(status) ? styles.enableDraggable : ''}`}
                    key={item.id}
                    actions={[
                      <Space key="actions" size="large">
                        <ActionItem
                          onClick={() => handleTrack(item.QN)}
                          icon={
                            <img src={assets.track} style={actionIconStyles} alt="track" />
                          }
                          label="Track"
                        />

                        <ActionItem
                          onClick={() => handleAnalyze(item)}
                          icon={
                            <img
                              src={assets.analyze}
                              style={actionIconStyles}
                              alt="Analyze"
                            />
                          }
                          label={["pending", "Open"].includes(status) ? "Analyze" : "View Analysis"}
                        />

                        {status === "pending" || status === "analyse" ? (
                          <ChangeStatus
                            status={status}
                            onChangeStatus={(status) =>
                              onChangeStatus(status, item.QN)
                            }
                          />
                        ) : null}

                        {/* {status !== "pending" && status !== "analyse" ? (
                          <ActionItem
                            onClick={() => downloadQN(item.QN)}
                            icon={
                              <img
                                src={assets.analyze}
                                style={actionIconStyles}
                              />
                            }
                            label="Disposition"
                          />
                        ) : null} */}
                      </Space>,
                    ]}
                  >
                    <Flex gap="small">
                      <Avatar
                        size={45}
                        className={styles.qnAvtarCard}
                        style={{
                          "--color": StatusColorSLight[status],
                          padding: "10px",
                        }}
                        shape="square"
                        src={StatusIcon[status]}
                        alt="status icon"
                      ></Avatar>
                      <Flex vertical style={{ flex: 1 }} gap="small">
                        <Flex justify="space-between">
                          <Typography.Text strong>
                            QN: {item.QN}
                          </Typography.Text>
                          <Typography.Text
                            strong
                          >
                            MQI :
                            <Typography.Text strong>
                              {" "}
                              {item["MQI"]}
                            </Typography.Text>
                          </Typography.Text>
                          <QnDetailPopover content={item} />
                        </Flex>

                        <Typography.Text
                          style={{ fontSize: 10 }}
                          type="secondary"
                        >
                          Timestamp :
                          <Typography.Text style={{ fontSize: 11 }} strong>
                            {" "}
                            {item["Issue date"]}
                          </Typography.Text>
                        </Typography.Text>
                        <QnProgress color={StatusColors[status]} />
                      </Flex>
                    </Flex>

                    <Flex vertical style={{ marginTop: "5px" }}>
                      <Typography.Text
                        style={{ fontSize: 10 }}
                        type="secondary"
                      >
                        Short Text :
                        <Typography.Text style={{ fontSize: 11 }} strong>
                          {" "}
                          {item["Short Text"]}
                        </Typography.Text>
                      </Typography.Text>
                      <Typography.Text
                        style={{ fontSize: 10 }}
                        type="secondary"
                      >
                        Part No :
                        <Typography.Text style={{ fontSize: 11 }} strong>
                          {" "}
                          {item["Part Number"]}
                        </Typography.Text>
                      </Typography.Text>
                      <Typography.Text
                        style={{ fontSize: 10 }}
                        type="secondary"
                      >
                        Vendor :
                        <Typography.Text style={{ fontSize: 11 }} strong>
                          {" "}
                          {item["Vendor"]}
                        </Typography.Text>
                      </Typography.Text>
                    </Flex>
                  </Card>
                </List.Item>
              );
            }}
          ></List>
        </div>
      </section>
      <QnTrackStatusModal2
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        selectedqn={selectedTrackQn}
        transformedData={trackQn}
      />
      <UpdateQnStatusModal
        open={isStatusModal}
        onCancel={() => setIsStatusModal(false)}
        onSubmit={handleStatusSubmit}
        feedback={formData.feedback}
        loading={loadingUpdateStatus}
        setFeedback={(val) =>
          setFormData({
            ...formData,
            feedback: val,
          })
        }
      />
    </>
  );
};

export default QNList;
