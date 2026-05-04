import { assets } from "../assets";

// private 
 const STATUS_COLORS2 = {
  PENDING: "#FF9B4F",
  ANALYZED: "#1677FF",
  ACCEPTED: "#00BF00",
  REJECTED: "#FF5353",
};

const STATUS_COLORS = {
  PENDING: "var(--status-pending)",
  ANALYZED: "var(--status-analyzed)",
  ACCEPTED: "var(--status-accepted)",
  REJECTED: "var(--status-rejected)",
};


const STATUS_COLORS_LIGHT = {
  PENDING: "var(--status-pending-light)",
  ANALYZED: "var(--status-analyzed-light)",
  ACCEPTED: "var(--status-accepted-light)",
  REJECTED: "var(--status-rejected-light)",
};


export const StatusColors = {
  pending: STATUS_COLORS.PENDING,
  analyse: STATUS_COLORS.ANALYZED,
  accept: STATUS_COLORS.ACCEPTED,
  reject: STATUS_COLORS.REJECTED,
};


export const StatusColorSLight = {
  pending: STATUS_COLORS_LIGHT.PENDING,
  analyse: STATUS_COLORS_LIGHT.ANALYZED,
  accept: STATUS_COLORS_LIGHT.ACCEPTED,
  reject: STATUS_COLORS_LIGHT.REJECTED,
};

export const STATUS_OPTIONS = [
  { value: "ALL", color: "", label: "ALL" },
  { value: "PENDING", color: STATUS_COLORS.PENDING, label: "PENDING" },
  { value: "ANALYZED", color: STATUS_COLORS.ANALYZED, label: "IN PROGRESS" },
  { value: "ACCEPTED", color: STATUS_COLORS.ACCEPTED, label: "ACCEPTED" },
  { value: "REJECTED", color: STATUS_COLORS.REJECTED, label: "REJECTED" },
];

export const StatusTitle = {
  pending: "Pending",
  Open: "Pending",
  analyse: "In Progress",
  accept: "Accepted",
  reject: "Rejected",
};
export const STATUS_BACKEND_VALUE = {
  pending: "Open",
  analyse: "analyse",
  accept: "accept",
  reject: "reject",
};
export const StatusClass = {
  pending: "warning-text",
  Open: "warning-text",
  analyse: "primary-text",
  accept: "success-text",
  reject: "danger-text",
};

export const StatusOrder = ["pending", "analyse", "accept", "reject"];

export const StatusTags = [
  { key: "analyse", label: "In Progress", color: "default" },
  { key: "accept", label: "Accept", color: "success" },
  { key: "reject", label: "Reject", color: "error" },
];

export const StatusIcon = {
  start: assets.start,
  pending: assets.pending,
  analyse: assets.business,
  accept: assets.accepted,
  reject: assets.reject,
};