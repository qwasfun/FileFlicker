import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { File } from "@shared/schema";

interface CleanupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CleanupModal({ open, onClose }: CleanupModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: deletedFiles = [], isLoading } = useQuery<File[]>({
    queryKey: ["/api/cleanup/deleted-files"],
    enabled: open,
  });

  const cleanupMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await fetch("/api/cleanup/delete-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds }),
      });
      if (!response.ok) throw new Error("清理失败");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanup/deleted-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleanup/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setSelectedFiles(new Set());
      onClose();
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(deletedFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleCleanup = () => {
    if (selectedFiles.size === 0) return;
    cleanupMutation.mutate(Array.from(selectedFiles));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const typeIcons = {
      video: 'fas fa-video text-red-500',
      image: 'fas fa-image text-blue-500',
      audio: 'fas fa-music text-purple-500',
      document: 'fas fa-file-pdf text-red-500',
      other: 'fas fa-file text-gray-500'
    };
    return typeIcons[file.type as keyof typeof typeIcons] || typeIcons.other;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background border">
        <DialogHeader>
          <DialogTitle>数据库清理 - 已删除的文件</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              <p className="mt-2 text-muted-foreground">正在检查已删除的文件...</p>
            </div>
          ) : deletedFiles.length === 0 ? (
            <Alert>
              <AlertDescription>
                <i className="fas fa-check-circle text-green-500 mr-2"></i>
                没有发现需要清理的文件。数据库与文件系统保持同步。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                  发现 {deletedFiles.length} 个文件存在于数据库中，但在磁盘上已被删除。
                  请选择要从数据库中清理的文件。
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    data-testid="checkbox-select-all"
                    checked={selectedFiles.size === deletedFiles.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label className="text-sm font-medium">
                    全选 ({selectedFiles.size}/{deletedFiles.length})
                  </label>
                </div>
                <Button
                  data-testid="button-cleanup-selected"
                  onClick={handleCleanup}
                  disabled={selectedFiles.size === 0 || cleanupMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  {cleanupMutation.isPending ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <i className="fas fa-trash mr-2"></i>
                  )}
                  清理选中的文件 ({selectedFiles.size})
                </Button>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {deletedFiles.map((file) => (
                    <div
                      key={file.id}
                      data-testid={`deleted-file-${file.name}`}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 border"
                    >
                      <Checkbox
                        data-testid={`checkbox-file-${file.id}`}
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <i className={getFileIcon(file)}></i>
                          <span className="font-medium truncate">{file.name}</span>
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                            已删除
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate mt-1">
                          路径: {file.path}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          大小: {formatFileSize(file.size)} • 类型: {file.type} • 
                          修改时间: {file.modifiedAt ? new Date(file.modifiedAt).toLocaleString('zh-CN') : '未知'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            data-testid="button-cancel-cleanup"
            variant="outline"
            onClick={onClose}
            disabled={cleanupMutation.isPending}
          >
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}