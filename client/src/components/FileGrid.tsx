import { Button } from "@/components/ui/button";
import type { File } from "@shared/schema";

interface FileGridProps {
  files: File[];
  viewMode: "grid" | "list";
  onFileSelect: (file: File) => void;
  onFileDownload: (file: File) => void;
}

export default function FileGrid({ files, viewMode, onFileSelect, onFileDownload }: FileGridProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (file: File) => {
    const typeIcons = {
      video: { icon: 'fas fa-video', color: 'text-red-500', bg: 'bg-red-500' },
      image: { icon: 'fas fa-image', color: 'text-blue-500', bg: 'bg-blue-500' },
      audio: { icon: 'fas fa-music', color: 'text-purple-500', bg: 'bg-purple-500' },
      document: { icon: 'fas fa-file-pdf', color: 'text-red-500', bg: 'bg-red-500' },
      other: { icon: 'fas fa-file', color: 'text-gray-500', bg: 'bg-gray-500' }
    };

    return typeIcons[file.type as keyof typeof typeIcons] || typeIcons.other;
  };

  const handleFileClick = (file: File) => {
    if (file.type === 'video' || file.type === 'image') {
      onFileSelect(file);
    } else {
      onFileDownload(file);
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <i className="fas fa-folder-open text-4xl mb-4"></i>
          <p>No files found in this directory</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className={viewMode === "grid" ? "grid grid-cols-6 gap-4" : "space-y-2"}>
        {files.map((file) => {
          const fileIcon = getFileIcon(file);
          
          return (
            <div
              key={file.id}
              data-testid={`file-${file.name}`}
              className="group cursor-pointer"
              onClick={() => handleFileClick(file)}
            >
              {viewMode === "grid" ? (
                <div className="relative bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105">
                  {file.type === 'video' || file.type === 'image' ? (
                    <div className="aspect-video bg-slate-900 relative">
                      {file.thumbnailPath ? (
                        <img
                          src={`/api/thumbnails/${file.thumbnailPath}`}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <i className={`${fileIcon.icon} ${fileIcon.color} text-4xl`}></i>
                        </div>
                      )}
                      
                      {file.type === 'video' && (
                        <>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                              <i className="fas fa-play text-black text-lg ml-1"></i>
                            </div>
                          </div>
                          {file.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(file.duration)}
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className={`absolute top-2 left-2 ${fileIcon.bg} text-white text-xs px-2 py-1 rounded-full`}>
                        <i className={`${fileIcon.icon} mr-1`}></i>
                        {file.extension.toUpperCase().replace('.', '')}
                      </div>
                    </div>
                  ) : (
                    <div className={`aspect-video ${fileIcon.color.replace('text-', 'bg-').replace('-500', '-50')} relative flex items-center justify-center`}>
                      <i className={`${fileIcon.icon} ${fileIcon.color} text-4xl`}></i>
                      <div className={`absolute top-2 left-2 ${fileIcon.bg} text-white text-xs px-2 py-1 rounded-full`}>
                        <i className={`${fileIcon.icon} mr-1`}></i>
                        {file.extension.toUpperCase().replace('.', '')}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3">
                    <h3 data-testid={`text-file-name-${file.name}`} className="font-medium text-sm truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(file.size)}
                      {file.width && file.height && ` • ${file.width}×${file.height}`}
                      {file.createdAt && ` • ${new Date(file.createdAt).toLocaleDateString()}`}
                    </p>
                    {file.type === 'video' && file.hasSubtitles && (
                      <div className="flex items-center mt-2 text-xs text-green-600">
                        <i className="fas fa-closed-captioning mr-1"></i>
                        <span>Subtitles available</span>
                      </div>
                    )}
                    {(file.type === 'document' || file.type === 'other') && (
                      <div className="flex items-center mt-2 text-xs text-primary">
                        <i className="fas fa-download mr-1"></i>
                        <span>Download</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4 p-3 bg-card rounded-lg border border-border hover:bg-muted/50">
                  <div className={`w-10 h-10 rounded-lg ${fileIcon.color.replace('text-', 'bg-').replace('-500', '-50')} flex items-center justify-center`}>
                    <i className={`${fileIcon.icon} ${fileIcon.color}`}></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm truncate">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.duration && ` • ${formatDuration(file.duration)}`}
                      {file.createdAt && ` • ${new Date(file.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type === 'video' && file.hasSubtitles && (
                      <i className="fas fa-closed-captioning text-green-600" title="Subtitles available"></i>
                    )}
                    <Button
                      data-testid={`button-download-${file.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDownload(file);
                      }}
                    >
                      <i className="fas fa-download"></i>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
