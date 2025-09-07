import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import FileGrid from "@/components/FileGrid";
import VideoModal from "@/components/VideoModal";
import FileInfoModal from "@/components/FileInfoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Directory, File } from "@shared/schema";

export default function Home() {
  const [selectedDirectory, setSelectedDirectory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showFileInfo, setShowFileInfo] = useState(false);

  const { data: directories = [] } = useQuery<Directory[]>({
    queryKey: ["/api/directories"],
  });

  const { data: files = [] } = useQuery<File[]>({
    queryKey: ["/api/files", selectedDirectory, searchQuery],
  });

  const { data: stats } = useQuery<{ totalFiles: number; totalSize: number }>({
    queryKey: ["/api/stats"],
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (file.type === "video") {
      setShowVideoModal(true);
    } else {
      setShowFileInfo(true);
    }
  };

  const handleDownload = (file: File) => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const getBreadcrumb = () => {
    if (!selectedDirectory) return ["Home"];
    
    const directory = directories.find(d => d.id === selectedDirectory);
    if (!directory) return ["Home"];
    
    const pathParts = directory.path.split('/').filter(Boolean);
    return ["Home", ...pathParts];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        directories={directories}
        selectedDirectory={selectedDirectory}
        onDirectorySelect={setSelectedDirectory}
        stats={stats}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm">
              <i className="fas fa-home text-muted-foreground"></i>
              {getBreadcrumb().map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <i className="fas fa-chevron-right text-xs text-muted-foreground"></i>}
                  <span className={index === getBreadcrumb().length - 1 ? "font-medium" : "text-muted-foreground"}>
                    {crumb}
                  </span>
                </div>
              ))}
            </div>

            {/* Search and Controls */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
                <Input
                  data-testid="input-search"
                  type="text"
                  placeholder="Search files..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* View Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  data-testid="button-view-grid"
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="p-2"
                >
                  <i className="fas fa-th text-sm"></i>
                </Button>
                <Button
                  data-testid="button-view-list"
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="p-2"
                >
                  <i className="fas fa-list text-sm"></i>
                </Button>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="size">Sort by Size</SelectItem>
                  <SelectItem value="type">Sort by Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File Count and Size */}
          <div className="mt-3 flex items-center space-x-6 text-sm text-muted-foreground">
            <span data-testid="text-file-count">{files.length} items</span>
            <span>•</span>
            <span data-testid="text-total-size">
              {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))} total
            </span>
            <span>•</span>
            <span data-testid="text-last-updated">Last updated 5 minutes ago</span>
          </div>
        </div>

        {/* File Grid */}
        <FileGrid
          files={files}
          viewMode={viewMode}
          onFileSelect={handleFileSelect}
          onFileDownload={handleDownload}
        />
      </div>

      {/* Modals */}
      {selectedFile && (
        <>
          <VideoModal
            file={selectedFile}
            open={showVideoModal}
            onClose={() => {
              setShowVideoModal(false);
              setSelectedFile(null);
            }}
          />
          <FileInfoModal
            file={selectedFile}
            open={showFileInfo}
            onClose={() => {
              setShowFileInfo(false);
              setSelectedFile(null);
            }}
            onDownload={() => handleDownload(selectedFile)}
          />
        </>
      )}
    </div>
  );
}
