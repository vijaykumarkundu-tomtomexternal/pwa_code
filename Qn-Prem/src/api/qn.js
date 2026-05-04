
import api from "./config";

export const getQnMenu = () => api.get("/menu");
export const getQnInputData = () => api.get("/qnget_input_data");
export const postQnAnalyse = (qnData) => api.post("/search_qn", qnData);
export const getQnTrack = (qn) => api.post("/track", {qn});
export const updateQNStatus = (obj = { qn: null, status: "", feedback: "" }) => api.post("/qnfilepath", obj);
export const qnUpload = (obj = {file: null}) => api.post("/qnupload", obj);
export const qnDownload = (obj = {QN: null}) => api.post("/qndownload", obj);
export const qnQuery = (obj = {qn: null, question: '' }) => api.post("/qnquery", obj);
export const login = (obj = {username: "", password: ""}) => api.post("/email", obj);
export const getQNInsights = (obj) => api.post("/mqi_counts_by_part", obj);
export const getMQITrendAnalysis = (obj) => api.post("/mqi_trend_analysis", obj);





