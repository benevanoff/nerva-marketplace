import React, { useState } from 'react';
import './login.css'

const RegistrationForm = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password_confirm, setPasswordConfirm] = useState('');
     
    const postRegistrationRequest = async (username, password, email) => {
        console.log(username);
        const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/users/registration/submit', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({"username": username, "email": email, "password": password})
        });
        return response.json();
      };      

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== password_confirm) {
            return;
        }
        postRegistrationRequest(username, password, email).then(data => {
            console.log(data);
        }).catch(error => {
            console.error('Error:', error);
        });
    };

    return (
        <div className="login-card">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Email Address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    required
                    value={password_confirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <button type="submit">Submit Registration</button>
            </form>
        </div>
    );
};

function Registration() {
    return <RegistrationForm/>;
  }

export default Registration;
