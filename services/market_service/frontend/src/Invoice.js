import './invoice.css'
import NervaLogo from './nerva-coin-logo.png'; 
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const StatusBar = ({ progress }) => {
    return (
        <div className="status-bar">
            <div className="status-line"></div>
            <div className="status-line-filled" style={{ width: `${progress * 50.0}%` }}></div>
            {[1, 2].map((dot, index) => (
                <div
                    key={index}
                    className={`status-dot ${progress >= dot ? 'filled' : ''}`}
                ></div>
            ))}
        </div>
    );
};

const PaymentDetailsCard = ({address, amount}) => {
    return <div className='payment-details-card-grid'>
        <div>
            <span>Amount: {amount} XNV</span>
        </div>
        <textarea id="readonly-textarea" readOnly defaultValue={address}></textarea>
        <img src={NervaLogo} alt="idk"/>
    </div>;
};

const TransactionsContainer = ({transactions}) => {
    return transactions.map((tx) => {
        return <div key={tx.txId} id='TransactionsContainer'>
            <p>Tx ID: {tx.txId}</p>
            <p>Amount: {tx.amount} Status: {tx.confirmations > 0  ? 'Confirmed' : 'Pending'}</p>
        </div>
    });
};

const Invoice = () => {
    const { invoice_id } = useParams();
    const [invoiceDetails, setDetails] = useState({"address": "", "amount": 0});
    const [paymentProgress, setProgess] = useState(1);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const getInvoiceDetailsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_PAYMENTS_MICROSERVICES+'/invoice/'+invoice_id, {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                console.log(result);
                setDetails(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        getInvoiceDetailsRequest();
    }, [invoice_id]);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8765/'+invoice_id);
        socket.addEventListener('open', (event) => {
            console.log('Connected to WS Server');
        });
        // Listen for messages
        socket.addEventListener('message', (event) => {
            console.log(event);
            let txId = event.data.split(",")[0];
            let amount = event.data.split(",")[1];
            let confirmations = event.data.split(",")[2];
            console.log('confirmations: ' + confirmations);
            if (confirmations == 0)
                setTransactions(transactions => [...transactions, {'txId': txId, 'amount': amount, 'confirmations': confirmations}]);
            else {
                setTransactions(prev =>
                    prev.map(tx =>
                        tx.txId === txId
                            ? { ...tx, confirmations }
                            : tx
                    )
                );
            }        
            setProgess(progress => progress + 1);
        });
        // Handle any errors that occur
        socket.addEventListener('error', (event) => { console.error('WebSocket error:', event); });
        socket.addEventListener('close', (event) => { console.log('Disconnected from WS Server'); });

        return () => { // Clean up function
            socket.close();
        };
    }, [invoice_id]);

    return <div className='invoice-container'>
        <StatusBar progress={paymentProgress}/>
        <PaymentDetailsCard amount={invoiceDetails.amount} address={invoiceDetails.address}/>
        <TransactionsContainer transactions={transactions}/>
    </div>;
};

export default Invoice;