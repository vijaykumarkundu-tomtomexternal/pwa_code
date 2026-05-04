import { message } from 'antd';

const useMessageApi = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const showMessage = (type, content) => {
    messageApi.open({
      type: type,
      content: content,
    });
  };

  return {
    contextHolder,
    success: (content) => showMessage('success', content),
    error: (content) => showMessage('error', content),
    warning: (content) => showMessage('warning', content),
    info: (content) => showMessage('info', content),
  };
};

export default useMessageApi;
