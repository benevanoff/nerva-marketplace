import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './vendorOrders.css';

const VendorOrders = () => {
    const [orders, setOrders] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getVendorOrders = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES + '/vendor/orders', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.status === 401 || response.status === 422) {
                    navigate('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }

                const result = await response.json();
                console.log(result);
                setOrders(result);
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        getVendorOrders();
    }, [navigate]);

    if (loading) {
        return <div className="vendor-orders-container"><p>Loading orders...</p></div>;
    }

    if (error) {
        return <div className="vendor-orders-container"><p className="error">Error: {error}</p></div>;
    }

    if (!orders || orders.length === 0) {
        return <div className="vendor-orders-container"><p>No orders found.</p></div>;
    }

    return (
        <div className="vendor-orders-container">
            <h1>Vendor Orders</h1>
            <div className="orders-list">
                {orders.map((order, index) => (
                    <span key={`${order.order_id}-${index}`} className="order-item">
                        <span className="order-id">Order ID: {order.order_id}</span>
                        <span className="order-date">Date: {order.create_time}</span>
                        <span className="order-amount">Amount: {order.amount} XNV</span>
                        <span className={`order-status status-${order.status.toLowerCase()}`}>
                            Status: {order.status}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default VendorOrders;
