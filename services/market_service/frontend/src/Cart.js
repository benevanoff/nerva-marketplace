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

    const postCheckoutRequest = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/checkout', {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            console.log(result);
            navigate("/invoice/"+result.invoice_id);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    if (cartDetails && cartDetails.items !== undefined) {
        return <div className="cart-container">
            {cartDetails.items.map((id, index) => (
                    <CartItem key={`${id}-${index}`} listing_id={id} />
                ))}
            <button onClick={postCheckoutRequest}>Checkout</button>
        </div>;
    } else {
        return <div className="cart-container">
            <h3>Cart is empty!</h3>
        </div>;
    }
};

export default Cart;