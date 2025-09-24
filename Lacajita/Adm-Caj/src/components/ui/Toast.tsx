import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div style={{
      position: "fixed",
      top: 24,
      right: 24,
      zIndex: 9999,
      background: "#323232",
      color: "#fff",
      padding: "1rem 2rem",
      borderRadius: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      fontSize: "1rem",
      minWidth: 220,
      maxWidth: 400,
      textAlign: "center",
    }}>
      {message}
    </div>
  );
};

export default Toast;
