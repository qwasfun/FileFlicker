import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import RecentFiles from "@/components/RecentFiles";
import type { Directory, ScanJob, File } from "@shared/schema";

interface SidebarProps {
  directories: Directory[];
  selectedDirectory: string;
  onDirectorySelect: (directoryId: string) => void;
  stats?: { totalFiles: number; totalSize: number };
  onFileSelect: (file: File, source?: 'grid' | 'recent') => void;
  onFileDownload: (file: File) => void;
}

export default function Sidebar({ directories, selectedDirectory, onDirectorySelect, stats, onFileSelect, onFileDownload }: SidebarProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: scanJob } = useQuery<ScanJob>({
    queryKey: ["/api/scan/status"],
    refetchInterval: 2000, // Poll every 2 seconds
  });

  const startScanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start scan");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate scan status to immediately show the new scan
      queryClient.invalidateQueries({ queryKey: ["/api/scan/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleRefreshScan = () => {
    startScanMutation.mutate();
  };

  const toggleDirectory = (dirId: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId);
    } else {
      newExpanded.add(dirId);
    }
    setExpandedDirs(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDirectoryTree = () => {
    const rootDirs = directories.filter(dir => !dir.parentId);
    const dirMap = new Map<string, Directory[]>();
    
    directories.forEach(dir => {
      if (dir.parentId) {
        if (!dirMap.has(dir.parentId)) {
          dirMap.set(dir.parentId, []);
        }
        dirMap.get(dir.parentId)!.push(dir);
      }
    });

    const renderDirectory = (dir: Directory, level = 0): React.ReactNode => {
      const hasChildren = dirMap.has(dir.id);
      const isExpanded = expandedDirs.has(dir.id);
      const isSelected = selectedDirectory === dir.id;

      return (
        <div key={dir.id} className="directory-item">
          <div
            data-testid={`directory-${dir.name}`}
            className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group ${
              isSelected ? 'bg-primary/10' : ''
            }`}
            style={{ marginLeft: `${level * 1.5}rem` }}
            onClick={() => {
              if (hasChildren) {
                toggleDirectory(dir.id);
              }
              onDirectorySelect(dir.id);
            }}
          >
            {hasChildren && (
              <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs text-muted-foreground group-hover:text-foreground`}></i>
            )}
            <i className="fas fa-folder text-primary"></i>
            <span className="text-sm font-medium flex-1">{dir.name}</span>
            <span data-testid={`count-${dir.name}`} className="text-xs text-muted-foreground">{dir.fileCount}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className="space-y-1">
              {dirMap.get(dir.id)!.map(childDir => renderDirectory(childDir, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return rootDirs.map(dir => renderDirectory(dir));
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-folder text-primary-foreground text-sm"></i>
          </div>
          <div>
            <h1 data-testid="text-app-title" className="text-lg font-semibold">FileSync Pro</h1>
            <p className="text-xs text-muted-foreground">Directory Manager</p>
          </div>
        </div>
      </div>

      {/* Scan Status */}
      <div className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Scan</span>
          <span className="text-xs text-muted-foreground">
            {scanJob?.completedAt ? new Date(scanJob.completedAt).toLocaleTimeString() : 'Never'}
          </span>
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            scanJob?.status === 'scanning' ? 'bg-green-500 animate-pulse' : 
            scanJob?.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`}></div>
          <span data-testid="text-scan-status" className="text-sm">
            {scanJob?.status === 'scanning' ? 'Scanning active' :
             scanJob?.status === 'error' ? 'Scan error' : 'Scanning idle'}
          </span>
          <Button
            data-testid="button-refresh-scan"
            variant="ghost"
            size="sm"
            className="ml-auto p-1 h-auto text-xs text-primary hover:text-primary/80"
            onClick={handleRefreshScan}
            disabled={scanJob?.status === 'scanning' || startScanMutation.isPending}
            title="手动扫描目录"
          >
            <i className={`fas fa-sync-alt ${startScanMutation.isPending ? 'fa-spin' : ''}`}></i>
          </Button>
        </div>
        {scanJob && (
          <div className="mt-2 bg-secondary rounded-full h-2">
            <div 
              data-testid="progress-scan"
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanJob.progress || 0}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {getDirectoryTree()}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div data-testid="text-total-files" className="text-lg font-semibold text-primary">
              {stats?.totalFiles?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-muted-foreground">Total Files</div>
          </div>
          <div>
            <div data-testid="text-total-size" className="text-lg font-semibold text-green-600">
              {stats ? formatFileSize(stats.totalSize) : '0 B'}
            </div>
            <div className="text-xs text-muted-foreground">Total Size</div>
          </div>
        </div>
      </div>

      {/* Recent Files Section */}
      <div className="mt-6">
        <RecentFiles 
          onFileSelect={(file) => onFileSelect(file, 'recent')}
          onFileDownload={onFileDownload}
        />
      </div>
    </div>
  );
}
