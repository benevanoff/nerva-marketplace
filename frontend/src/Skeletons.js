import React from 'react';
import './Skeleton.css';

/* Shared skeleton placeholders. Each one mirrors the layout of the page it
   stands in for, so nothing jumps around once the real content arrives. */

export const ListingSkeleton = () => (
    <div className="listing-container" aria-hidden="true">
        <div className="skeleton listing-skeleton-title" />
        <div className="skeleton listing-skeleton-image" />
        <div className="listing-skeleton-bar">
            <div className="skeleton listing-skeleton-price" />
            <div className="skeleton listing-skeleton-button" />
        </div>
        <div className="skeleton listing-skeleton-line" />
        <div className="skeleton listing-skeleton-line short" />
        <div className="skeleton listing-skeleton-line" />
    </div>
);

export const CartSkeleton = () => (
    <div className="cart-container" aria-hidden="true">
        {[0, 1, 2].map(index => (
            <div className="cart-grid" key={index}>
                <div className="skeleton cart-skeleton-thumb" />
                <div>
                    <div className="skeleton cart-skeleton-title" />
                    <div className="skeleton cart-skeleton-price" />
                </div>
                <div className="skeleton cart-skeleton-actions" />
            </div>
        ))}
    </div>
);

export const OrderListSkeleton = () => (
    <div className="vendor-orders-container" aria-hidden="true">
        <h1 className="skeleton orders-skeleton-heading" />
        <div className="orders-list">
            {[0, 1, 2, 3].map(index => (
                <div className="order-item orders-skeleton-row" key={index}>
                    <div className="skeleton orders-skeleton-line" />
                    <div className="skeleton orders-skeleton-line short" />
                </div>
            ))}
        </div>
    </div>
);

export default ListingSkeleton;
