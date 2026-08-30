import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Navbar';
import UserContext from './UserContext';
import './vendorListings.css';
import './listing.css';

const ListingRow = ({ listing, onUpdated, onDeactivated, onFeedback }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [title, setTitle] = useState(listing.title);
    const [description, setDescription] = useState(listing.description);
    const [price, setPrice] = useState(String(listing.price_xnv));
    const [quantity, setQuantity] = useState(String(listing.quantity_available));

    const imageUrl = `${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/image/${listing.image_name}`;
    const isListed = listing.quantity_available > 0;

    const saveChanges = async () => {
        setIsBusy(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/${listing.listing_id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    price_xnv: parseFloat(price),
                    quantity_available: parseInt(quantity, 10)
                })
            });
            const result = await response.json();
            if (!response.ok) {
                const detail = result && result.detail ? result.detail : 'The update was rejected.';
                onFeedback(String(detail), 'error');
                return;
            }
            onFeedback('Listing updated.', 'success');
            onUpdated(result);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating listing:', error);
            onFeedback('Could not reach the server. Please try again.', 'error');
        } finally {
            setIsBusy(false);
        }
    };

    const deactivate = async () => {
        setIsBusy(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/${listing.listing_id}/deactivate`, {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            if (!response.ok) {
                const detail = result && result.detail ? result.detail : 'Could not take this listing down.';
                onFeedback(String(detail), 'error');
                return;
            }
            onFeedback('Listing taken off the marketplace.', 'success');
            onDeactivated(result);
            setShowConfirm(false);
        } catch (error) {
            console.error('Error deactivating listing:', error);
            onFeedback('Could not reach the server. Please try again.', 'error');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="vendor-listing-card">
            <img src={imageUrl} alt={listing.title} />
            <div className="vendor-listing-info">
                <div className="vendor-listing-title-row">
                    <h3>{listing.title}</h3>
                    <span className={`vendor-listing-status ${isListed ? 'listed' : 'delisted'}`}>
                        {isListed ? 'Listed' : 'Delisted'}
                    </span>
                </div>
                <p className="vendor-listing-meta">
                    {listing.price_xnv} XNV &middot; {listing.quantity_available} in stock
                </p>
                {!isEditing && <p className="vendor-listing-desc">{listing.description}</p>}
                {isEditing && (
                    <div className="vendor-listing-edit-form">
                        <label>
                            Title
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                        </label>
                        <label>
                            Description
                            <textarea value={description} rows="3" onChange={e => setDescription(e.target.value)} />
                        </label>
                        <label>
                            Price (XNV)
                            <input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} />
                        </label>
                        <label>
                            Quantity available
                            <input type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                        </label>
                    </div>
                )}
            </div>
            <div className="vendor-listing-actions">
                {isEditing ? (
                    <>
                        <button className="primary" onClick={saveChanges} disabled={isBusy}>
                            {isBusy ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => {
                            setIsEditing(false);
                            setTitle(listing.title);
                            setDescription(listing.description);
                            setPrice(String(listing.price_xnv));
                            setQuantity(String(listing.quantity_available));
                        }} disabled={isBusy}>
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button className="primary" onClick={() => setIsEditing(true)}>Edit</button>
                        {isListed && (
                            <button className="danger" onClick={() => setShowConfirm(true)}>Delist</button>
                        )}
                        {!isListed && (
                            <button className="primary" onClick={() => {
                                setQuantity('1');
                                setIsEditing(true);
                            }}>
                                Relist
                            </button>
                        )}
                    </>
                )}
            </div>
            {showConfirm && (
                <>
                    <div className="overlay"></div>
                    <div className="modal vendor-listing-confirm">
                        <center>
                            <h3>Take this listing down?</h3>
                            <p>"{listing.title}" will stop showing on the marketplace. Past orders keep their history.</p>
                            <div className="vendor-listing-confirm-actions">
                                <button className="danger" onClick={deactivate} disabled={isBusy}>
                                    {isBusy ? 'Working...' : 'Yes, delist it'}
                                </button>
                                <button onClick={() => setShowConfirm(false)} disabled={isBusy}>Cancel</button>
                            </div>
                        </center>
                    </div>
                </>
            )}
        </div>
    );
};

const VendorListings = () => {
    const [listings, setListings] = useState(null);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const navigate = useNavigate();
    const { authChecked, userDetails } = useContext(UserContext);

    const fetchListings = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES + '/market/listings/mine', {
                method: 'GET',
                credentials: 'include'
            });
            if (response.status === 401 || response.status === 422) {
                navigate('/login');
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to load your listings');
            }
            const result = await response.json();
            setListings(result);
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        // wait until we know who is logged in, vendors only
        if (authChecked && (!userDetails || !userDetails.is_vendor)) {
            navigate('/listings');
            return;
        }
        if (authChecked && userDetails && userDetails.is_vendor) {
            fetchListings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authChecked, userDetails]);

    const applyUpdatedListing = (updated) => {
        setListings(current => current.map(item => item.listing_id === updated.listing_id ? updated : item));
    };

    const handleFeedback = (message, type) => {
        setFeedback({ message, type });
        window.setTimeout(() => setFeedback(null), 4000);
    };

    let content;
    if (error) {
        content = <p className="vendor-listings-error">Error: {error}</p>;
    } else if (listings === null) {
        content = (
            <div className="vendor-listings-loading" aria-hidden="true">
                {[0, 1, 2].map(index => <div key={index} className="vendor-listings-skeleton" />)}
            </div>
        );
    } else if (listings.length === 0) {
        content = (
            <div className="vendor-listings-empty">
                <h2>No listings yet</h2>
                <p>Create your first listing and it will show up here.</p>
                <button className="primary" onClick={() => navigate('/create_listing')}>Create a listing</button>
            </div>
        );
    } else {
        content = (
            <div className="vendor-listings-list">
                {listings.map(listing => (
                    <ListingRow
                        key={listing.listing_id}
                        listing={listing}
                        onUpdated={applyUpdatedListing}
                        onDeactivated={applyUpdatedListing}
                        onFeedback={handleFeedback}
                    />
                ))}
            </div>
        );
    }

    return (
        <div>
            <NavBar />
            <div className="vendor-listings-container">
                <h1>My Listings</h1>
                {feedback && (
                    <div className={`vendor-listings-feedback ${feedback.type}`}>{feedback.message}</div>
                )}
                {content}
            </div>
        </div>
    );
};

export default VendorListings;
