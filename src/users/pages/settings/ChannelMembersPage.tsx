import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, UserMinus, Users } from 'lucide-react';
import { getChannelMembers, removeMember, type ChannelMember } from './channelData';
import { useSettings } from './settingsComponents';

export function ChannelMembersPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { showToast, showConfirm } = useSettings();
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;
    getChannelMembers(channelId).then(list => {
      setMembers(list);
      setLoading(false);
    });
  }, [channelId]);

  const handleRemove = async (memberId: string, name: string) => {
    showConfirm({
      title: `Remove ${name}?`,
      desc: 'They will lose access to this channel.',
      onConfirm: async () => {
        await removeMember(channelId!, memberId);
        setMembers(m => m.filter(u => u.id !== memberId));
        showToast(`${name} removed from channel`);
      }
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" /></div>;

  return (
    <div>
      <p className="px-4 py-3 text-xs text-[#71767b] border-b border-[#1f1f1f]">
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-10 h-10 text-[#71767b] mb-3" />
          <p className="font-bold text-white mb-1">No members yet</p>
        </div>
      ) : members.map(member => (
        <div key={member.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
          <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center font-black text-white shrink-0 overflow-hidden">
            {member.profilePicture ? <img src={member.profilePicture} alt="" className="w-full h-full object-cover" /> : member.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{member.name}</p>
            <p className="text-xs text-[#71767b]">{member.handle} · Joined {member.joinedAt}</p>
          </div>
          <button onClick={() => handleRemove(member.id, member.name)}
            className="p-2 rounded-full hover:bg-[#ef4444]/10 text-[#71767b] hover:text-[#ef4444] transition-colors">
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
