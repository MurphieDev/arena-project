import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Upload, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ScreenshotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function ScreenshotUploadModal({ isOpen, onClose, onSubmit }: ScreenshotUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews(prev => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('Please upload at least one screenshot');
      return;
    }
    onSubmit({ files, caption });
    setFiles([]);
    setPreviews([]);
    setCaption('');
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
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-black/50">
                <div>
                  <h2 className="text-xl font-black text-white">📸 Upload Screenshots</h2>
                  <p className="text-xs text-[#71767b] mt-0.5">Share analysis or proof images</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                  <X className="w-5 h-5 text-[#71767b]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <label className="block">
                  <div className="border-2 border-dashed border-[#1f1f1f] rounded-lg p-6 text-center cursor-pointer hover:border-[#ef4444]/50 transition-colors">
                    <Upload className="w-8 h-8 text-[#71767b] mx-auto mb-2" />
                    <p className="text-sm text-white font-semibold">Drag/click to upload</p>
                    <p className="text-xs text-[#71767b] mt-1">Multiple images allowed</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {previews.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden bg-[#111]">
                        <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-2 right-2 p-1 rounded-lg bg-red-500/80 hover:bg-red-600 text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#71767b] uppercase mb-2 block">Caption</label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Describe these screenshots..."
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
                  disabled={files.length === 0}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    files.length > 0
                      ? 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg'
                      : 'bg-[#111] border border-[#1f1f1f] text-[#71767b] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Post Screenshots
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
