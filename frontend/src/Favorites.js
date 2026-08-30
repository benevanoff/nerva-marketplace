import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Navbar';
import ItemCard from './ItemCard';
import { useFavorites } from './FavoritesContext';
import './favorites.css';

const Favorites = () => {
    const { favorites } = useFavorites();
    const navigate = useNavigate();

    return (
        <div>
            <NavBar />
            <div className="favorites-page">
                <h1>Your Favorites</h1>
                {favorites.length === 0 ? (
                    <div className="favorites-empty">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <h2>Nothing saved yet</h2>
                        <p>Tap the heart on any listing to keep it here for later.</p>
                        <button onClick={() => navigate('/listings')}>Browse listings</button>
                    </div>
                ) : (
                    <div className="item-container">
                        {favorites.map(item => (
                            <ItemCard
                                key={item.listing_id}
                                listing_id={item.listing_id}
                                title={item.title}
                                imageName={item.image_name}
                                price_xnv={item.price_xnv}
                                qnty={item.quantity_available}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
