import { qnAPI } from "../api";
import {useFileDownloader} from "../hooks/useFileDownloader";

export const useDownloadQN = () => {
  const downloadFile = useFileDownloader();

  const handleDownload = async (QN) => {
    try {
      const res = await qnAPI.qnDownload({ QN });
      const url = res.data.url;
      const fileName = url.split("/").pop();
      downloadFile(url, fileName);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  return handleDownload;
};

