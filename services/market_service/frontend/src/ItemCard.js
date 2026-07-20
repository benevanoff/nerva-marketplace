import React from 'react';
import './listings.css';
import { useNavigate } from 'react-router-dom';
import NervaBadge from './nerva_badge';

const ItemCard = ({ listing_id, title, imageName, price_xnv }) => {
    const imageUrl = `${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/image/${imageName}`;
    const navigate = useNavigate();

    return (
        <div className="item-card" onClick={() => {navigate('/listing/'+listing_id)}}>
            <img src={imageUrl} alt={title} />
            <h3>{title}</h3>
            <div className="prices-container">
                <NervaBadge price_xnv={price_xnv}/>
            </div>
        </div>
    );
};

export default ItemCard;
