import { useState, useEffect } from 'react';
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
import { Check, X, ArrowRight, Loader2, Database } from 'lucide-react';
import { MappingRule } from '@/types/api';
import { fetchDatasets, fetchMappings, approveMappingRule } from '@/lib/api-client';
import { toast } from 'sonner';

export default function DatasetsMappings() {
  const [mappings, setMappings] = useState<MappingRule[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedMappings, fetchedDatasets] = await Promise.all([
        fetchMappings(),
        fetchDatasets(),
      ]);
      setMappings(fetchedMappings);
      setDatasets(fetchedDatasets);
      if (fetchedDatasets && fetchedDatasets.length > 0) {
        setSelectedDatasetIndex(0);
      }
    } catch (err: any) {
      toast.error('Failed to load datasets and mapping rules from backend.');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const activeDataset = datasets[selectedDatasetIndex];
  const datasetHeaders = activeDataset?.records?.[0] ? Object.keys(activeDataset.records[0]) : [];

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
                onClick={() => setSelectedDatasetIndex(idx)}
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Smart Field Mapping Rules</h2>
          <p className="text-muted-foreground text-sm mb-6">
            AI-suggested field mappings with confidence scores
          </p>
 
          <div className="space-y-4">
            {mappings.length > 0 ? (
              mappings.map((mapping) => (
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
                    {mapping.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(mapping.id)}
                          data-testid={`button-reject-${mapping.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(mapping.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          data-testid={`button-approve-${mapping.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No active smart field mapping rules generated yet.
              </Card>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
