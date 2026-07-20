import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './login.css'

const UserActivationPage = () => {

    const [data, setData] = useState(null);
    const { token } = useParams();

    const postActivationRequest = async (token) => {
        console.log(token);
        const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/users/registration/activate/'+token, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        return response.json();
      }; 

    useEffect(() => {
        postActivationRequest(token).then(data => {
            setData(data);
        }).catch(error => {
            console.error('Error:', error);
        });
    }, [token]);
    if (data === null) return <p>Loading</p>;
    else return <p>Loaded</p>
};

export default UserActivationPage;
