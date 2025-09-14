import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '../services/authService';

const api = authService.getApi();

const FeedbackPage: React.FC = () => {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/user/feedback', { category, message });
      return res.data.data;
    },
    onSuccess: () => toast.success('Feedback submitted'),
    onError: () => toast.error('Failed to submit feedback')
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Feedback</h3>
          <p className="card-description">Tell us what went well or needs improvement</p>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label className="form-label">Category</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>
          <div>
            <label className="form-label">Message</label>
            <textarea className="form-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your feedback here..." />
          </div>
          <button className="btn btn-primary" disabled={!message.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;


