import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function SelectField({ label, value, onChange, options, placeholder, className = '' }: SelectFieldProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field appearance-none pr-9"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}

interface SearchInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ label, value, onChange, placeholder, className = '' }: SearchInputProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );
}

interface CollapsibleFiltersProps {
  children: ReactNode;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CollapsibleFilters({ children, onClear, hasActiveFilters }: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="btn-outline !py-2"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          Filtros
        </button>
        {hasActiveFilters && (
          <button onClick={onClear} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Limpar filtros
          </button>
        )}
      </div>
      {open && <div className="mt-3 card p-4 animate-slide-down">{children}</div>}
    </div>
  );
}
