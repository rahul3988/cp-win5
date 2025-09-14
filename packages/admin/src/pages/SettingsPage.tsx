import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const changePassword = useMutation({
    mutationFn: () => apiService.changeOwnPassword(pwd.current, pwd.next),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwd({ current: '', next: '', confirm: '' });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to change password'),
  });

  // Admin Config (referrals & attendance)
  const { data: adminCfg, refetch: refetchAdminCfg, isFetching: isCfgLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => apiService.getAdminConfig(),
  });
  const updateAdminCfg = useMutation({
    mutationFn: (data: Partial<{ referralLevel1Pct: number; referralLevel2Pct: number; referralLevel3Pct: number; attendanceDay7Amt: number }>) => apiService.updateAdminConfig(data),
    onSuccess: async () => { toast.success('Admin config updated'); await refetchAdminCfg(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update config'),
  });

  return (
    <div className="space-y-6">

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Change Password</h3>
          <p className="card-description">Update your admin password</p>
        </div>
        <div className="card-content">
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!pwd.current || !pwd.next) return toast.error('Fill all required fields');
            if (pwd.next !== pwd.confirm) return toast.error('New password and confirm do not match');
            if (pwd.next.length < 8) return toast.error('New password must be at least 8 characters');
            changePassword.mutate();
          }}>
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <input type={show.current ? 'text' : 'password'} className="form-input pr-10" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" onClick={() => setShow({ ...show, current: !show.current })}>{show.current ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <input type={show.next ? 'text' : 'password'} className="form-input pr-10" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" onClick={() => setShow({ ...show, next: !show.next })}>{show.next ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <div className="relative">
                <input type={show.confirm ? 'text' : 'password'} className="form-input pr-10" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" onClick={() => setShow({ ...show, confirm: !show.confirm })}>{show.confirm ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="btn btn-primary" disabled={changePassword.isPending}>Change Password</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Referral & Attendance Settings</h3>
          <p className="card-description">Configure referral percentages and Day 7 attendance reward</p>
        </div>
        <div className="card-content">
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const l1 = Number((form.elements.namedItem('refL1') as HTMLInputElement).value);
            const l2 = Number((form.elements.namedItem('refL2') as HTMLInputElement).value);
            const l3 = Number((form.elements.namedItem('refL3') as HTMLInputElement).value);
            const day7 = Number((form.elements.namedItem('attDay7') as HTMLInputElement).value);
            const depPct = Number((form.elements.namedItem('depPct') as HTMLInputElement).value);
            // const tiers = String((form.elements.namedItem('tiers') as HTMLInputElement).value).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
            if ([l1,l2,l3].some(n => n < 0 || n > 100)) return toast.error('Referral % must be 0-100');
            if (day7 < 0) return toast.error('Attendance reward must be >= 0');
            if (depPct < 0 || depPct > 100) return toast.error('Deposit bonus % must be 0-100');
            updateAdminCfg.mutate({ referralLevel1Pct: l1, referralLevel2Pct: l2, referralLevel3Pct: l3, attendanceDay7Amt: day7 });
          }}>
            <div>
              <label className="form-label">Referral L1 (%)</label>
              <input name="refL1" type="number" className="form-input" defaultValue={adminCfg?.referralLevel1Pct ?? 0} min={0} max={100} step={0.1} />
            </div>
            <div>
              <label className="form-label">Referral L2 (%)</label>
              <input name="refL2" type="number" className="form-input" defaultValue={adminCfg?.referralLevel2Pct ?? 0} min={0} max={100} step={0.1} />
            </div>
            <div>
              <label className="form-label">Referral L3 (%)</label>
              <input name="refL3" type="number" className="form-input" defaultValue={adminCfg?.referralLevel3Pct ?? 0} min={0} max={100} step={0.1} />
            </div>
            <div>
              <label className="form-label">Attendance Day 7 Reward (₹)</label>
              <input name="attDay7" type="number" className="form-input" defaultValue={adminCfg?.attendanceDay7Amt ?? 60} min={0} step={1} />
            </div>
            <div>
              <label className="form-label">Deposit Bonus (%)</label>
              <input name="depPct" type="number" className="form-input" defaultValue={(adminCfg as any)?.depositBonusPct ?? 5} min={0} max={100} step={0.5} />
            </div>
            <div className="md:col-span-3">
              <label className="form-label">Attendance Tiers (comma-separated)</label>
              <input name="tiers" type="text" className="form-input" placeholder="5,10,15,20,30,40,60" defaultValue={(() => { try { const t = (adminCfg as any)?.attendanceTiers; if (!t) return '5,10,15,20,30,40,60'; const arr = Array.isArray(t) ? t : JSON.parse(String(t)); return Array.isArray(arr) ? arr.join(',') : '5,10,15,20,30,40,60'; } catch { return '5,10,15,20,30,40,60'; } })()} />
            </div>
            <div className="md:col-span-4">
              <button type="submit" className="btn btn-primary" disabled={updateAdminCfg.isPending || isCfgLoading}>Save Settings</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;