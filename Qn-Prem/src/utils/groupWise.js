export function groupWise(arr, keyExtractor, titleExtractor) {
    const group = arr.reduce((data, item) => {
      const key = keyExtractor(item);
      const title = titleExtractor(item);
  
      if (!data[key]) {
        data[key] = { key, title, data: [] };
      }
  
      data[key].data.push(item);
  
      return data;
    }, {});
  
    return Object.values(group);
  }
  