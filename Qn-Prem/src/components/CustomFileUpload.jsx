import React, { useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { Button, message, Upload } from "antd";

const CustomFileUpload = ({
  action,
  headers,
  onChange,
  buttonText = "Click to Upload",
  buttonIcon = <UploadOutlined />,
  name = "file",
  showUploadList = true,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const showMessage = (type, content) => {
    messageApi.open({
      type: type,
      content: content,
    });
  };

  const uploadProps = {
    name,
    action,
    headers,
    showUploadList,
    onChange(info) {
      if (info.file.status !== "uploading") {
        // console.log(info.file, info.fileList);
        setLoading(true);
      }
      if (info.file.status === "done") {
        setLoading(false);
        showMessage("success", `${info.file.name} file uploaded successfully`);
      } else if (info.file.status === "error") {
        setLoading(false);
        showMessage("error", `${info.file.name} file upload failed.`);
      }
      if (onChange) onChange(info);
    },
  };

  return (
    <>
      {contextHolder}
      <Upload {...uploadProps}>
        <Button
          size="medium"
          type="primary"
          icon={buttonIcon}
          loading={loading}
        >
          {buttonText}
        </Button>
      </Upload>
    </>
  );
};

export default CustomFileUpload;
