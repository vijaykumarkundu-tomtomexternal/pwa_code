import { Modal, Button } from "antd";

// eslint-disable-next-line no-unused-vars
const QNInfoModal = ({ open, onClose, selectedQn }) => {
  return (
    <Modal
      closable={true}
      centered
      open={open}
      onCancel={onClose}
      // width={500}
      footer={[]}
      footer1={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{ backgroundColor: "#212a42", color: "white" }}
        >
          Cancel
        </Button>,
      ]}
      style={{ top: 20 }}
    >
      {/* <div className="alert-details-container1">
        <h3 style={{ color: "#47479b" }}>QN Info</h3>

        <div
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            borderRadius: "4px",
            height: "400px",
            overflowY: "auto",
            marginTop: "20px",
            fontSize: "12px",
            textAlign: "left",
          }}
        >
          <Chatbot shadow={false} title="QN Info"/>
        </div>
      </div> */}
      {/* <Chatbot title="QN Info" /> */}
    </Modal>
  );
};

export default QNInfoModal;

// {"qn":4002637676,"question":"what is different type of examine"}
