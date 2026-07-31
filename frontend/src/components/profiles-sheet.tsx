import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Database, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  name: string;
  variables: Record<string, string>;
}

interface VariableItem {
  id: string;
  key: string;
  value: string;
}

interface LocalProfile {
  name: string;
  variables: VariableItem[];
}

interface ProfilesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  globalVariables: Record<string, string>;
  onSave: (profiles: Profile[], globalVariables: Record<string, string>) => void;
}

export default function ProfilesSheet({
  isOpen,
  onClose,
  profiles,
  globalVariables,
  onSave,
}: ProfilesSheetProps) {
  const [localProfiles, setLocalProfiles] = useState<LocalProfile[]>([]);
  const [localGlobalVariables, setLocalGlobalVariables] = useState<VariableItem[]>([]);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number>(-1); // -1 is Global variables
  const [width, setWidth] = useState(600);
  const isDragging = useRef(false);

  // Sync props to local state ONLY when sheet opens
  useEffect(() => {
    if (isOpen) {
      // Map profiles variables to array with stable IDs
      const clonedProfiles = profiles.map(p => ({
        name: p.name,
        variables: Object.entries(p.variables || {}).map(([key, value]) => ({
          id: Math.random().toString(36).substring(2, 9),
          key,
          value,
        })),
      }));
      setLocalProfiles(clonedProfiles);

      // Map global variables to array with stable IDs
      const clonedGlobals = Object.entries(globalVariables || {}).map(([key, value]) => ({
        id: Math.random().toString(36).substring(2, 9),
        key,
        value,
      }));
      setLocalGlobalVariables(clonedGlobals);
      setSelectedProfileIndex(-1); // Default to editing Global Variables
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle panel dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(400, Math.min(window.innerWidth - 80, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSave = () => {
    const names = localProfiles.map(p => p.name.trim());
    if (names.some(name => !name)) {
      toast.error('Profile names cannot be empty');
      return;
    }
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      toast.error('Profile names must be unique');
      return;
    }

    // Convert local items back to standard Record<string, string> structures
    const convertedProfiles = localProfiles.map(p => {
      const varsObj: Record<string, string> = {};
      p.variables.forEach(item => {
        if (item.key.trim()) {
          varsObj[item.key.trim()] = item.value;
        }
      });
      return {
        name: p.name,
        variables: varsObj,
      };
    });

    const convertedGlobals: Record<string, string> = {};
    localGlobalVariables.forEach(item => {
      if (item.key.trim()) {
        convertedGlobals[item.key.trim()] = item.value;
      }
    });

    onSave(convertedProfiles, convertedGlobals);
    toast.success('Environment profiles and global variables saved successfully!');
    onClose();
  };

  const addProfile = () => {
    const newIdx = localProfiles.length + 1;
    const newProfile: LocalProfile = {
      name: `New Profile ${newIdx}`,
      variables: [
        { id: Math.random().toString(36).substring(2, 9), key: 'username', value: 'user' },
        { id: Math.random().toString(36).substring(2, 9), key: 'password', value: 'password' },
      ],
    };
    setLocalProfiles([...localProfiles, newProfile]);
    setSelectedProfileIndex(localProfiles.length);
  };

  const removeProfile = (idx: number) => {
    const updated = localProfiles.filter((_, i) => i !== idx);
    setLocalProfiles(updated);
    if (selectedProfileIndex >= updated.length) {
      setSelectedProfileIndex(Math.max(-1, updated.length - 1));
    }
  };

  const handleProfileNameChange = (idx: number, newName: string) => {
    const updated = [...localProfiles];
    updated[idx].name = newName;
    setLocalProfiles(updated);
  };

  const addVariable = (profileIdx: number) => {
    const newItem: VariableItem = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
    };

    if (profileIdx === -1) {
      setLocalGlobalVariables([...localGlobalVariables, newItem]);
      return;
    }

    const updated = [...localProfiles];
    updated[profileIdx].variables = [...updated[profileIdx].variables, newItem];
    setLocalProfiles(updated);
  };

  const removeVariable = (profileIdx: number, itemId: string) => {
    if (profileIdx === -1) {
      setLocalGlobalVariables(localGlobalVariables.filter(item => item.id !== itemId));
      return;
    }

    const updated = [...localProfiles];
    updated[profileIdx].variables = updated[profileIdx].variables.filter(item => item.id !== itemId);
    setLocalProfiles(updated);
  };

  const handleVariableKeyChange = (profileIdx: number, itemId: string, newKey: string) => {
    if (profileIdx === -1) {
      setLocalGlobalVariables(
        localGlobalVariables.map(item => (item.id === itemId ? { ...item, key: newKey } : item))
      );
      return;
    }

    const updated = [...localProfiles];
    updated[profileIdx].variables = updated[profileIdx].variables.map(item =>
      item.id === itemId ? { ...item, key: newKey } : item
    );
    setLocalProfiles(updated);
  };

  const handleVariableValueChange = (profileIdx: number, itemId: string, newValue: string) => {
    if (profileIdx === -1) {
      setLocalGlobalVariables(
        localGlobalVariables.map(item => (item.id === itemId ? { ...item, value: newValue } : item))
      );
      return;
    }

    const updated = [...localProfiles];
    updated[profileIdx].variables = updated[profileIdx].variables.map(item =>
      item.id === itemId ? { ...item, value: newValue } : item
    );
    setLocalProfiles(updated);
  };

  const activeProfile = selectedProfileIndex === -1 ? null : localProfiles[selectedProfileIndex];
  const activeVariables = selectedProfileIndex === -1 ? localGlobalVariables : activeProfile?.variables || [];
  const activeName = selectedProfileIndex === -1 ? 'Global Variables' : activeProfile?.name || '';
  const isGlobalActive = selectedProfileIndex === -1;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        style={{ width: `${width}px`, maxWidth: 'none', transition: 'none' }}
        className="p-0 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 transition-none select-none"
      >
        {/* Left border drag handle */}
        <div
          className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize hover:bg-indigo-500/40 active:bg-indigo-650 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <SheetHeader className="p-5 border-b border-slate-100 dark:border-slate-900 flex-shrink-0">
          <SheetTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-indigo-500 animate-spin-slow" />
            Environment Profiles Manager
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
            Define sets of key-value variables to swap environments. Global variables are shared across all profiles.
          </SheetDescription>
        </SheetHeader>

        {/* main body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left panel: Profiles List */}
          <div className="w-1/3 border-r border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Global Scope
                </span>
                <div
                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    selectedProfileIndex === -1
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400 border-amber-150 dark:border-amber-900 shadow-2xs'
                      : 'text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-900 dark:text-slate-355 border-transparent'
                  }`}
                  onClick={() => setSelectedProfileIndex(-1)}
                >
                  <span className="flex items-center gap-1.5">
                    🌐 Global Variables
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Environment Profiles
                </span>
                <div className="space-y-1">
                  {localProfiles.map((p, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        selectedProfileIndex === idx
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 shadow-2xs'
                          : 'text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-900 dark:text-slate-355 border-transparent'
                      }`}
                      onClick={() => setSelectedProfileIndex(idx)}
                    >
                      <input
                        type="text"
                        className="bg-transparent border-none focus:outline-none focus:ring-0 py-0 px-1 font-semibold text-xs flex-1 w-full text-ellipsis overflow-hidden"
                        value={p.name}
                        onChange={(e) => handleProfileNameChange(idx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProfile(idx);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full mt-4 h-8.5 text-xs flex items-center justify-center gap-1 cursor-pointer font-semibold border-dashed"
              onClick={addProfile}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Profile
            </Button>
          </div>

          {/* Right panel: Variables Editor */}
          <div className="flex-1 p-5 flex flex-col overflow-y-auto">
            {isGlobalActive || activeProfile ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Variables for: <strong className={isGlobalActive ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}>{activeName}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-semibold text-indigo-650 hover:text-indigo-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer flex items-center gap-1"
                    onClick={() => addVariable(selectedProfileIndex)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Variable
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_32px] gap-3 items-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider px-1 mb-1">
                    <span>Variable Name</span>
                    <span>Value</span>
                    <span></span>
                  </div>
                  {activeVariables.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_1fr_32px] gap-3 items-center">
                      <Input
                        type="text"
                        className="text-xs h-8 px-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 font-mono shadow-2xs"
                        value={item.key}
                        onChange={(e) => handleVariableKeyChange(selectedProfileIndex, item.id, e.target.value)}
                        placeholder="e.g. baseUrl"
                      />
                      <Input
                        type="text"
                        className="text-xs h-8 px-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 font-mono shadow-2xs"
                        value={item.value}
                        onChange={(e) => handleVariableValueChange(selectedProfileIndex, item.id, e.target.value)}
                        placeholder="Value"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-755 hover:bg-rose-50 dark:hover:bg-rose-955/20 cursor-pointer"
                        onClick={() => removeVariable(selectedProfileIndex, item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {activeVariables.length === 0 && (
                    <div className="text-center py-12 text-slate-450 dark:text-slate-500 text-xs">
                      No variables defined. Click <strong>Add Variable</strong> to get started.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-450 dark:text-slate-500 text-xs text-center py-12">
                <Database className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2 animate-bounce-slow" />
                No profile selected or created. Create a profile on the left sidebar to add variables.
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-5/50 dark:bg-slate-900/10 flex-shrink-0 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 px-5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-750 text-black shadow-sm cursor-pointer rounded-lg"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
