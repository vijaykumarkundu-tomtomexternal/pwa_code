import { API_BASE_URL } from "@/api/config";
import CustomFileUpload from "@/components/CustomFileUpload";
import { useDispatch } from "react-redux";
import { fetchQnData } from "@/state/qnSlice";

const ApiEndPoint = `${API_BASE_URL}/qnupload`;

const DashboardFileUpload = () => {
  const dispatch = useDispatch();

  const handleUploadChange = (info) => {
    // When file upload is successful, refresh the QN data by calling /menu API
    if (info.file.status === "done") {
      console.log("File uploaded successfully, refreshing QN data...");
      dispatch(fetchQnData());
    } else if (info.file.status === "error") {
      console.error("File upload failed:", info.file.error);
    }
  };

  return (
    <div>
      <CustomFileUpload
        action={ApiEndPoint}
        onChange={handleUploadChange}
        buttonText="Upload File"
        showUploadList={false}
      />
    </div>
  );
};

export default DashboardFileUpload;
