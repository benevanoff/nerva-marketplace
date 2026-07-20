import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ShoppingCartButton.css';
import './Navbar.css';

const ShoppingCartButton = () => {
    const navigate = useNavigate();

    const redirectToCart = () => {
        navigate('/cart');
    };

    return (
        <svg width="61" height="49" viewBox="0 0 61 49" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={redirectToCart}>
            <path d="M56.4561 29.0621L61 11.3085H16.221L14.6649 5.4039L1.1702 0.127686L0 1.99281L12.3245 6.76036L18.549 30.5781H54.5265C54.5265 30.5781 58.0745 32.3635 56.7051 34.6176C56.0951 35.3158 55.149 36.1735 53.4559 36.1735H17.6527V38.2281H53.4684C55.9333 38.2281 58.0122 37.1909 59.1824 35.5352C61.4731 32.1041 56.4561 29.0621 56.4561 29.0621ZM20.7649 28.4936L16.7439 13.3731H57.8878L53.9912 28.4936H20.7649Z" fill="#7682E9"/>
            <path d="M25.0473 41.1306C22.321 41.1306 20.1176 42.886 20.1176 45.0603C20.1176 47.2347 22.321 48.9901 25.0473 48.9901C27.7737 48.9901 29.9771 47.2347 29.9771 45.0603C29.9771 42.886 27.7737 41.1306 25.0473 41.1306ZM25.0473 46.9255C23.7527 46.9255 22.7069 46.0976 22.7069 45.0603C22.7069 44.0231 23.7402 43.1952 25.0473 43.1952C26.3545 43.1952 27.3878 44.0231 27.3878 45.0603C27.3878 46.0976 26.342 46.9255 25.0473 46.9255Z" fill="#7682E9"/>
            <path d="M51.5264 41.1306C48.8 41.1306 46.5966 42.886 46.5966 45.0603C46.5966 47.2347 48.8 49.0001 51.5264 49.0001C54.2527 49.0001 56.5931 47.2446 56.4562 45.0703C56.4562 42.896 54.2527 41.1306 51.5264 41.1306ZM53.8668 45.0703C53.8668 46.1076 52.8335 46.9354 51.5264 46.9354C50.2192 46.9354 49.1859 46.1076 49.1859 45.0703C49.1859 44.033 50.2192 43.2052 51.5264 43.2052C52.8335 43.2052 53.9913 44.033 53.8668 45.0703Z" fill="#7682E9"/>
        </svg> 
    );
};

const NavButton = ({ onClick }) => {
    return (
        <svg width="61" height="51" viewBox="0 0 61 51" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={onClick}>
            <rect y="38.6364" width="61" height="12.3636" fill="#7682E9"/>
            <rect y="19.3182" width="61" height="12.3636" fill="#7682E9"/>
            <path d="M0 0H61V12.3636H0V0Z" fill="#7682E9"/>
        </svg> 
    );
};

const NavTab = ({ isOpen }) => {
  const navigate = useNavigate();
  return (
    <div className={`navbar ${isOpen ? 'open' : ''}`}>
      <button onClick={() => {navigate('/create_listing')}}>Create Listing</button>
      <button>Logout</button>
    </div>
  );
};

const NavBar = () => {
    const [isNavbarOpen, setIsNavbarOpen] = useState(false);
    const toggleNavbar = () => {
        setIsNavbarOpen(prevState => !prevState);
    };
    return (<>
        <div className='markethome-container'>
            <NavButton onClick={toggleNavbar} />
            <h1>Marketplace</h1>
            <ShoppingCartButton />
        </div>
        <NavTab isOpen={isNavbarOpen} />
    </>);
};

export default NavBar;