import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isDestructive?: boolean;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  size = 'sm',
  isDestructive = false,
}) => {
  // Handle confirm action
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // If action is destructive, use danger variant by default
  const buttonVariant = isDestructive ? 'danger' : confirmVariant;

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} size="small" className="mr-2">
        {cancelLabel}
      </Button>
      <Button variant={buttonVariant} onClick={handleConfirm} size="small">
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} size={size}>
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
    </Modal>
  );
};

export default Dialog;
