import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const PromotionsPage: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['user-promotions'],
    queryFn: () => userService.getPromotions(),
    refetchInterval: 30000,
  });

  const items = data || [];
  const { data: cfg } = useQuery({
    queryKey: ['user-promotions-config'],
    queryFn: () => userService.getPromotionsConfig(),
    refetchInterval: 60000,
  });
  const [giftCode, setGiftCode] = useState('');
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile-basic'],
    queryFn: () => userService.getProfile(),
    staleTime: 60000,
  });
  const { data: attendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['user-attendance'],
    queryFn: () => userService.getAttendance(),
    staleTime: 15000,
  });
  useEffect(() => { userService.pingAttendance().catch(() => {}); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Promotions Hub */}
      <div className="grid grid-cols-1 gap-6">
        {/* Quick Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Link to="/promotions/invite-earn" className="group bg-gray-900/70 border border-blue-400/30 rounded-lg p-4 hover:bg-gray-800 transition">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-400/40">
                <span className="text-blue-300 text-lg">★</span>
              </div>
              <div className="text-white font-semibold text-sm">Invite & Earn</div>
              <div className="text-[11px] text-gray-300">Tap to view details</div>
            </div>
          </Link>

          <Link to="/promotions/attendance" className="group bg-gray-900/70 border border-emerald-400/30 rounded-lg p-4 hover:bg-gray-800 transition">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center ring-1 ring-emerald-400/40">
                <span className="text-emerald-300 text-lg">✓</span>
              </div>
              <div className="text-white font-semibold text-sm">Attendance</div>
              <div className="text-[11px] text-gray-300">Daily bonuses</div>
            </div>
          </Link>

          <Link to="/promotions/deposit-bonus" className="group bg-gray-900/70 border border-yellow-400/30 rounded-lg p-4 hover:bg-gray-800 transition">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center ring-1 ring-yellow-400/40">
                <span className="text-yellow-300 text-lg">₹</span>
              </div>
              <div className="text-white font-semibold text-sm">Deposit Bonus</div>
              <div className="text-[11px] text-gray-300">Every deposit</div>
            </div>
          </Link>

          <Link to="/promotions/redeem" className="group bg-gray-900/70 border border-pink-400/30 rounded-lg p-4 hover:bg-gray-800 transition">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center ring-1 ring-pink-400/40">
                <span className="text-pink-300 text-lg">🎁</span>
              </div>
              <div className="text-white font-semibold text-sm">Gift Code</div>
              <div className="text-[11px] text-gray-300">Redeem here</div>
            </div>
          </Link>
        </div>
        {/* Invite & Earn details moved to /promotions/invite-earn */}
        {/* Engagement Feed (admin-defined promotions appear here too) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Limited-time Events & Contests</h3>
            <p className="card-description">Latest offers and banners</p>
          </div>
          <div className="card-content space-y-4">
            {items.map((p: any) => (
              <Link key={p.id} to={p.slug ? `/promotions/${p.slug}` : '#'} className="block bg-gray-900/60 border border-gold-500/20 rounded-lg p-4 hover:bg-gray-800 transition">
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover rounded mb-3" />}
                <div className="text-white font-semibold mb-1">{p.title}</div>
                <div className="text-gray-300 whitespace-pre-wrap">{p.content}</div>
                {p.slug && <div className="text-[11px] text-gray-400 mt-2">Tap to open</div>}
              </Link>
            ))}
            {items.length === 0 && <p className="text-gray-300">No active promotions right now.</p>}
          </div>
        </div>

        {/* Attendance & Deposit Bonus sections removed – see dedicated pages via tiles above */}

        {/* Referral Rewards details moved to /promotions/invite-earn */}

        {/* Daily/Weekly Tasks placeholder removed */}

        {/* Gift Code section removed – use dedicated page */}
      </div>
    </div>
  );
};

export default PromotionsPage;


// Inline component: shows progress bars for invitees and qualified deposits for a given minDeposit
const TierProgress: React.FC<{ minDeposit: number }> = ({ minDeposit }) => {
  const { data } = useQuery({
    queryKey: ['referral-progress', minDeposit],
    queryFn: () => userService.getReferralStats(),
    refetchInterval: 20000,
  });
  const invitees = data?.inviteesCount || 0;
  const qualified = data?.qualifiedCount || 0;
  const pct = invitees > 0 ? Math.min(100, Math.round((qualified / invitees) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-[10px] text-blue-200">
      <div className="w-24 h-1.5 bg-blue-900 rounded overflow-hidden ring-1 ring-blue-400/40">
        <div className="h-1.5 bg-blue-400" style={{ width: pct + '%' }} />
      </div>
      <span className="text-white">{qualified}/{invitees}</span>
    </div>
  );
};

