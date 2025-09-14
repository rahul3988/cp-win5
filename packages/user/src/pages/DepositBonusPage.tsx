import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';

const DepositBonusPage: React.FC = () => {
  const { data: cfg } = useQuery({
    queryKey: ['user-promotions-config'],
    queryFn: () => userService.getPromotionsConfig(),
    staleTime: 60000,
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Deposit Bonus</h3>
          <p className="card-description">Get a bonus on every deposit.</p>
        </div>
        <div className="card-content space-y-4">
          <div className="text-white">Current bonus: <span className="text-yellow-300 font-semibold">{cfg?.depositBonusPct ?? 5}%</span> of deposit credited to your Bonus wallet.</div>
          <div className="text-xs text-gray-400">Admins can change this percentage anytime. Applies on approval of deposit. Wagering may apply.</div>

          <div className="bg-gray-900/60 border border-yellow-400/20 rounded-lg p-4 space-y-3">
            <div className="text-white font-semibold">Quick tiers</div>
            {([500, 1000, 5000, 10000, 30000, 50000] as number[]).map((amt) => {
              const pct = Number(cfg?.depositBonusPct ?? 5);
              const bonus = Math.round((amt * pct) / 100);
              return (
                <div key={amt} className="grid grid-cols-3 items-center gap-3 bg-gray-800/70 rounded px-3 py-2">
                  <div className="text-white text-sm">Deposit <span className="font-semibold">₹{amt.toLocaleString('en-IN')}</span></div>
                  <div className="text-yellow-300 text-sm">+ ₹{bonus.toLocaleString('en-IN')}</div>
                  <div className="flex justify-end">
                    <Link to={`/deposit?amount=${amt}`} className="btn btn-primary btn-sm">Deposit</Link>
                  </div>
                </div>
              );
            })}
            <div className="text-[11px] text-gray-400">Example estimates. Your actual bonus is a percentage of any approved deposit.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositBonusPage;


