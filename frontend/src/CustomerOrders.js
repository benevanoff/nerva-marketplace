import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './vendorOrders.css';

const CustomerOrders = () => {
    const [orders, setOrders] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getCustomerOrders = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES + '/customer/orders', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.status === 401 || response.status === 422) {
                    navigate('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch order history');
                }

                const result = await response.json();
                setOrders(result);
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        getCustomerOrders();
    }, [navigate]);

    if (loading) {
        return <div className="vendor-orders-container"><p>Loading order history...</p></div>;
    }

    if (error) {
        return <div className="vendor-orders-container"><p className="error">Error: {error}</p></div>;
    }

    if (!orders || orders.length === 0) {
        return <div className="vendor-orders-container"><p>No orders found.</p></div>;
    }

    return (
        <div className="vendor-orders-container">
            <h1>Your Orders</h1>
            <div className="orders-list">
                {orders.map((order, index) => {
                    const statusClass = `status-${String(order.invoice_status || '').toLowerCase().replace(/\s+/g, '-')}`;
                    const shippingStatusClass = `status-${String(order.shipping_status || '').toLowerCase().replace(/\s+/g, '-')}`;

                    return (
                        <button
                            key={`${order.order_id}-${index}`}
                            className="order-item order-link"
                            type="button"
                            onClick={() => navigate(`/customer/orders/${order.order_id}`)}
                        >
                            <span className="order-id">Order ID: {order.order_id}</span>
                            <span className="order-date">Date: {order.create_time}</span>
                            <span className={`order-status ${statusClass}`}>
                                Invoice Status: {order.invoice_status}
                            </span>
                            <span className={`order-status ${shippingStatusClass}`}>
                                Shipping Status: {order.shipping_status}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomerOrders;
