import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { File } from "@shared/schema";

interface FileInfoModalProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export default function FileInfoModal({ file, open, onClose, onDownload }: FileInfoModalProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
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
      video: { icon: 'fas fa-video', color: 'text-red-500', bg: 'bg-red-100' },
      image: { icon: 'fas fa-image', color: 'text-blue-500', bg: 'bg-blue-100' },
      audio: { icon: 'fas fa-music', color: 'text-purple-500', bg: 'bg-purple-100' },
      document: { icon: 'fas fa-file-pdf', color: 'text-red-500', bg: 'bg-red-100' },
      other: { icon: 'fas fa-file', color: 'text-gray-500', bg: 'bg-gray-100' }
    };

    return typeIcons[file.type as keyof typeof typeIcons] || typeIcons.other;
  };

  const fileIcon = getFileIcon(file);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">File Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 ${fileIcon.bg} rounded-lg flex items-center justify-center`}>
              <i className={`${fileIcon.icon} ${fileIcon.color} text-lg`}></i>
            </div>
            <div>
              <h4 data-testid="text-file-name" className="font-medium" title={file.name}>{file.name}</h4>
              <p className="text-sm text-muted-foreground capitalize">{file.type} File</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Size</span>
              <p data-testid="text-file-size" className="font-medium">{formatFileSize(file.size)}</p>
            </div>
            {file.duration && (
              <div>
                <span className="text-muted-foreground">Duration</span>
                <p data-testid="text-file-duration" className="font-medium">{formatDuration(file.duration)}</p>
              </div>
            )}
            {file.width && file.height && (
              <div>
                <span className="text-muted-foreground">Resolution</span>
                <p data-testid="text-file-resolution" className="font-medium">{file.width}×{file.height}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Format</span>
              <p data-testid="text-file-format" className="font-medium">{file.extension.toUpperCase().replace('.', '')}</p>
            </div>
            {file.createdAt && (
              <div>
                <span className="text-muted-foreground">Created</span>
                <p data-testid="text-file-created" className="font-medium">{new Date(file.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {file.modifiedAt && (
              <div>
                <span className="text-muted-foreground">Modified</span>
                <p data-testid="text-file-modified" className="font-medium">{new Date(file.modifiedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div>
            <span className="text-muted-foreground text-sm">Full Path</span>
            <p data-testid="text-file-path" className="font-mono text-sm bg-muted p-2 rounded mt-1 break-all">
              {file.path}
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            {file.type === 'video' && (
              <Button
                data-testid="button-play-video"
                className="flex-1"
                onClick={() => {
                  // Navigate to video player page
                  window.location.href = `/video/${file.id}`;
                }}
              >
                <i className="fas fa-play mr-2"></i>Play
              </Button>
            )}
            <Button
              data-testid="button-download-file"
              variant="secondary"
              className={file.type === 'video' ? 'flex-1' : 'w-full'}
              onClick={onDownload}
            >
              <i className="fas fa-download mr-2"></i>Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
