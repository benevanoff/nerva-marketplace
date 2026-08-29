import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './vendorOrderDetail.css';

const CustomerOrderDetail = () => {
    const { order_id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getOrderDetail = async () => {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_MARKET_MICROSERVICES}/customer/orders/${order_id}`,
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
                <button onClick={() => navigate('/customer/orders')}>Back to Orders</button>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="order-detail-container">
                <p>No order found</p>
                <button onClick={() => navigate('/customer/orders')}>Back to Orders</button>
            </div>
        );
    }

    return (
        <div className="order-detail-container">
            <button className="back-button" onClick={() => navigate('/customer/orders')}>
                ← Back to Orders
            </button>

            <div className="order-detail-header">
                <h1>Order Details</h1>
                <span className="order-id">Order ID: {order.order_id}</span>
            </div>

            <div className="order-detail-grid">
                <section className="order-summary">
                    <h2>Order Summary</h2>
                    <div className="summary-item">
                        <span className="label">Order Date:</span>
                        <span className="value">{order.create_time}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Amount:</span>
                        <span className="value">{order.amount || 'N/A'} XNV</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Invoice Status:</span>
                        <span className={`status status-${String(order.invoice_status || '').toLowerCase()}`}>
                            {order.invoice_status || 'N/A'}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Shipping Status:</span>
                        <span className={`status status-${String(order.shipping_status || '').toLowerCase()}`}>
                            {order.shipping_status || 'N/A'}
                        </span>
                    </div>
                </section>

                <section className="customer-info">
                    <h2>Recipient</h2>
                    <div className="info-item">
                        <span className="label">Name:</span>
                        <span className="value">{order.recipient_name || order.customer_username || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Email:</span>
                        <span className="value">{order.customer_email || 'N/A'}</span>
                    </div>
                </section>
            </div>

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
                                    <p className="item-price">{item.price_xnv || item.price} XNV</p>
                                    <p className="item-quantity">Quantity: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No items found in this order</p>
                )}
            </section>

            <section className="shipping-info">
                <h2>Shipping Details</h2>
                {order.shipping ? (
                    <div className="shipping-details">
                        <div className="shipping-item">
                            <span className="label">Status:</span>
                            <span className={`shipping-status status-${order.shipping.status?.toLowerCase() || 'pending'}`}>
                                {order.shipping.status || order.shipping_status || 'Pending'}
                            </span>
                        </div>
                        <div className="shipping-item">
                            <span className="label">Shipping Note:</span>
                            <p className="shipping-note">{order.shipping.note || 'No shipping note provided'}</p>
                        </div>
                    </div>
                ) : (
                    <p>No shipping information available</p>
                )}
            </section>
        </div>
    );
};

export default CustomerOrderDetail;
