import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, ArrowRight, Loader2, Database, Plus, Trash2, Sparkles } from 'lucide-react';
import { MappingRule } from '@/types/api';
import { fetchDatasets, fetchMappings, approveMappingRule, createMappingRule, deleteMappingRule, fetchRequestFields } from '@/lib/api-client';
import { toast } from 'sonner';

export default function DatasetsMappings() {
  const [mappings, setMappings] = useState<MappingRule[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [requestFields, setRequestFields] = useState<string[]>([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const activeDataset = datasets[selectedDatasetIndex];
  const datasetHeaders = activeDataset?.records?.[0] ? Object.keys(activeDataset.records[0]) : [];

  const filteredMappings = useMemo(() => {
    if (!activeDataset) return [];
    return mappings.filter((m) => {
      const parts = m.targetMapping.split('.');
      const dsName = parts[0];
      return dsName.toLowerCase() === activeDataset.datasetName.toLowerCase();
    });
  }, [mappings, activeDataset]);

  // Manual Mapping Form states
  const [sourceField, setSourceField] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedTargetField, setSelectedTargetField] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [recommendation, setRecommendation] = useState<{ datasetName: string; field: string; confidence: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const targetFieldsOptions = useMemo(() => {
    const ds = datasets.find((d) => d.datasetName === selectedDataset);
    if (!ds) return [];
    
    // Dynamic fallback flattening to support existing un-flattened database records
    const record = ds.records?.[0];
    if (record) {
      const flattenKeys = (obj: any, prefix = ''): string[] => {
        if (typeof obj !== 'object' || obj === null) return [];
        const keys: string[] = [];
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          if (typeof val === 'object' && val !== null) {
            if (Array.isArray(val)) {
              const firstItem = val[0];
              if (typeof firstItem === 'object' && firstItem !== null) {
                keys.push(newPrefix);
                keys.push(...flattenKeys(firstItem, newPrefix));
              } else {
                keys.push(newPrefix);
              }
            } else {
              keys.push(newPrefix);
              keys.push(...flattenKeys(val, newPrefix));
            }
          } else {
            keys.push(newPrefix);
          }
        });
        return keys;
      };
      return flattenKeys(record);
    }
    return ds.fields || [];
  }, [selectedDataset, datasets]);

  useEffect(() => {
    if (!sourceField.trim() || !activeDataset) {
      setRecommendation(null);
      return;
    }
    const srcLower = sourceField.trim().toLowerCase();

    const flattenKeys = (obj: any, prefix = ''): string[] => {
      if (typeof obj !== 'object' || obj === null) return [];
      const keys: string[] = [];
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            const firstItem = val[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              keys.push(newPrefix);
              keys.push(...flattenKeys(firstItem, newPrefix));
            } else {
              keys.push(newPrefix);
            }
          } else {
            keys.push(newPrefix);
            keys.push(...flattenKeys(val, newPrefix));
          }
        } else {
          keys.push(newPrefix);
        }
      });
      return keys;
    };

    const record = activeDataset.records?.[0];
    const fields = record ? flattenKeys(record) : activeDataset.fields || [];
    
    // 1. Exact match check
    for (const f of fields) {
      const fLower = f.toLowerCase();
      if (fLower === srcLower) {
        setRecommendation({ datasetName: activeDataset.datasetName, field: f, confidence: 1.0 });
        return;
      }
    }
    
    // 2. Concat fuzzy match for nested field paths (e.g. "sites.id" matching "siteId")
    for (const f of fields) {
      if (f.includes('.')) {
        const parts = f.toLowerCase().split('.');
        const lastPart = parts[parts.length - 1];
        const parentPart = parts[parts.length - 2];
        const parentSingular = parentPart.endsWith('s') ? parentPart.slice(0, -1) : parentPart;

        if (
          srcLower === `${parentSingular}${lastPart}` ||
          srcLower === `${parentSingular}_${lastPart}` ||
          srcLower === `${parentPart}${lastPart}` ||
          srcLower === `${parentPart}_${lastPart}`
        ) {
          setRecommendation({ datasetName: activeDataset.datasetName, field: f, confidence: 0.95 });
          return;
        }
      }
    }
    
    // 3. Substring fuzzy match check
    for (const f of fields) {
      const fLower = f.toLowerCase();
      if (srcLower.includes(fLower) || fLower.includes(srcLower)) {
        setRecommendation({ datasetName: activeDataset.datasetName, field: f, confidence: 0.85 });
        return;
      }
    }
    setRecommendation(null);
  }, [sourceField, activeDataset]);

  const applyRecommendation = () => {
    if (!recommendation) return;
    setSelectedDataset(recommendation.datasetName);
    setSelectedTargetField(recommendation.field);
    toast.success(`Applied recommendation: ${recommendation.datasetName}.${recommendation.field}`);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedMappings, fetchedDatasets, fetchedFields] = await Promise.all([
        fetchMappings(),
        fetchDatasets(),
        fetchRequestFields().catch(() => []),
      ]);
      setMappings(fetchedMappings);
      setDatasets(fetchedDatasets);
      setRequestFields(fetchedFields);
      if (fetchedDatasets && fetchedDatasets.length > 0) {
        setSelectedDatasetIndex(0);
        setSelectedDataset(fetchedDatasets[0].datasetName);
        const fields = fetchedDatasets[0].fields || [];
        setSelectedTargetField(fields[0] || '');
      }
    } catch (err: any) {
      toast.error('Failed to load datasets and mapping rules from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!sourceField.trim()) {
      toast.error('Please enter a source field name');
      return;
    }
    if (!selectedDataset.trim()) {
      toast.error('Please specify a target dataset');
      return;
    }
    if (!selectedTargetField.trim()) {
      toast.error('Please specify a target field');
      return;
    }

    try {
      setIsCreating(true);
      const newRule = await createMappingRule({
        sourceField: sourceField.trim(),
        datasetName: selectedDataset.trim(),
        targetField: selectedTargetField.trim(),
      });
      setMappings((prev) => [newRule, ...prev]);
      
      // Reset form
      setSourceField('');
      toast.success('Manual mapping rule created and approved!');
    } catch {
      toast.error('Failed to create manual mapping rule.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMappingRule(id, 'approved');
      setMappings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'approved' as const } : m))
      );
      toast.success('Mapping approved on backend');
    } catch {
      toast.error('Failed to update mapping rule.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await approveMappingRule(id, 'rejected');
      setMappings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'rejected' as const } : m))
      );
      toast.success('Mapping rejected on backend');
    } catch {
      toast.error('Failed to update mapping rule.');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await approveMappingRule(id, 'pending');
      setMappings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'pending' as const } : m))
      );
      toast.success('Mapping revoked successfully');
    } catch {
      toast.error('Failed to revoke mapping rule.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMappingRule(id);
      setMappings((prev) => prev.filter((m) => m.id !== id));
      toast.success('Mapping deleted successfully');
    } catch {
      toast.error('Failed to delete mapping rule.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }



  return (
    <ScrollArea className="h-full">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Response Dataset Collection</h2>
          <p className="text-muted-foreground text-sm">
            Live auto-captured response records from executed API tests
          </p>
        </div>

        {/* Dataset Tabs Selector */}
        {datasets.length > 0 && (
          <div className="flex gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-100">
            {datasets.map((d, idx) => (
              <Button
                key={idx}
                variant={selectedDatasetIndex === idx ? 'default' : 'outline'}
                size="sm"
                className="text-xs font-semibold gap-1.5"
                onClick={() => {
                  setSelectedDatasetIndex(idx);
                  setSelectedDataset(d.datasetName);
                  const fields = d.fields || [];
                  setSelectedTargetField(fields[0] || '');
                }}
              >
                <Database className="h-3.5 w-3.5" />
                {d.datasetName} ({d.records?.length || 0} records)
              </Button>
            ))}
          </div>
        )}

        <Card className="overflow-hidden">
          <Table>
            {activeDataset && datasetHeaders.length > 0 ? (
              <>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    {datasetHeaders.map((header) => (
                      <TableHead key={header} className="capitalize font-semibold text-slate-700">
                        {header.replace(/([A-Z])/g, ' $1').trim()}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDataset.records.map((row: any, rowIdx: number) => (
                    <TableRow key={rowIdx}>
                      {datasetHeaders.map((header) => {
                        const cellVal = row[header];
                        return (
                          <TableCell key={header} className="font-mono text-xs max-w-xs truncate">
                            {typeof cellVal === 'object' && cellVal !== null ? (
                              <span className="text-slate-400">{JSON.stringify(cellVal)}</span>
                            ) : (
                              String(cellVal ?? '')
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </>
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell className="text-center text-muted-foreground py-12">
                    No response datasets captured yet. Execute tests to capture response collections.
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </Card>

        <div className="pt-8 border-t border-slate-150">
          <h2 className="text-2xl font-bold text-foreground mb-2">Smart Field Mapping Rules: {activeDataset?.datasetName || ''}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            AI-suggested field mappings with confidence scores or manually specified custom rules for the selected collection
          </p>

          <Card className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 mb-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-indigo-500" /> Create Manual Field Mapping Rule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Source Field (Payload Key)
                </label>
                <input
                  list="api-request-fields"
                  type="text"
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono h-9"
                  placeholder="e.g. patientId, email"
                  value={sourceField}
                  onChange={(e) => setSourceField(e.target.value)}
                />
                <datalist id="api-request-fields">
                  {requestFields.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <span className="text-[9px] text-slate-400 block mt-0.5">Payload key (e.g. <code>patientId</code>)</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Target Dataset
                </label>
                <select
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
                  value={selectedDataset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDataset(val);
                    const ds = datasets.find((d) => d.datasetName === val);
                    if (ds && ds.fields && ds.fields.length > 0) {
                      setSelectedTargetField(ds.fields[0]);
                    } else {
                      setSelectedTargetField('');
                    }
                  }}
                >
                  <option value="">-- Select Dataset --</option>
                  {datasets.map((d) => (
                    <option key={d.datasetName} value={d.datasetName}>
                      {d.datasetName}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-400 block mt-0.5">Response collection source (e.g. <code>Patients</code>)</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Target Field
                </label>
                <input
                  list="target-fields"
                  type="text"
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono h-9"
                  placeholder="Select or type field key"
                  value={selectedTargetField}
                  onChange={(e) => setSelectedTargetField(e.target.value)}
                  disabled={!selectedDataset}
                />
                <datalist id="target-fields">
                  {targetFieldsOptions.map((f: string) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <span className="text-[9px] text-slate-400 block mt-0.5">Value field inside record (e.g. <code>id</code>)</span>
              </div>

              <div>
                <Button
                  size="sm"
                  className="w-full text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                  onClick={handleCreateMapping}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4" /> Create Rule
                </Button>
              </div>
            </div>
            {recommendation && (
              <div className="mt-3 flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-100/80 rounded-lg text-xs animate-pulse">
                <span className="text-indigo-850 flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                  Smart Recommendation: Map to dataset <strong className="text-indigo-900">{recommendation.datasetName}</strong> ➔ field <strong className="text-indigo-900">{recommendation.field}</strong> ({Math.round(recommendation.confidence * 100)}% match)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 font-semibold shadow-sm rounded-md"
                  onClick={applyRecommendation}
                >
                  Apply Match
                </Button>
              </div>
            )}
          </Card>
 
          <div className="space-y-4">
            {filteredMappings.length > 0 ? (
              filteredMappings.map((mapping) => (
                <Card
                  key={mapping.id}
                  className={`p-5 ${
                    mapping.status === 'approved'
                      ? 'bg-emerald-50 border-emerald-200'
                      : mapping.status === 'rejected'
                        ? 'bg-slate-100 border-slate-200 opacity-60'
                        : ''
                  }`}
                  data-testid={`card-mapping-${mapping.id}`}
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
                        <code className="text-sm font-mono font-semibold text-foreground px-2 py-1 bg-muted rounded" data-testid={`text-source-field-${mapping.id}`}>
                          {mapping.sourceField}
                        </code>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <code
                          className={`text-sm font-mono font-semibold px-2 py-1 rounded ${
                            mapping.status === 'rejected'
                              ? 'text-muted-foreground line-through bg-muted'
                              : 'text-cyan-700 bg-cyan-100'
                          }`}
                          data-testid={`text-target-mapping-${mapping.id}`}
                        >
                          {mapping.targetMapping}
                        </code>
                        {mapping.status === 'approved' && (
                          <Badge className="bg-emerald-200 text-emerald-800 border-emerald-300" data-testid={`badge-approved-${mapping.id}`}>
                            <Check className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {mapping.status === 'rejected' && (
                          <Badge className="bg-slate-200 text-slate-700 border-slate-300" data-testid={`badge-rejected-${mapping.id}`}>
                            <X className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Confidence Score</span>
                          <span className="font-semibold text-foreground" data-testid={`text-confidence-${mapping.id}`}>
                            {Math.round(mapping.confidence * 100)}%
                          </span>
                        </div>
                        <Progress value={mapping.confidence * 100} className="h-2" />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {mapping.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(mapping.id)}
                          data-testid={`button-revoke-${mapping.id}`}
                          className="h-8 text-xs border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      )}
                      {mapping.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(mapping.id)}
                          data-testid={`button-approve-${mapping.id}`}
                          className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-emerald-50/30"
                        >
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Approve
                        </Button>
                      )}
                      {mapping.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(mapping.id)}
                            data-testid={`button-reject-${mapping.id}`}
                            className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                          >
                            <X className="h-3.5 w-3.5 mr-1 text-rose-500" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(mapping.id)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            data-testid={`button-approve-${mapping.id}`}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(mapping.id)}
                        data-testid={`button-delete-${mapping.id}`}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No active smart field mapping rules generated for this collection yet.
              </Card>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
