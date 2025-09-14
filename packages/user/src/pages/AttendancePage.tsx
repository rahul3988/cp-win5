import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { toast } from 'sonner';

const AttendancePage: React.FC = () => {
  const { data: attendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['user-attendance'],
    queryFn: () => userService.getAttendance(),
    staleTime: 15000,
  });
  const { data: cfg } = useQuery({
    queryKey: ['user-attendance-config'],
    queryFn: () => userService.getAttendanceConfig(),
    staleTime: 60000,
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Attendance Bonus</h3>
          <p className="card-description">Daily streak rewards. Claim once per day.</p>
        </div>
        <div className="card-content space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-2">Day 1 → 7 rewards</div>
            <div className="grid grid-cols-7 gap-1">
              {(cfg?.tiers || [5,10,15,20,30,40,60]).map((amt: number, idx: number) => (
                <div key={idx} className="text-center text-xs rounded p-2 border bg-gray-800 text-gold-300 border-gray-700">
                  <div className="font-semibold">{idx+1}</div>
                  <div className="text-[10px]">₹{amt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Current streak: {attendance?.attendanceStreak ?? 0} / 7</div>
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                try {
                  const res = await userService.claimAttendance();
                  toast.success(`Bonus credited: ₹${res.reward}`);
                  await refetchAttendance();
                } catch (e: any) {
                  toast.error(e?.response?.data?.error || 'Not eligible to claim');
                }
              }}
            >Claim Today</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;













