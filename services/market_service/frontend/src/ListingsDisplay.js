import React, { useState, useEffect } from 'react';
import ItemCard from './ItemCard';
import NavBar from './Navbar';


const ListingsDisplay = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listings');
                const data = await response.json();
                setItems(data);
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        };

        fetchItems();
    }, []);

    return (
        <div>
            <NavBar />
            <div className="item-container">
                {items.map(item => (
                    <ItemCard
                        key={item.listing_id}
                        listing_id={item.listing_id}
                        title={item.title}
                        imageName={item.image_name}
                        price_xnv={item.price_xnv}
                    />
                ))}
            </div>
        </div>
    );
};

export default ListingsDisplay;
