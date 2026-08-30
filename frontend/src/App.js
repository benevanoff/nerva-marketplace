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
import { UserProvider } from './UserContext.js';
import './App.css';

const Home = () => {
  return <ListingsDisplay/>
}

function App() {
  return (
    <UserProvider>
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
              <Route path="/invoice/:invoice_id" element={<Invoice/>} />
              <Route path="/vendor/orders" element={<VendorOrders/>} />
              <Route path="/vendor/orders/:order_id" element={<VendorOrderDetail/>} />
              <Route path="/customer/orders/:order_id" element={<CustomerOrderDetail/>} />
              <Route path="/customer/orders" element={<CustomerOrders/>} />
              <Route path="/" element={<Home />} />
            </Routes>
          </div>

          <footer className="app-footer">
            <a href="/privacy_policy.txt" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </footer>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;
