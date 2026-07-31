import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Textarea } from './textarea';

interface VariableInputProps extends React.ComponentProps<typeof Input> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  vars: Record<string, string>;
}

export const VariableInput = React.forwardRef<HTMLInputElement, VariableInputProps>(
  ({ value, onChange, vars, className, type = 'text', ...props }, ref) => {
    const localRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || localRef;
    const backdropRef = useRef<HTMLDivElement>(null);
    const [hoveredVar, setHoveredVar] = useState<{ name: string; value: string; x: number; y: number } | null>(null);

    const syncScroll = () => {
      if (resolvedRef.current && backdropRef.current) {
        backdropRef.current.scrollLeft = resolvedRef.current.scrollLeft;
      }
    };

    useEffect(() => {
      syncScroll();
    }, [value]);

    const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
      if (type === 'password') return;
      if (!resolvedRef.current) return;
      const text = value || '';
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      const matches: Array<{ name: string; start: number; end: number }> = [];
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          name: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      if (matches.length === 0) {
        setHoveredVar(null);
        return;
      }

      const rect = resolvedRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 12; // Adjust for border/padding
      const scrollLeft = resolvedRef.current.scrollLeft;
      
      const fontWidth = 7.5;
      const charIndex = Math.floor((x + scrollLeft) / fontWidth);

      const activeMatch = matches.find(m => charIndex >= m.start && charIndex <= m.end);
      if (activeMatch) {
        const varVal = vars[activeMatch.name] !== undefined ? vars[activeMatch.name] : 'Variable not found';
        setHoveredVar({
          name: activeMatch.name,
          value: varVal,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 35,
        });
      } else {
        setHoveredVar(null);
      }
    };

    const handleMouseLeave = () => {
      setHoveredVar(null);
    };

    const renderHighlights = () => {
      const text = value || '';
      const regex = /(\{\{[^}]+\}\})/g;
      const parts = text.split(regex);

      return parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const varName = part.slice(2, -2);
          const exists = vars[varName] !== undefined;
          if (exists) {
            return (
              <span
                key={i}
                className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-sm shrink-0"
              >
                {part}
              </span>
            );
          } else {
            return (
              <span
                key={i}
                className="text-rose-650 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 rounded-sm animate-pulse shrink-0"
              >
                {part}
              </span>
            );
          }
        }
        return <span key={i} className="shrink-0">{part}</span>;
      });
    };

    return (
      <div className={cn("relative w-full flex items-center", className)}>
        {type !== 'password' && (
          <div
            ref={backdropRef}
            className={cn(
              "absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden whitespace-pre text-base md:text-sm px-3 py-1 text-slate-800 dark:text-slate-100 leading-none bg-transparent border border-transparent",
              className
            )}
            style={{
              fontFamily: 'inherit',
            }}
          >
            {renderHighlights()}
          </div>
        )}

        <Input
          ref={resolvedRef}
          type={type}
          value={value}
          onChange={onChange}
          onScroll={syncScroll}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn("bg-transparent text-slate-800 dark:text-slate-100 caret-indigo-600 dark:caret-indigo-400 z-10 hover:bg-transparent focus-visible:bg-transparent select-text", className)}
          style={{
            color: type === 'password' ? 'inherit' : 'transparent',
            WebkitTextFillColor: type === 'password' ? 'inherit' : 'transparent',
            caretColor: 'var(--caret-color, #4f46e5)',
          }}
          {...props}
        />

        {hoveredVar && (
          <div
            className="absolute z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] px-2.5 py-1 rounded shadow-lg font-semibold flex flex-col pointer-events-none border border-slate-700/30 select-none animate-in fade-in duration-100"
            style={{
              left: `${hoveredVar.x}px`,
              top: `${hoveredVar.y}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-slate-400 dark:text-slate-500">Value for {"{{" + hoveredVar.name + "}}"}</span>
            <span className="font-mono text-emerald-450 dark:text-emerald-650 max-w-[200px] truncate">{hoveredVar.value}</span>
          </div>
        )}
      </div>
    );
  }
);
VariableInput.displayName = 'VariableInput';


interface VariableTextareaProps extends React.ComponentProps<typeof Textarea> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  vars: Record<string, string>;
}

export const VariableTextarea = React.forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  ({ value, onChange, vars, className, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) || localRef;
    const backdropRef = useRef<HTMLDivElement>(null);
    const [hoveredVar, setHoveredVar] = useState<{ name: string; value: string; x: number; y: number } | null>(null);

    const syncScroll = () => {
      if (resolvedRef.current && backdropRef.current) {
        backdropRef.current.scrollLeft = resolvedRef.current.scrollLeft;
        backdropRef.current.scrollTop = resolvedRef.current.scrollTop;
      }
    };

    useEffect(() => {
      syncScroll();
    }, [value]);

    const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!resolvedRef.current) return;
      const text = value || '';
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      const matches: Array<{ name: string; start: number; end: number }> = [];
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          name: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      if (matches.length === 0) {
        setHoveredVar(null);
        return;
      }

      const rect = resolvedRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 12;
      const y = e.clientY - rect.top - 12;
      const scrollLeft = resolvedRef.current.scrollLeft;
      const scrollTop = resolvedRef.current.scrollTop;
      
      const fontWidth = 7.5;
      const lineHeight = 18;
      const col = Math.floor((x + scrollLeft) / fontWidth);
      const row = Math.floor((y + scrollTop) / lineHeight);
      
      const lines = text.split('\n');
      let charIndex = 0;
      for (let r = 0; r < Math.min(row, lines.length); r++) {
        charIndex += lines[r].length + 1;
      }
      charIndex += Math.min(col, lines[row]?.length || 0);

      const activeMatch = matches.find(m => charIndex >= m.start && charIndex <= m.end);
      if (activeMatch) {
        const varVal = vars[activeMatch.name] !== undefined ? vars[activeMatch.name] : 'Variable not found';
        setHoveredVar({
          name: activeMatch.name,
          value: varVal,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
        });
      } else {
        setHoveredVar(null);
      }
    };

    const handleMouseLeave = () => {
      setHoveredVar(null);
    };

    const renderHighlights = () => {
      const text = value || '';
      const regex = /(\{\{[^}]+\}\})/g;
      const parts = text.split(regex);

      return parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const varName = part.slice(2, -2);
          const exists = vars[varName] !== undefined;
          if (exists) {
            return (
              <span
                key={i}
                className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-sm shrink-0"
              >
                {part}
              </span>
            );
          } else {
            return (
              <span
                key={i}
                className="text-rose-650 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 rounded-sm animate-pulse shrink-0"
              >
                {part}
              </span>
            );
          }
        }
        return <span key={i} className="shrink-0">{part}</span>;
      });
    };

    return (
      <div className={cn("relative w-full flex", className)}>
        <div
          ref={backdropRef}
          className={cn(
            "absolute inset-0 pointer-events-none select-none overflow-hidden whitespace-pre-wrap break-words text-base md:text-sm px-3 py-2 leading-normal text-slate-800 dark:text-slate-100 bg-transparent border border-transparent",
            className
          )}
          style={{
            fontFamily: 'inherit',
          }}
        >
          {renderHighlights()}
        </div>

        <Textarea
          ref={resolvedRef}
          value={value}
          onChange={onChange}
          onScroll={syncScroll}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn("bg-transparent text-slate-800 dark:text-slate-100 caret-indigo-600 dark:caret-indigo-400 z-10 hover:bg-transparent focus-visible:bg-transparent select-text leading-normal", className)}
          style={{
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            caretColor: 'var(--caret-color, #4f46e5)',
          }}
          {...props}
        />

        {hoveredVar && (
          <div
            className="absolute z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] px-2.5 py-1 rounded shadow-lg font-semibold flex flex-col pointer-events-none border border-slate-700/30 select-none animate-in fade-in duration-100"
            style={{
              left: `${hoveredVar.x}px`,
              top: `${hoveredVar.y}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-slate-400 dark:text-slate-500">Value for {"{{" + hoveredVar.name + "}}"}</span>
            <span className="font-mono text-emerald-455 dark:text-emerald-650 max-w-[200px] truncate">{hoveredVar.value}</span>
          </div>
        )}
      </div>
    );
  }
);
VariableTextarea.displayName = 'VariableTextarea';
