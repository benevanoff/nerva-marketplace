import React, { useState, useEffect, useCallback } from 'react';
import ItemCard from './ItemCard';
import NavBar from './Navbar';
import './listings.css';

const PER_PAGE = 12;

const ListingsDisplay = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async (searchTerm, sortKey, pageNum) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pageNum),
                per_page: String(PER_PAGE),
                sort_by: sortKey,
            });
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            const response = await fetch(
                `${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listings?${params}`
            );
            const data = await response.json();
            setItems(data.listings || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
        } catch (error) {
            console.error('Error fetching items:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refetch when sort or page changes.
    useEffect(() => {
        fetchItems(search, sortBy, page);
    }, [search, sortBy, page, fetchItems]);

    // Debounce search so we don't hit the backend on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchItems(search, sortBy, 1);
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
        setPage(1);
    };

    const goToPage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div>
            <NavBar />
            <div className="listings-toolbar">
                <div className="search-box">
                    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search listings..."
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <select value={sortBy} onChange={handleSortChange} className="sort-select">
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                </select>
            </div>
            <div className="item-container">
                {loading ? (
                    <p className="empty-message">Loading listings...</p>
                ) : items.length === 0 ? (
                    <p className="empty-message">
                        {search ? `No listings found for "${search}"` : 'No listings available yet.'}
                    </p>
                ) : (
                    items.map(item => (
                        <ItemCard
                            key={item.listing_id}
                            listing_id={item.listing_id}
                            title={item.title}
                            imageName={item.image_name}
                            price_xnv={item.price_xnv}
                            qnty={item.quantity_available}
                            vendor={item.vendor}
                        />
                    ))
                )}
            </div>
            {!loading && totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="page-info">
                        Page {page} of {totalPages} ({total} listings)
                    </span>
                    <button
                        className="page-btn"
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ListingsDisplay;
