import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './cart.css'

const CartItem = ( {listing_id} ) => {

    const [itemDetails, setItem] = useState({"title": null, "price": 0, "image_name": ""});

    useEffect(() => {
        const getListingDetailsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/'+listing_id, {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                console.log(result);
                setItem(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        getListingDetailsRequest();
    }, [listing_id]);
    return <div>
        <div className="cart-grid">
            <img src={process.env.REACT_APP_MARKET_MICROSERVICES+"/market/listing/image/"+itemDetails.image_name} alt={"asd"} />
            <div>
                <h2>{itemDetails.title}</h2>
                <p>Price: {itemDetails.price_xnv} XNV</p>
            </div>
            <button>Remove</button>
        </div>
    </div>;
};

const Cart = () => {
    const [cartDetails, setCartDetails] = useState(null);
    const [shippingDetails, setShippingDetails] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const getCartDetailsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/details', {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                console.log(result);
                setCartDetails(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };
        getCartDetailsRequest();
    }, []);

    const postShippingDetailsRequest = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES + '/cart/shipping_details/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ details: shippingDetails })
            });
            if (!response.ok) {
                throw new Error('Failed to add shipping details');
            }
            return true;
        } catch (error) {
            console.error('Error adding shipping details:', error);
            return false;
        }
    };

    const postCheckoutRequest = async () => {
        setIsCheckingOut(true);
        try {
            // First add shipping details
            const shippingSuccess = await postShippingDetailsRequest();
            if (!shippingSuccess) {
                alert('Failed to save shipping details');
                setIsCheckingOut(false);
                return;
            }

            // Then proceed with checkout
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/checkout', {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            console.log(result);
            navigate("/invoice/"+result.invoice_id);
        } catch (error) {
            console.error('Error:', error);
            alert('Checkout failed. Please try again.');
            setIsCheckingOut(false);
        }
    };

    if (cartDetails && cartDetails.items !== undefined) {
        return <div className="cart-container">
            {cartDetails.items.map((id, index) => (
                    <CartItem key={`${id}-${index}`} listing_id={id} />
                ))}
            <div className="shipping-details-section">
                <h3>Shipping Details</h3>
                <textarea
                    value={shippingDetails}
                    onChange={(e) => setShippingDetails(e.target.value)}
                    placeholder="Enter your shipping address and any special instructions..."
                    rows="5"
                    cols="40"
                />
            </div>
            <button onClick={postCheckoutRequest} disabled={!shippingDetails.trim() || isCheckingOut}>
                {isCheckingOut ? 'Processing...' : 'Checkout'}
            </button>
        </div>;
    } else {
        return <div className="cart-container">
            <h3>Cart is empty!</h3>
        </div>;
    }
};

export default Cart;