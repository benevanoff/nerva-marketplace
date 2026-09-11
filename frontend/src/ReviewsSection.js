import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from './UserContext';
import './reviews.css';

const Star = ({ filled, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

export const Stars = ({ rating, size = 16 }) => (
    <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} filled={star <= rating} size={size} />
        ))}
    </span>
);

const StarPicker = ({ rating, onPick }) => (
    <div className="review-star-picker" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                className={`review-star-button ${star <= rating ? 'filled' : ''}`}
                onClick={() => onPick(star)}
                role="radio"
                aria-checked={star === rating}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
                <Star filled={star <= rating} size={24} />
            </button>
        ))}
    </div>
);

const ReviewForm = ({ listing_id, onSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const submitReview = async () => {
        if (rating === 0) {
            setFeedback({ type: 'error', message: 'Pick a star rating first.' });
            return;
        }
        setIsSubmitting(true);
        setFeedback(null);
        try {
            const response = await fetch(`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/${listing_id}/review`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment })
            });
            const result = await response.json();
            if (!response.ok) {
                const detail = result && result.detail ? result.detail : 'Your review was rejected.';
                setFeedback({ type: 'error', message: String(detail) });
                return;
            }
            if (onSubmitted) onSubmitted(result);
        } catch (error) {
            console.error('Error submitting review:', error);
            setFeedback({ type: 'error', message: 'Could not reach the server. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="review-form">
            <h3>Write a review</h3>
            <StarPicker rating={rating} onPick={setRating} />
            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="How was the product and the vendor? (optional)"
                rows="3"
                maxLength="1024"
            />
            {feedback && <p className={`review-form-feedback ${feedback.type}`}>{feedback.message}</p>}
            <button onClick={submitReview} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Submit review'}
            </button>
        </div>
    );
};

const ReviewsSection = ({ listing_id }) => {
    const [reviewData, setReviewData] = useState(null);
    const [error, setError] = useState(null);
    const { userDetails, authChecked } = useContext(UserContext);
    const navigate = useNavigate();

    const fetchReviews = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/${listing_id}/reviews`);
            if (!response.ok) {
                throw new Error('Failed to load reviews');
            }
            setReviewData(await response.json());
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing_id]);

    const handleReviewSubmitted = (newReview) => {
        // fold the fresh review into the list without refetching
        setReviewData(current => ({
            reviews: [newReview, ...(current ? current.reviews : [])],
            count: (current ? current.count : 0) + 1,
            average: current && current.count > 0 && current.average !== null
                ? Math.round(((current.average * current.count) + newReview.rating) / (current.count + 1) * 100) / 100
                : newReview.rating
        }));
    };

    if (error) {
        return <p className="reviews-error">Could not load the reviews. {error}</p>;
    }

    if (!reviewData) {
        return <p className="reviews-loading">Loading reviews...</p>;
    }

    return (
        <div className="reviews-section">
            <div className="reviews-summary">
                {reviewData.average !== null ? (
                    <>
                        <Stars rating={Math.round(reviewData.average)} size={20} />
                        <strong>{reviewData.average}</strong>
                        <span>based on {reviewData.count} review{reviewData.count > 1 ? 's' : ''}</span>
                    </>
                ) : (
                    <span className="reviews-muted">No reviews yet</span>
                )}
            </div>

            {authChecked && userDetails ? (
                <ReviewForm listing_id={listing_id} onSubmitted={handleReviewSubmitted} />
            ) : authChecked ? (
                <p className="reviews-muted">
                    <button className="reviews-login-link" onClick={() => navigate('/login')}>Log in</button>
                    to review this listing after buying it.
                </p>
            ) : null}

            {reviewData.reviews.length > 0 && (
                <div className="reviews-list">
                    {reviewData.reviews.map((review, index) => (
                        <div className="review-item" key={`${review.username}-${index}`}>
                            <div className="review-item-header">
                                <span className="review-item-username">{review.username}</span>
                                <Stars rating={review.rating} />
                            </div>
                            {review.comment && <p className="review-item-comment">{review.comment}</p>}
                            <span className="review-item-date">{review.create_time}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;
