import React, { useEffect } from "react";

export interface ToastProps {
  message: string | null;
  onClose?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return <div className="toast">{message}</div>;
};
