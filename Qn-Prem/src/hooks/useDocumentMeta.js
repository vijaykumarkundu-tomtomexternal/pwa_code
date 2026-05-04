import { useEffect } from 'react';

const useDocumentMeta = ({ title, description, keywords }) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    const setMetaTag = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (element) {
        element.setAttribute("content", content);
      } else {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        element.setAttribute("content", content);
        document.head.appendChild(element);
      }
    };

    if (description) setMetaTag("description", description);
    if (keywords) setMetaTag("keywords", keywords);
  }, [title, description, keywords]);
};

export default useDocumentMeta;
