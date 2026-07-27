import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, UserMinus } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { removeMember } from './channelData';
import { useSettings } from './settingsComponents';

export function ChannelMemberProfilePage() {
  const { channelId, memberId } = useParams<{ channelId: string; memberId: string }>();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useSettings();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    const load = async () => {
      const userDoc = await getDoc(doc(db, 'users', memberId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setMember({
          id: memberId,
          name: data.displayName || 'User',
          handle: `@${(data.displayName || '').toLowerCase().replace(/\s/g, '')}`,
          bio: data.bio || '',
          role: data.role || 'user',
          winRate: data.winRate || 0,
          tipsCount: data.tipsCount || 0,
          followersCount: data.followersCount || 0,
          profilePicture: data.profilePicture,
        });
      }
      setLoading(false);
    };
    load();
  }, [memberId]);

  const handleRemove = () => {
    showConfirm({
      title: `Remove ${member?.name}?`,
      desc: 'They will lose access to this channel.',
      onConfirm: async () => {
        await removeMember(channelId!, memberId!);
        showToast(`${member?.name} removed`);
        navigate(-1);
      }
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;
  if (!member) return <div className="flex justify-center py-20 text-[#71767b] text-sm">Member not found</div>;

  return (
    <div className="p-4">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-[#1f1f1f] flex items-center justify-center font-black text-white text-2xl mb-3 overflow-hidden">
          {member.profilePicture ? <img src={member.profilePicture} alt="" className="w-full h-full object-cover" /> : member.name[0]}
        </div>
        <p className="font-black text-white text-lg">{member.name}</p>
        <p className="text-sm text-[#71767b]">{member.handle}</p>
        {member.bio && <p className="text-sm text-[#e7e9ea] mt-2 max-w-xs leading-relaxed">{member.bio}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 text-center">
          <p className="font-black text-white">{member.followersCount.toLocaleString()}</p>
          <p className="text-[10px] text-[#71767b]">Followers</p>
        </div>
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 text-center">
          <p className="font-black text-white capitalize">{member.role}</p>
          <p className="text-[10px] text-[#71767b]">Role</p>
        </div>
        {member.winRate > 0 && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 text-center">
            <p className="font-black text-green-400">{member.winRate}%</p>
            <p className="text-[10px] text-[#71767b]">Win Rate</p>
          </div>
        )}
      </div>

      <button onClick={handleRemove}
        className="w-full flex items-center justify-center gap-2 py-3 border border-[#ef4444]/30 rounded-full text-[#ef4444] text-sm font-bold hover:bg-[#ef4444]/10 transition-all">
        <UserMinus className="w-4 h-4" /> Remove from Channel
      </button>
    </div>
  );
}
