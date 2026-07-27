import type { ChangeEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, getDocs, query as firestoreQuery, where, orderBy, limit } from 'firebase/firestore';

export interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, placeholder = 'Search...', onChange, onClear }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
      <input
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
      />
      {value ? (
        <button onClick={onClear} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-[#71767b]" />
        </button>
      ) : null}
    </div>
  );
}

export interface FilterTab {
  key: string;
  label: string;
}

export interface FilterTabsProps {
  tabs: FilterTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function FilterTabs({ tabs, activeKey, onChange }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeKey === tab.key
              ? 'bg-[#ef4444] text-white'
              : 'text-[#71767b] bg-white/5 hover:text-white hover:bg-white/10'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  extra?: string;
  badge?: string;
  icon?: ReactNode;
}

export interface SearchResultsListProps {
  items: SearchResultItem[];
  emptyText?: string;
  onSelect: (id: string) => void;
}

export function SearchResultsList({ items, emptyText = 'No results found', onSelect }: SearchResultsListProps) {
  if (!items.length) {
    return (
      <div className="px-4 py-20 text-center text-sm text-[#71767b]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pb-4">
      {items.map((item, index) => (
        <motion.button
          key={item.id}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          onClick={() => onSelect(item.id)}
          className="w-full text-left bg-[#111] border border-[#1f1f1f] rounded-3xl p-4 hover:border-[#ef4444]/40 hover:bg-white/[0.03] transition-all"
        >
          <div className="flex items-start gap-3">
            {item.icon ? (
              <div className="shrink-0">{item.icon}</div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-sm text-[#ef4444] font-black shrink-0">
                {item.title[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm text-white truncate">{item.title}</p>
                {item.badge ? (
                  <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-1 rounded-full font-bold">{item.badge}</span>
                ) : null}
              </div>
              {item.subtitle ? <p className="text-xs text-[#71767b] mt-1 truncate">{item.subtitle}</p> : null}
              {item.extra ? <p className="text-[11px] text-[#71767b] mt-2">{item.extra}</p> : null}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
