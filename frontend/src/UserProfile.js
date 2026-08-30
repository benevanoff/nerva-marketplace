import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './user_profile.css';

const UserProfile = () => {
    const { user_id } = useParams();
    const [user, setUser] = useState(null);
    const [purchasesCount, setPurchasesCount] = useState(null);
    const [salesCount, setSalesCount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch user profile
                const userResponse = await fetch(
                    `${process.env.REACT_APP_MARKET_MICROSERVICES}/users/${user_id}`,
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                );

                if (userResponse.status === 404) {
                    setError('User not found');
                    setLoading(false);
                    return;
                }

                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user profile');
                }

                const userData = await userResponse.json();
                setUser(userData);

                // Fetch purchases count
                const purchasesResponse = await fetch(
                    `${process.env.REACT_APP_MARKET_MICROSERVICES}/users/${user_id}/purchases/count`,
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                );

                if (purchasesResponse.ok) {
                    const purchasesData = await purchasesResponse.json();
                    setPurchasesCount(purchasesData.count);
                }

                // Fetch sales count (if user is a vendor)
                if (userData.is_vendor) {
                    const salesResponse = await fetch(
                        `${process.env.REACT_APP_MARKET_MICROSERVICES}/users/${user_id}/sales/count`,
                        {
                            method: 'GET',
                            credentials: 'include'
                        }
                    );

                    if (salesResponse.ok) {
                        const salesData = await salesResponse.json();
                        setSalesCount(salesData.count);
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user_id]);

    if (loading) {
        return (
            <div className="user-profile-container">
                <p>Loading user profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-container">
                <p className="error">Error: {error}</p>
                <button onClick={() => navigate('/')}>Back to Home</button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-profile-container">
                <p>User not found</p>
                <button onClick={() => navigate('/')}>Back to Home</button>
            </div>
        );
    }

    return (
        <div className="user-profile-container">
            <button className="back-button" onClick={() => navigate('/')}>
                ← Back to Home
            </button>

            <div className="user-profile-header">
                <h1>{user.username}</h1>
                {!!user.is_vendor && <p className="user-type">Vendor</p>}
            </div>

            <div className={`user-profile-stats ${!user.is_vendor ? 'centered' : ''}`}>
                <div className="stat-card">
                    <h3>Completed Purchases</h3>
                    <div className="stat-value">
                        {purchasesCount !== null ? purchasesCount : 'Loading...'}
                    </div>
                </div>

                {!!user.is_vendor && (
                    <div className="stat-card">
                        <h3>Completed Sales</h3>
                        <div className="stat-value">
                            {salesCount !== null ? salesCount : 'Loading...'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
