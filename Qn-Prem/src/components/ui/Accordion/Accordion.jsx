import React, { useState } from "react";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import styles from "./Accordion.module.css";

const Accordion = ({ title, children, defaulOpen = true, onToggle }) => {
  const [isOpen, setIsOpen] = useState(defaulOpen);

  const toggleAccordion = () => {
    setIsOpen((prev) => {
      const newState = !prev;
      onToggle(newState);
      return newState;
    });
  
  }

  return (
    <div className={styles.accordionItem}>
      <div className={styles.accordionHeader} onClick={toggleAccordion}>
        <span>{title}</span>
        {isOpen ? <MinusOutlined /> : <PlusOutlined />}
      </div>
      {isOpen && <div className={styles.accordionContent}>{children}</div>}
    </div>
  );
};

export default Accordion;
