import { useParams, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import NavBar from './Navbar';
import './listing.css'
import NervaBadge from './nerva_badge';
import UserContext from './UserContext';
import ReviewsSection from './ReviewsSection';

const Listing = () => {
    const { listing_id } = useParams();
    const [listing_details, setDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [showModal, setModalState] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { userDetails, authChecked } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();

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
        if (!authChecked) {
            return;
        }

        // If the user is not logged in, show login prompt modal (preserve return location)
        if (!userDetails) {
            setShowLoginModal(true);
            return;
        }

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
                        <button onClick={postAddToCartRequest} disabled={!authChecked}>
                            {authChecked ? 'Add to cart' : 'Checking login...'}
                        </button>
                    </div>
                    <div className='detail-choices-bar'>
                        <h3
                            className={activeTab === 'details' ? 'detail-choices-option-selected' : 'detail-choices-option'}
                            onClick={() => setActiveTab('details')}
                        >
                            Product Details
                        </h3>
                        <h3 className='detail-choices-option'>About the Vendor</h3>
                        <h3
                            className={activeTab === 'reviews' ? 'detail-choices-option-selected' : 'detail-choices-option'}
                            onClick={() => setActiveTab('reviews')}
                        >
                            Reviews
                        </h3>

                    </div>
                    {activeTab === 'reviews'
                        ? <ReviewsSection listing_id={listing_id} />
                        : <p>{listing_details.description}</p>
                    }
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
            {(showModal || showLoginModal) && <div className='overlay'></div>}

            {showModal && 
                <div className='modal'>
                    <center>
                        <h3>Item Added to Cart</h3>
                        <button onClick={() => {setModalState(false)}}>Continue</button>
                    </center>
                </div>}

            {showLoginModal &&
                <div className='modal'>
                    <center>
                        <h3>Please log in to add items to your cart</h3>
                        <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                            <button onClick={() => { navigate('/login', { state: { from: location.pathname } }); }}>Login</button>
                            <button onClick={() => { setShowLoginModal(false); }}>Cancel</button>
                        </div>
                    </center>
                </div>}
        </>
    );
}

export default Listing;