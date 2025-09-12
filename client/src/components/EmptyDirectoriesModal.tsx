import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Directory } from "@shared/schema";

interface EmptyDirectoriesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EmptyDirectoriesModal({ open, onClose }: EmptyDirectoriesModalProps) {
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: emptyDirectories = [], isLoading } = useQuery<Directory[]>({
    queryKey: ["/api/directories/empty"],
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (directoryIds: string[]) => {
      const response = await fetch("/api/directories/delete-empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directories/empty"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSelectedDirectories(new Set());
      onClose();
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDirectories(new Set(emptyDirectories.map(d => d.id)));
    } else {
      setSelectedDirectories(new Set());
    }
  };

  const handleSelectDirectory = (directoryId: string, checked: boolean) => {
    const newSelected = new Set(selectedDirectories);
    if (checked) {
      newSelected.add(directoryId);
    } else {
      newSelected.delete(directoryId);
    }
    setSelectedDirectories(newSelected);
  };

  const handleDelete = () => {
    if (selectedDirectories.size === 0) return;
    deleteMutation.mutate(Array.from(selectedDirectories));
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background border">
        <DialogHeader>
          <DialogTitle>删除空文件夹</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              <p className="mt-2 text-muted-foreground">正在检查空文件夹...</p>
            </div>
          ) : emptyDirectories.length === 0 ? (
            <Alert>
              <AlertDescription>
                <i className="fas fa-check-circle text-green-500 mr-2"></i>
                没有发现空文件夹。所有目录都包含文件或子目录。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                  发现 {emptyDirectories.length} 个空文件夹（不包含文件和子目录）。
                  请选择要删除的空文件夹。
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    data-testid="checkbox-select-all-directories"
                    checked={selectedDirectories.size === emptyDirectories.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label className="text-sm font-medium">
                    全选 ({selectedDirectories.size}/{emptyDirectories.length})
                  </label>
                </div>
                <Button
                  data-testid="button-delete-selected-directories"
                  onClick={handleDelete}
                  disabled={selectedDirectories.size === 0 || deleteMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  {deleteMutation.isPending ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <i className="fas fa-trash mr-2"></i>
                  )}
                  删除选中的文件夹 ({selectedDirectories.size})
                </Button>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {emptyDirectories.map((directory) => (
                    <div
                      key={directory.id}
                      data-testid={`empty-directory-${directory.name}`}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 border"
                    >
                      <Checkbox
                        data-testid={`checkbox-directory-${directory.id}`}
                        checked={selectedDirectories.has(directory.id)}
                        onCheckedChange={(checked) => handleSelectDirectory(directory.id, checked as boolean)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-folder-open text-muted-foreground"></i>
                          <span className="font-medium truncate">{directory.name}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            空文件夹
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate mt-1">
                          路径: {directory.path}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          文件数: {directory.fileCount || 0} • 
                          创建时间: {formatDate(directory.createdAt)} • 
                          更新时间: {formatDate(directory.updatedAt)}
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
            data-testid="button-cancel-empty-directories"
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}