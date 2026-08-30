import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './cart.css'
import { CartSkeleton } from './Skeletons';

const CartItem = ({ listing_id, onRemove, onShippingOptionChange }) => {

    const [itemDetails, setItem] = useState({"title": null, "price": 0, "image_name": ""});
    const [removing, setRemoving] = useState(false);
    const [shippingOptions, setShippingOptions] = useState([]);
    const [selectedShippingOption, setSelectedShippingOption] = useState('');

    useEffect(() => {
        const getListingDetailsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/'+listing_id, {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                setItem(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        const getShippingOptionsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/'+listing_id+'/shipping_options', {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                // Backend returns an array of objects directly
                if (Array.isArray(result) && result.length > 0) {
                    setShippingOptions(result);
                    const firstOption = result[0];
                    setSelectedShippingOption(firstOption.id);
                    if (onShippingOptionChange) {
                        onShippingOptionChange(listing_id, firstOption);
                    }
                }
            } catch (error) {
                console.error('Error fetching shipping options:', error);
            }
        };

        getListingDetailsRequest();
        getShippingOptionsRequest();
    }, [listing_id]);

    const handleRemove = async () => {
        setRemoving(true);
        try {
            await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/remove_item/'+listing_id, {
                method: 'POST',
                credentials: 'include'
            });
            if (onRemove) onRemove(listing_id);
        } catch (error) {
            console.error('Error removing item:', error);
            setRemoving(false);
        }
    };

    return <div>
        <div className="cart-grid">
            <img src={process.env.REACT_APP_MARKET_MICROSERVICES+"/market/listing/image/"+itemDetails.image_name} alt={itemDetails.title || "item"} />
            <div>
                <h2>{itemDetails.title}</h2>
                <p>Price: {itemDetails.price_xnv} XNV</p>
            </div>
            <div className="cart-item-actions">
                <select 
                    value={selectedShippingOption}
                    onChange={(e) => {
                        const optionId = parseInt(e.target.value);
                        setSelectedShippingOption(optionId);
                        const selectedOption = shippingOptions.find(opt => opt.id === optionId);
                        if (selectedOption && onShippingOptionChange) {
                            onShippingOptionChange(listing_id, selectedOption);
                        }
                    }}
                    className="shipping-dropdown"
                >
                    <option value="" disabled>Select shipping option</option>
                    {shippingOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name} - {option.price_xnv} XNV</option>
                    ))}
                </select>
                <button onClick={handleRemove} disabled={removing}>
                    {removing ? 'Removing...' : 'Remove'}
                </button>
            </div>
        </div>
    </div>;
};

const Cart = () => {
    const [cartDetails, setCartDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shippingDetails, setShippingDetails] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [shippingSelections, setShippingSelections] = useState({});
    const navigate = useNavigate();

    const fetchCart = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/details', {
                method: 'GET',
                credentials: 'include'
            });
            const result = await response.json();
            setCartDetails(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const handleRemoveItem = () => {
        fetchCart();
    };

    const handleShippingOptionChange = (listing_id, option) => {
        setShippingSelections(prev => ({
            ...prev,
            [listing_id]: option.id
        }));
    };

    const postShippingDetailsRequest = async () => {
        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES + '/cart/shipping_details/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    details: shippingDetails,
                    shipping_options: shippingSelections
                })
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
            const shippingSuccess = await postShippingDetailsRequest();
            if (!shippingSuccess) {
                alert('Failed to save shipping details');
                setIsCheckingOut(false);
                return;
            }

            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/cart/checkout', {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            navigate("/invoice/"+result.invoice_id);
        } catch (error) {
            console.error('Error:', error);
            alert('Checkout failed. Please try again.');
            setIsCheckingOut(false);
        }
    };

    if (isLoading) {
        return <CartSkeleton />;
    }

    if (cartDetails && cartDetails.items !== undefined && cartDetails.items.length > 0) {
        return <div className="cart-container">
            {cartDetails.items.map((id, index) => (
                    <CartItem key={`${id}-${index}`} listing_id={id} onRemove={handleRemoveItem} onShippingOptionChange={handleShippingOptionChange} />
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
