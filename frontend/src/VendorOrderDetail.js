import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './vendorOrderDetail.css';

const VendorOrderDetail = () => {
    const { order_id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getOrderDetail = async () => {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_MARKET_MICROSERVICES}/vendor/orders/${order_id}`,
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                );

                if (response.status === 401 || response.status === 422) {
                    navigate('/login');
                    return;
                }

                if (response.status === 404) {
                    setError('Order not found');
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch order details');
                }

                const result = await response.json();
                setOrder(result);
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        getOrderDetail();
    }, [order_id, navigate]);

    const handleShippingStatusUpdate = async () => {
        setUpdateLoading(true);
        setUpdateError(null);
        
        try {
            const response = await fetch(
                `${process.env.REACT_APP_MARKET_MICROSERVICES}/vendor/orders/${order_id}/shipping/status`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'shipped' })
                }
            );

            if (response.status === 401 || response.status === 422) {
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to update shipping status');
            }

            const result = await response.json();
            setOrder(prev => ({
                ...prev,
                shipping: {
                    ...prev.shipping,
                    status: result.shipping_status
                }
            }));
        } catch (error) {
            console.error('Error:', error);
            setUpdateError(error.message);
        } finally {
            setUpdateLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="order-detail-container">
                <p>Loading order details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="order-detail-container">
                <p className="error">Error: {error}</p>
                <button onClick={() => navigate('/vendor/orders')}>Back to Orders</button>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="order-detail-container">
                <p>No order found</p>
                <button onClick={() => navigate('/vendor/orders')}>Back to Orders</button>
            </div>
        );
    }

    return (
        <div className="order-detail-container">
            <button className="back-button" onClick={() => navigate('/vendor/orders')}>
                ← Back to Orders
            </button>

            <div className="order-detail-header">
                <h1>Order Details</h1>
                <span className="order-id">Order ID: {order.order_id}</span>
            </div>

            <div className="order-detail-grid">
                {/* Order Summary */}
                <section className="order-summary">
                    <h2>Order Summary</h2>
                    <div className="summary-item">
                        <span className="label">Order Date:</span>
                        <span className="value">{order.create_time}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Amount:</span>
                        <span className="value">{order.amount} XNV</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Status:</span>
                        <span className={`status status-${order.status.toLowerCase()}`}>
                            {order.status}
                        </span>
                    </div>
                </section>

                {/* Customer Information */}
                <section className="customer-info">
                    <h2>Customer Information</h2>
                    <div className="info-item">
                        <span className="label">Username:</span>
                        <span className="value">{order.customer_username}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Email:</span>
                        <span className="value">{order.customer_email || 'N/A'}</span>
                    </div>
                </section>
            </div>

            {/* Order Items */}
            <section className="order-items">
                <h2>Items in Order</h2>
                {order.items && order.items.length > 0 ? (
                    <div className="items-list">
                        {order.items.map((item, index) => (
                            <div key={index} className="item-card">
                                <img 
                                    src={`${process.env.REACT_APP_MARKET_MICROSERVICES}/market/listing/image/${item.image_name}`}
                                    alt={item.title}
                                    className="item-image"
                                />
                                <div className="item-details">
                                    <h3>{item.title}</h3>
                                    <p className="item-price">{item.price_xnv} XNV</p>
                                    <p className="item-quantity">Quantity: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No items found in this order</p>
                )}
            </section>

            {/* Shipping Information */}
            <section className="shipping-info">
                <h2>Shipping Details</h2>
                {order.shipping ? (
                    <div className="shipping-details">
                        <div className="shipping-item">
                            <span className="label">Status:</span>
                            <span className={`shipping-status status-${order.shipping.status?.toLowerCase() || 'pending'}`}>
                                {order.shipping.status || 'Pending'}
                            </span>
                        </div>
                        {order.shipping.status === 'pending' && (
                            <div className="shipping-action">
                                {updateError && <p className="error">{updateError}</p>}
                                <button 
                                    className="update-status-button"
                                    onClick={handleShippingStatusUpdate}
                                    disabled={updateLoading}
                                >
                                    {updateLoading ? 'Updating...' : 'Mark as Shipped'}
                                </button>
                            </div>
                        )}
                        <div className="shipping-item">
                            <span className="label">Shipping Note:</span>
                            <p className="shipping-note">{order.shipping.note || 'No shipping note provided'}</p>
                        </div>
                        <div className="shipping-item">
                            <span className="label">Shipping Option:</span>
                            <span className="value">
                                {order.shipping.option_name || 'No shipping option selected'}
                                {order.shipping.option_name && order.shipping.option_price_xnv !== null && order.shipping.option_price_xnv !== undefined
                                    ? ` — ${order.shipping.option_price_xnv} XNV`
                                    : ''}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p>No shipping information available</p>
                )}
            </section>
        </div>
    );
};

export default VendorOrderDetail;
