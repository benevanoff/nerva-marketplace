import React from 'react';
import './listings.css';
import './favorites.css';
import { useNavigate } from 'react-router-dom';
import NervaBadge from './nerva_badge';
import { useFavorites } from './FavoritesContext';

const HeartIcon = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);

const ItemCard = ({ listing_id, title, imageName, price_xnv, qnty }) => {
    const imageUrl = `${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/image/${imageName}`;
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();
    const favorited = isFavorite(listing_id);

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        toggleFavorite({ listing_id, title, image_name: imageName, price_xnv, quantity_available: qnty });
    };

    return (
        <div className="item-card" onClick={() => {navigate('/listing/'+listing_id)}}>
            <img src={imageUrl} alt={title} />
            <button
                className={`favorite-button ${favorited ? 'active' : ''}`}
                onClick={handleFavoriteClick}
                aria-pressed={favorited}
                aria-label={favorited ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
            >
                <HeartIcon filled={favorited} />
            </button>
            <h3>{title}</h3>
            <div className="prices-container">
                <NervaBadge price_xnv={price_xnv}/>
            </div>
            <div>
                <p>Qty: {qnty}</p>
            </div>
        </div>
    );
};

export default ItemCard;
