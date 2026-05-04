import { Modal, Button, Input, Spin } from "antd";

const { TextArea } = Input;

const UpdateQnStatusModal = ({
  open,
  onCancel,
  onSubmit,
  feedback,
  setFeedback,
  loading,
}) => {
  return (
    <Modal
      closable={false}
      open={open}
      centered
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={onSubmit}
          loading={loading}
        >
          Submit
        </Button>,
      ]}
    >
      <Spin tip="Submitting..." spinning={loading}>
        <TextArea
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter Your Comments"
        />
      </Spin>
    </Modal>
  );
};

export default UpdateQnStatusModal;
