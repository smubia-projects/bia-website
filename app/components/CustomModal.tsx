import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './CustomModal.module.css';
import { MOTION_EASE, motionTransition } from './ui/motion';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imageSrc: string;
  overlayContent: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  imageSrc,
  overlayContent
}) => {
  return (
    <Modal 
      isOpen={isOpen}
      onOpenChange={onClose}
      size="md"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white",
        wrapper: styles['modal-wrapper'],
        body: `${styles['modal-body']} ${styles['scrollable']}`,
        header: styles['modal-header'],
        closeButton: styles['close-button'],
        backdrop: "backdrop-blur-lg",
      }}
      className={styles['modal-content']}
      motionProps={{
        initial: { opacity: 0, y: 18, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.98 },
        transition: { duration: 0.28, ease: MOTION_EASE },
      }}
      closeButton={
        <motion.button
          className={styles['close-button']}
          whileHover={{ backgroundColor: 'rgba(18, 53, 44, 0.12)', rotate: 4 }}
          whileTap={{ scale: 0.92 }}
          transition={motionTransition.quick}
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.75} />
        </motion.button>
      }
    >
      <ModalContent>
        <ModalHeader className={styles['modal-header']}>
          {title}
        </ModalHeader>
        <ModalBody>
          <img 
            src={imageSrc} 
            alt={title} 
            className={styles['modal-image']}
          />
          <div className={styles['modal-text']}>
            {overlayContent}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CustomModal;
