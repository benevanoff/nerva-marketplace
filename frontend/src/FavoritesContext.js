import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'nerva-marketplace-favorites';

const FavoritesContext = createContext({
    favorites: [],
    isFavorite: () => false,
    toggleFavorite: () => {},
    removeFavorite: () => {},
});

const loadFavorites = () => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        // corrupted or unavailable storage, start clean
        return [];
    }
};

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(loadFavorites);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        } catch (error) {
            // storage full or unavailable, favorites just won't persist
        }
    }, [favorites]);

    const isFavorite = useCallback(
        (listing_id) => favorites.some(item => item.listing_id === listing_id),
        [favorites]
    );

    // stores the listing info needed to render it again later without a refetch
    const toggleFavorite = useCallback((listing) => {
        setFavorites(current => {
            const alreadySaved = current.some(item => item.listing_id === listing.listing_id);
            if (alreadySaved) {
                return current.filter(item => item.listing_id !== listing.listing_id);
            }
            return [listing, ...current];
        });
    }, []);

    const removeFavorite = useCallback((listing_id) => {
        setFavorites(current => current.filter(item => item.listing_id !== listing_id));
    }, []);

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);

export default FavoritesContext;
