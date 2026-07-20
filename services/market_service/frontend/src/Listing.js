import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import NavBar from './Navbar';
import './listing.css'
import NervaBadge from './nerva_badge';

const Listing = () => {
    const { listing_id } = useParams();
    const [listing_details, setDetails] = useState(null);
    const [showModal, setModalState] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/'+listing_id);
                const data = await response.json();
                setDetails(data);
                console.log(data);
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        };
        fetchDetails();
    }, [listing_id]);

    const postAddToCartRequest = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/add_item/'+listing_id, {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            console.log(result);
            setModalState(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const content = () => {
        if (listing_details !== null) {
            return (<>
                <center><h1>{listing_details.title}</h1></center>
                <div className='listing-container'>
                    <center>
                    <img src={`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/image/${listing_details.image_name}`} alt="listing title" />
                    </center>
                    <div className='payment-bar'>
                        <NervaBadge price_xnv={listing_details.price_xnv} />
                        <button onClick={postAddToCartRequest}>Add to cart</button>
                    </div>
                    <div className='detail-choices-bar'>
                        <h3 className='detail-choices-option-selected'>Product Details</h3>
                        <h3 className='detail-choices-option'>About the Vendor</h3>
                        <h3 className='detail-choices-option'>Reviews</h3>
                    </div>
                    <p>{listing_details.description}</p>
                </div>
            </>);
        } else {
            return (
                <>
                    <p>Loading...</p>
                </>
            );
        }
    };

    return (
        <>
            <NavBar />
            {content()}
            {showModal && <div className='overlay'></div>}
            {showModal && 
                <div className='modal'>
                    <center>
                        <h3>Item Added to Cart</h3>
                        <button onClick={() => {setModalState(false)}}>Continue</button>
                    </center>
                </div>}
        </>
    );
}

export default Listing;