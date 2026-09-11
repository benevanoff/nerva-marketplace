import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Navbar';
import './notfound.css';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div>
            <NavBar />
            <div className="notfound-container">
                <div className="notfound-code" aria-hidden="true">
                    <span>4</span>
                    <span className="notfound-coin">0</span>
                    <span>4</span>
                </div>
                <h1>Page not found</h1>
                <p>The page you are looking for does not exist or may have been removed.</p>
                <div className="notfound-actions">
                    <button className="notfound-primary" onClick={() => navigate('/')}>
                        Back to the marketplace
                    </button>
                    <button className="notfound-secondary" onClick={() => navigate(-1)}>
                        Go back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
