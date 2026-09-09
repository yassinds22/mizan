import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { buildSearchIndex } from "@/data/search-index";
import type { PageId, SearchHit } from "@/types/navigation";

interface GlobalSearchProps {
  onSelectHit: (page: PageId) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectHit }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const index = buildSearchIndex();
  const hits = index
    .filter((h) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return h.title.toLowerCase().includes(q) || h.meta.toLowerCase().includes(q);
    })
    .slice(0, 7);

  // Close when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("global-search");
        input?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleHitClick = (hit: SearchHit) => {
    onSelectHit(hit.page);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="search" ref={searchRef}>
      <Search size={16} />
      <input
        id="global-search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="بحث سريع في الأصناف، الفواتير، القيود..."
      />
      <kbd className="kbd">Ctrl+K</kbd>

      {isOpen && (
        <div className="search-panel" role="listbox">
          <div className="search-panel-head">
            <span>{query ? "نتائج البحث" : "اقتراحات سريعة"}</span>
            <span>{hits.length} نتيجة</span>
          </div>
          {hits.length === 0 ? (
            <div className="search-empty">
              {query ? "لا توجد نتائج مطابقة" : "اكتب للبحث في النظام..."}
            </div>
          ) : (
            hits.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                className="search-hit"
                onClick={() => handleHitClick(hit)}
              >
                <span className="pill pill-neutral type">{hit.type}</span>
                <div>
                  <strong>{hit.title}</strong>
                  <span>{hit.meta}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
