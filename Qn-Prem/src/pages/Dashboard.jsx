import { FilterOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, Upload } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { assets } from "../assets";
import AppHeader from "../components/layouts/AppHeader/AppHeader";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUserSelectLock } from "../hooks/useUserSelectLock";
import { fetchQnData, setSelectedStatus } from "../state/qnSlice";
import styles from "@/features/dashboard/Dashboard.module.css";
import { qnAPI } from "@/api";
import { STATUS_BACKEND_VALUE } from "@/constants";
import DashboardFilterStatus from "@/features/dashboard/DashboardFilterStatus";
import QNList from "@/features/dashboard/QnList/QnList";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import useMessageApi from "@/hooks/useMessageApi";
import DashboardFileUpload from "@/features/dashboard/DashboardFileUpload";
import DashboardAutoCompleteFilter from "@/features/dashboard/DashboardAutoCompleteFilter";


const { Text, Paragraph } = Typography;

const STATUS_KEYS = {
  PENDING: "pending",
  ANALYZED: "analyse",
  ACCEPTED: "accept",
  REJECTED: "reject",
};

const Dashboard = () => {
  useDocumentMeta({
    title: "Dashboard | QN Automation",
    description: "QN Dashboard",
    keywords: "QN, QN Automation, Dashboard, Cyient"
  });
  const { contextHolder, success } = useMessageApi();
  const isMobile = useIsMobile();
  const [isExpende, setIsExpende] = useState(true);
  const [activeFilter, setActiveFilter] = useState(false);
  const [draggedQN, setDraggedQN] = useState(null);

  const { statusGroups, data, selectedStatus, loading } = useSelector(
    (state) => state.qn
  );
  const dispatch = useDispatch();

  useBodyScrollLock(!isMobile);
  useUserSelectLock(true);

  useEffect(() => {
    dispatch(fetchQnData());
  }, [dispatch]);

  const handleStatusChange = (status) => {
    dispatch(setSelectedStatus(status.value));
  };

  const handleDropStatusChange = (qn, newStatus) => {
    const updateData = {
      qn: qn,
      status: STATUS_BACKEND_VALUE[newStatus],
      feedback: "",
    };

    qnAPI.updateQNStatus(updateData).then(() => {
      success('Status Updated');
      dispatch(fetchQnData());
    });
  };

  const renderQnLists = () => {
    return Object.entries(STATUS_KEYS).map(([key, statusKey]) => {
      if (selectedStatus === "ALL" || selectedStatus === key) {
        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedQN?.qn && draggedQN?.status !== statusKey) {
                handleDropStatusChange(draggedQN.qn, statusKey);
              }
            }}
          >
            <QNList
              loading={loading}
              dataSource={statusGroups[statusKey]}
              filtered={selectedStatus !== "ALL"}
              enableDraggable={selectedStatus === "ALL"}
              status={statusKey}
              draggedQN={draggedQN}
              onDragStartQN={(data) => setDraggedQN(data)}
              onDragEndQN={() => setDraggedQN(null)}
            />
          </div>
        );
      }
      return null;
    });
  };

  return (
    <>
    <div className={styles.dashboardWrapper}>
      {/* header section */}
      <AppHeader />
      {/* main section */}
      <main>
         {contextHolder}
        {isExpende && (
          <section className={styles.subHeader}>
            <Flex gap="small" justify="space-between" align="center" wrap="wrap">
              <Text className={styles.userTitle}>
                Welcome back, User
                <Paragraph className={styles.userSubTitle}>
                  Find your all QN reports under one place
                </Paragraph>
              </Text>
              <Flex gap="small">
                <Button
                  size="medium"
                  color="primary"
                  variant="outlined"
                  icon={<FilterOutlined />}
                  onClick={() => setActiveFilter((pre) => !pre)}
                >
                  Filters
                </Button>
                  <DashboardFileUpload/> 
                  {/* <Button size="medium" type="primary"  icon={<UploadOutlined />}>
                  Upload File
                </Button> */}
              </Flex>
            </Flex>
            <Flex gap="small" justify="space-between" style={{ gap: "100px" }}>
              <DashboardFilterStatus
                size="medium"
                fontSize={12}
                status={selectedStatus}
                onStatusChange={handleStatusChange}
              />
              {/* {activeFilter ? <DashboardFilter data={data} /> : null} */}
              {activeFilter ? <DashboardAutoCompleteFilter data={data} /> : null}
            </Flex>
          </section>
        )}
        <div className="flex justify-center">
          <Button
            style={{ width: 120 }}
            size="small"
            icon={
              <img src={isExpende ? assets.arrowOpen : assets.arrowClose} alt="Expend" />
            }
            onClick={() => setIsExpende((pre) => !pre)}
          ></Button>
        </div>
        <section
          className={
            selectedStatus === "ALL" ? styles.qnAll : styles.filteredQn
          }
        >
          {renderQnLists()}
        </section>
      </main>
    </div>
    </>
  );
};

export default Dashboard;
