import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const PromotionsPage: React.FC = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ title: string; content: string; imageUrl?: string; isActive: boolean; slug?: string }>(
    { title: '', content: '', imageUrl: undefined, isActive: true, slug: '' }
  );

  const { data } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: () => apiService.getPromotions({ pageSize: 100 }),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: () => apiService.createPromotion(form as any),
    onSuccess: () => { setForm({ title: '', content: '', imageUrl: undefined, isActive: true, slug: '' }); qc.invalidateQueries({ queryKey: ['admin-promotions'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updatePromotion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promotions'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promotions'] }),
  });

  const toDataUrl = (file: File) => new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(file); });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Create Promotion</h3>
          <p className="card-description">Add a new promotion with optional image</p>
        </div>
        <div className="card-content space-y-3">
          <input className="input input-bordered w-full" placeholder="Title (e.g., Invite & Earn)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input input-bordered w-full" placeholder="Slug (e.g., invite-earn, attendance, deposit-bonus)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <textarea className="textarea textarea-bordered w-full" placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, imageUrl: await toDataUrl(f) }); }} />
            {form.imageUrl && <img src={form.imageUrl} alt="preview" className="h-12 rounded" />}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <button className="btn btn-primary" onClick={() => createMutation.mutate()} disabled={!form.title || !form.content}>Create</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Promotions</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.items || []).map((p: any) => (
              <div key={p.id} className="border rounded p-3 space-y-2 bg-white">
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-32 object-cover rounded" />}
                <div className="font-semibold">{p.title}</div>
                {p.slug && <div className="text-xs text-gray-500">Slug: {p.slug}</div>}
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{p.content}</div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={p.isActive} onChange={(e) => updateMutation.mutate({ id: p.id, data: { isActive: e.target.checked } })} /> Active
                  </label>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline btn-xs" onClick={() => updateMutation.mutate({ id: p.id, data: { slug: prompt('Enter slug', p.slug || '') || null } })}>Set Slug</button>
                    <button className="btn btn-outline btn-xs" onClick={() => deleteMutation.mutate(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {(data?.items || []).length === 0 && <div className="text-gray-500">No promotions yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionsPage;


