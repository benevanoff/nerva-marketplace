import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './login.css'

const LoginCard = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const postLoginRequest = async (username, password) => {
        const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/users/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({"username": username, "password": password})
        });
        return response.status;
      };      

    const handleSubmit = (e) => {
        e.preventDefault();
        postLoginRequest(username, password).then(status => {
            if (status === 200) {
              navigate("/listings");
            } else {
              console.log('Login failed with status:', status);
            }
          });
          
    };

    return (
        <div className="login-card">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

function Login() {
    return <LoginCard/>;
  }

export default Login;
