import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function VideoUploadModal({ isOpen, onClose, onSubmit }: VideoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (newFile) {
      setFile(newFile);
    }
  };

  const handleSubmit = () => {
    if (!file || !title.trim()) {
      alert('Please upload a video and add a title');
      return;
    }
    onSubmit({ file, title, description });
    setFile(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">📹 Upload Video</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Share your analysis video</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <label className="block">
                  <div className="border-2 border-dashed border-[#1f1f1f] rounded-lg p-8 text-center cursor-pointer hover:border-[#ef4444]/50 transition-colors">
                    <Upload className="w-8 h-8 text-[#71767b] mx-auto mb-2" />
                    <p className="text-sm text-white font-semibold">Drag/click to upload</p>
                    <p className="text-xs text-[#71767b] mt-1">MP4, MOV, WebM • Max 100MB</p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {file && (
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-3">
                    <p className="text-sm text-white font-semibold">📹 {file.name}</p>
                    <p className="text-xs text-[#71767b]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Video title..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white outline-none focus:border-[#ef4444]/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's in this video?"
                    className="w-full h-20 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder:text-[#71767b] outline-none focus:border-[#ef4444]/50 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#1f1f1f] bg-black/50 flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] text-white">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || !title.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    file && title.trim()
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post Video
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
