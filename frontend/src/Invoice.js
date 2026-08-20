import './invoice.css'
import NervaLogo from './nerva-coin-logo.png';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

const StatusBar = ({ progress }) => {
    const steps = [
        { num: 1, label: 'Awaiting Payment' },
        { num: 2, label: 'Payment Detected' },
        { num: 3, label: 'Confirmed' }
    ];

    return (
        <div className="status-bar-wrapper">
            <div className="status-bar">
                <div className="status-line"></div>
                <div
                    className="status-line-filled"
                    style={{ width: `${progress <= 1 ? 0 : (progress - 1) * 50}%` }}
                ></div>
                {steps.map((step) => (
                    <div key={step.num} className="status-step">
                        <div className={`status-dot ${progress >= step.num ? 'filled' : ''}`}>
                            {progress >= step.num && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                        <span className={`status-label ${progress >= step.num ? 'active' : ''}`}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PaymentDetailsCard = ({ address, amount }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        // Use the modern Clipboard API when available (requires HTTPS or localhost).
        // Fall back to a hidden textarea + execCommand for older browsers / non-secure contexts.
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(address).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                fallbackCopy(address);
            });
        } else {
            fallbackCopy(address);
        }
    };

    const fallbackCopy = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
        document.body.removeChild(textarea);
    };

    return (
        <div className='payment-card'>
            <div className='payment-amount-section'>
                <img src={NervaLogo} alt="NERVA" className="payment-logo" />
                <div className="payment-amount-text">
                    <span className="payment-label">Amount Due</span>
                    <span className="payment-amount">{amount} XNV</span>
                </div>
            </div>
            <div className="payment-address-section">
                <p className="payment-instruction">
                    Send <strong>{amount} XNV</strong> to the address below to complete your order.
                </p>
                <div className="address-box">
                    <code className="address-text">{address}</code>
                    <button className="copy-btn" onClick={handleCopy}>
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <p className="payment-hint">
                    The page will update automatically once your payment is detected.
                    You can leave it open.
                </p>
            </div>
        </div>
    );
};

const TransactionsContainer = ({ transactions }) => {
    if (transactions.length === 0) return null;
    return (
        <div className="transactions-wrapper">
            <h3 className="transactions-title">Transactions</h3>
            {transactions.map((tx) => (
                <div key={tx.txId} className='transaction-item'>
                    <div className="transaction-row">
                        <span className="transaction-label">Tx ID</span>
                        <span className="transaction-value mono">{tx.txId}</span>
                    </div>
                    <div className="transaction-row">
                        <span className="transaction-label">Amount</span>
                        <span className="transaction-value">{tx.amount} XNV</span>
                    </div>
                    <div className="transaction-row">
                        <span className="transaction-label">Status</span>
                        <span className={`transaction-status ${tx.confirmations > 0 ? 'confirmed' : 'pending'}`}>
                            {tx.confirmations > 0 ? 'Confirmed' : 'Pending'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SuccessScreen = ({ amount, address, transactions }) => {
    const confirmedTx = transactions.find(t => t.confirmations > 0);
    return (
        <div className="success-screen">
            <div className="success-icon-wrapper">
                <svg className="success-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h2 className="success-title">Payment Successful</h2>
            <p className="success-subtitle">
                Your payment of <strong>{amount} XNV</strong> has been confirmed.
                The vendor has been notified and will process your order.
            </p>
            <div className="success-details">
                <div className="detail-row">
                    <span className="detail-label">Invoice ID</span>
                    <span className="detail-value mono">{address ? '' : ''}</span>
                </div>
                {confirmedTx && (
                    <>
                        <div className="detail-row">
                            <span className="detail-label">Transaction ID</span>
                            <span className="detail-value mono">{confirmedTx.txId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount Paid</span>
                            <span className="detail-value">{confirmedTx.amount} XNV</span>
                        </div>
                    </>
                )}
                <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                        <span className="status-badge confirmed">Confirmed</span>
                    </span>
                </div>
            </div>
            <p className="success-footer">
                You can safely close this page. A confirmation record has been saved.
            </p>
        </div>
    );
};

const Invoice = () => {
    const { invoice_id } = useParams();
    const [invoiceDetails, setDetails] = useState({ "address": "", "amount": 0 });
    const [paymentProgress, setProgess] = useState(1);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getInvoiceDetailsRequest = async () => {
            try {
                const response = await fetch(process.env.REACT_APP_PAYMENTS_MICROSERVICES + '/invoice/' + invoice_id, {
                    method: 'GET',
                    credentials: 'include'
                });
                const result = await response.json();
                setDetails(result);
                setLoading(false);
            } catch (error) {
                console.error('Error:', error);
                setLoading(false);
            }
        };

        getInvoiceDetailsRequest();
    }, [invoice_id]);

    useEffect(() => {
        const socket = new WebSocket(process.env.REACT_APP_PAYMENTS_WEBSOCKET + '/' + invoice_id);
        socket.addEventListener('open', () => {
            console.log('Connected to WS Server');
        });
        socket.addEventListener('message', (event) => {
            let txId = event.data.split(",")[0];
            let amount = event.data.split(",")[1];
            let confirmations = event.data.split(",")[2];
            console.log('confirmations: ' + confirmations);
            setTransactions(prev => {
                const existing = prev.find(tx => tx.txId === txId);
                if (existing) {
                    return prev.map(tx =>
                        tx.txId === txId
                            ? { ...tx, confirmations }
                            : tx
                    );
                }
                // Transaction not in the list yet (e.g. backend skipped the
                // mempool event and went straight to confirmation). Add it.
                return [...prev, { 'txId': txId, 'amount': amount, 'confirmations': confirmations }];
            });
            setProgess(progress => progress + 2); // jump straight to complete
        });
        socket.addEventListener('error', (event) => { console.error('WebSocket error:', event); });
        socket.addEventListener('close', () => { console.log('Disconnected from WS Server'); });

        return () => { socket.close(); };
    }, [invoice_id]);

    const isConfirmed = transactions.some(t => t.confirmations > 0);

    if (loading) {
        return <div className='invoice-container'>
            <div className="invoice-card">
                <p className="loading-text">Loading invoice...</p>
            </div>
        </div>;
    }

    return (
        <div className='invoice-container'>
            <div className="invoice-card">
                <div className="invoice-header">
                    <img src={NervaLogo} alt="NERVA" className="invoice-logo" />
                    <div>
                        <h1 className="invoice-title">Invoice #{invoice_id}</h1>
                        <p className="invoice-subtitle">
                            {isConfirmed ? 'Payment complete' : 'Complete your payment'}
                        </p>
                    </div>
                </div>

                {isConfirmed ? (
                    <SuccessScreen
                        amount={invoiceDetails.amount}
                        address={invoiceDetails.address}
                        transactions={transactions}
                    />
                ) : (
                    <>
                        <StatusBar progress={paymentProgress} />
                        <PaymentDetailsCard amount={invoiceDetails.amount} address={invoiceDetails.address} />
                        <TransactionsContainer transactions={transactions} />
                    </>
                )}
            </div>
        </div>
    );
};

export default Invoice;
