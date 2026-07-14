"use client";
import { motion } from "framer-motion";
import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { motionTransition } from "./ui/motion";
import styles from "./Wordcard.module.css";

interface WordCardProps {
  title: string;
  imageSrc: string;
  overlayContent: React.ReactNode;
  className?: string;
}

const Wordcard: React.FC<WordCardProps> = ({
  title,
  imageSrc,
  overlayContent,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleModal = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`${styles['wordcard-container']} ${className}`}>
      <motion.button
        type="button"
        className={styles["image-container"]}
        onClick={toggleModal}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
        variants={{
          rest: { y: 0, boxShadow: "0 0 0 rgba(12, 33, 28, 0)" },
          hover: { y: -4, boxShadow: "var(--shadow-lg)" },
        }}
        transition={motionTransition.quick}
      >
        <motion.img
          src={imageSrc}
          alt={title}
          className={styles["wordcard-image"]}
          variants={{ rest: { scale: 1 }, hover: { scale: 1.035 } }}
          transition={motionTransition.standard}
        />
        <h2 className={styles["wordcard-title"]}>
          <span className={styles["title-text"]}>{title}</span>
        </h2>
      </motion.button>

      <CustomModal
        isOpen={isOpen}
        onClose={toggleModal}
        title={title}
        imageSrc={imageSrc}
        overlayContent={overlayContent}
      />
    </div>
  );
};

export default Wordcard;
