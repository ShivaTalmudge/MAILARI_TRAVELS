import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import { Star } from 'lucide-react';

interface LeaveReviewModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeaveReviewModal({ bookingId, onClose, onSuccess }: LeaveReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast('Please select a rating', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('/reviews', { bookingId, rating, feedback });
      toast('Review submitted successfully!', 'success');
      onSuccess();
    } catch (error: any) {
      toast(error.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Leave a Review" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center justify-center space-y-2 py-4">
          <p className="text-sm text-slate-500 font-medium">How was your trip?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Additional Feedback (Optional)</label>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-h-[100px]"
            placeholder="Tell us about your experience..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Submit Review</Button>
        </div>
      </form>
    </Modal>
  );
}
