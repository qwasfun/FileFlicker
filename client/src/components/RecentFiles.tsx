import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { File } from "@shared/schema";

interface RecentFileView {
  id: string;
  userId: string;
  fileId: string;
  viewType: string;
  viewedAt: string;
  file: File;
}

interface RecentFilesProps {
  onFileSelect: (file: File) => void;
  onFileDownload: (file: File) => void;
}

export default function RecentFiles({ onFileSelect, onFileDownload }: RecentFilesProps) {
  const { data: recentViews = [], isLoading } = useQuery<RecentFileView[]>({
    queryKey: ["/api/recent-views"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getFileIcon = (file: File) => {
    const typeIcons = {
      video: { icon: 'fas fa-video', color: 'text-red-500' },
      image: { icon: 'fas fa-image', color: 'text-blue-500' },
      audio: { icon: 'fas fa-music', color: 'text-purple-500' },
      document: { icon: 'fas fa-file-pdf', color: 'text-red-500' },
      other: { icon: 'fas fa-file', color: 'text-gray-500' }
    };
    return typeIcons[file.type as keyof typeof typeIcons] || typeIcons.other;
  };

  const getViewTypeLabel = (viewType: string) => {
    const labels = {
      download: '下载',
      stream: '播放',
      modal_view: '查看',
      info_view: '信息'
    };
    return labels[viewType as keyof typeof labels] || viewType;
  };

  const handleFileClick = (file: File) => {
    if (file.type === 'video' || file.type === 'image') {
      onFileSelect(file);
    } else {
      onFileDownload(file);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-clock text-lg"></i>
            <span>最近查看</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentViews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-clock text-lg"></i>
            <span>最近查看</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <i className="fas fa-history text-2xl mb-2"></i>
              <p>暂无最近查看的文件</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <i className="fas fa-clock text-lg"></i>
          <span>最近查看</span>
          <span className="text-sm font-normal text-muted-foreground">({recentViews.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentViews.map((view) => {
            const fileIcon = getFileIcon(view.file);
            
            return (
              <div
                key={view.id}
                data-testid={`recent-file-${view.file.name}`}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleFileClick(view.file)}
              >
                <div className="flex-shrink-0">
                  <i className={`${fileIcon.icon} ${fileIcon.color} text-lg`}></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate" title={view.file.name}>
                      {view.file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded">
                        {getViewTypeLabel(view.viewType)}
                      </span>
                      <span>{formatDate(view.viewedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                    <span className="capitalize">{view.file.type}</span>
                    <span>{formatFileSize(view.file.size)}</span>
                    <span className="truncate max-w-48" title={view.file.path}>
                      {view.file.path}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button
                    data-testid={`button-download-${view.file.name}`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileDownload(view.file);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fas fa-download text-sm"></i>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {recentViews.length >= 20 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              显示最近 20 个文件
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}