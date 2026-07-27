import { useState } from 'react';
import { Download, FileArchive, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSettings } from './settingsComponents';

type ExportStatus = 'idle' | 'preparing' | 'ready';

export function DownloadDataPage() {
  const { showToast } = useSettings();
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [includePosts, setIncludePosts] = useState(true);
  const [includeMessages, setIncludeMessages] = useState(true);
  const [includePredictions, setIncludePredictions] = useState(true);

  const requestExport = () => {
    setStatus('preparing');
    showToast('Preparing your data export...');
    setTimeout(() => {
      setStatus('ready');
      showToast('Your export is ready to download');
    }, 2000);
  };

  const download = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      includePosts,
      includeMessages,
      includePredictions,
      note: 'Sample Arena data export — full export requires backend.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arena-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started');
    setStatus('idle');
  };

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] leading-relaxed border-b border-[#1f1f1f]">
        Request a copy of your Arena data. You can choose what to include in the export file.
      </p>

      <div className="p-4 space-y-3 border-b border-[#1f1f1f]">
        {[
          { label: 'Posts & activity', value: includePosts, setter: setIncludePosts },
          { label: 'Messages', value: includeMessages, setter: setIncludeMessages },
          { label: 'Predictions & bets', value: includePredictions, setter: setIncludePredictions },
        ].map((item) => (
          <label key={item.label} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-white font-medium">{item.label}</span>
            <input
              type="checkbox"
              checked={item.value}
              onChange={(e) => item.setter(e.target.checked)}
              className="w-4 h-4 accent-[#ef4444]"
            />
          </label>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {status === 'ready' ? (
          <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Export ready</p>
              <p className="text-xs text-[#71767b] mt-1">Your data package is ready to download.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-[#111] border border-[#1f1f1f] rounded-xl">
            <FileArchive className="w-5 h-5 text-[#71767b] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">JSON export</p>
              <p className="text-xs text-[#71767b] mt-1">
                {status === 'preparing' ? 'Building your archive...' : 'Typically ready within a few seconds.'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={status === 'ready' ? download : requestExport}
          disabled={status === 'preparing'}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors',
            status === 'ready'
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-50'
          )}
        >
          <Download className="w-4 h-4" />
          {status === 'preparing' ? 'Preparing...' : status === 'ready' ? 'Download Export' : 'Request Data Export'}
        </button>
      </div>
    </div>
  );
}
