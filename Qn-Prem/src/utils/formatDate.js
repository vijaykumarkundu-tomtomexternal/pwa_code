export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};
export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateTime = (date) => {
  const d = new Date(date);
  const datePart = formatDate(d);
  const timePart = formatTime(d);
  return `${datePart} | ${timePart}`;
};


export const formatDateYMD = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateYMDTime = (date) => {
  const d = new Date(date);
  const datePart = formatDateYMD(d);
  const timePart = formatTime(d);
  return `${datePart} | ${timePart}`;
};