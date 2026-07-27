import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export function Header({
  onMenuClick,
}: HeaderProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      'sticky top-0 z-40 backdrop-blur-md transition-all duration-300 min-h-app-header pt-safe bg-black/80 border-b',
      scrolled ? 'bg-black/95 border-[#ef4444]/20' : 'border-[#2f3336]'
    )}>
      <div className="flex items-center justify-between px-3 sm:px-4 h-app-header">

        {/* Left — menu (mobile/tablet only) + logo and branding (all screen sizes) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="p-2 rounded-full hover:bg-white/10 transition-colors md:hidden min-h-touch min-w-touch flex items-center justify-center -ml-1"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Branding Logo & Title - Visible on all viewports */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#ef4444] shrink-0">
              <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-black text-base sm:text-lg tracking-tight">Arena</span>
          </div>
        </div>

        {/* Right — bells */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/messages')}
            aria-label="Messages"
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white min-h-touch min-w-touch flex items-center justify-center"
          >
            <Mail className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white min-h-touch min-w-touch flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">9+</span>
          </button>
        </div>

      </div>
    </header>
  );
}
