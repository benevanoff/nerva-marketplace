import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  //Link
} from "react-router-dom";
import Login from "./Login.js";
import Registration from "./Registration.js";
import UserActivationPage from "./UserActivaton.js";
import ListingCreateForm from "./ListingCreateForm.js";
import ListingsDisplay from "./ListingsDisplay.js";
import Cart from './Cart.js'
import Invoice from "./Invoice.js";
import Listing from "./Listing.js"
import VendorOrders from "./VendorOrders.js"
import VendorOrderDetail from "./VendorOrderDetail.js"
import CustomerOrders from "./CustomerOrders.js"
import CustomerOrderDetail from "./CustomerOrderDetail.js"
import UserProfile from "./UserProfile.js"
import Favorites from "./Favorites.js"
import { UserProvider } from './UserContext.js';
import { FavoritesProvider } from './FavoritesContext.js';

const Home = () => {
  return <ListingsDisplay/>
}

function App() {
  return (
    <UserProvider>
      <FavoritesProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/register" element={<Registration />} />
              <Route path="activate/:token" element={<UserActivationPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/create_listing" element={<ListingCreateForm/>} />
              <Route path="/listings" element={<ListingsDisplay/>} />
              <Route path="/listing/:listing_id" element={<Listing/>} />
              <Route path="/user/:user_id" element={<UserProfile/>} />
              <Route path="/cart" element={<Cart/>} />
              <Route path="/favorites" element={<Favorites/>} />
              <Route path="/invoice/:invoice_id" element={<Invoice/>} />
              <Route path="/vendor/orders" element={<VendorOrders/>} />
              <Route path="/vendor/orders/:order_id" element={<VendorOrderDetail/>} />
              <Route path="/customer/orders/:order_id" element={<CustomerOrderDetail/>} />
              <Route path="/customer/orders" element={<CustomerOrders/>} />
              <Route path="/" element={<Home />} />
            </Routes>
          </div>

          <footer style={{
            textAlign: 'center',
            padding: '1rem',
            borderTop: '1px solid #e5e7eb',
            color: '#4b5563',
            fontSize: '0.95rem'
          }}>
            <a
              href="/privacy_policy.txt"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563eb', textDecoration: 'underline' }}
            >
              Privacy Policy
            </a>
          </footer>
        </div>
      </Router>
      </FavoritesProvider>
    </UserProvider>
  );
}

export default App;
