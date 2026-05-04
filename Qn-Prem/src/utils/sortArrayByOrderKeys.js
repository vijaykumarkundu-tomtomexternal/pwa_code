export const sortArrayByOrderKeys = (arr, orderKeys) => {
  if (orderKeys.length) {
    arr.sort((a, b) => {
      return orderKeys.indexOf(a.key) - orderKeys.indexOf(b.key);
    });
  }

  return arr;
};
