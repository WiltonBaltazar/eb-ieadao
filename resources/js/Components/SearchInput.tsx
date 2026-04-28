import { useState, KeyboardEvent } from 'react';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, onSearch, placeholder = 'Pesquisar…', className = '' }: SearchInputProps) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className={`flex gap-2 flex-1 min-w-[12rem] ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        className="h-8"
      />
      <Button size="sm" variant="outline" onClick={onSearch} className="h-8">
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
