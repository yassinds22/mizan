import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { notifications } from "@/data/dashboard";
import type { PageId } from "@/types/navigation";

interface NotificationsProps {
  onNavigate: (page: PageId) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(notifications.length);
  const notifyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleOpen = () => {
    setIsOpen((v) => !v);
    setUnreadCount(0);
  };

  const handleItemClick = (page: PageId) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <div className="popover-anchor" ref={notifyRef}>
      <button
        className="icon-btn"
        aria-label="الإشعارات"
        onClick={handleOpen}
      >
        <Bell size={17} />
        {unreadCount > 0 && <span className="dot" />}
      </button>

      {isOpen && (
        <div className="notify-panel">
          <div className="notify-head">
            <span>التنبيهات</span>
            <span>{notifications.length} عناصر</span>
          </div>
          {notifications.map((n) => (
            <button
              key={n.id}
              className="notify-item"
              onClick={() => handleItemClick(n.page)}
            >
              <i className={`tone ${n.tone}`} />
              <div>
                <strong>{n.title}</strong>
                <span>{n.time}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
