import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Navbar';
import './listings.css'
import './listing.css'

const ListingCreateForm = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price_xnv, setPriceXNV] = useState('');
    const [quantity_available, setQuantityAvailable] = useState('1');
    const [img_file, setIMGFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price_xnv', price_xnv);
        formData.append('quantity_available', quantity_available);
        if (img_file) {
            formData.append('file', img_file);
        }

        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/create', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                // Clear the form so it's fresh if the user creates another listing
                setTitle('');
                setDescription('');
                setPriceXNV('');
                setQuantityAvailable('1');
                setIMGFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFeedback({ type: 'success', message: 'Your listing has been created.' });
            } else {
                let detail = 'The submission was rejected by the server.';
                try {
                    const result = await response.json();
                    if (result && result.detail) {
                        if (typeof result.detail === 'string') {
                            detail = result.detail;
                        } else if (Array.isArray(result.detail)) {
                            // FastAPI validation errors come back as an array of
                            // { loc, msg, type } objects. Join the messages.
                            detail = result.detail.map(err => err.msg).join('. ');
                        }
                    }
                } catch {
                    // Response body wasn't JSON (e.g. empty 500 response).
                    // Keep the generic message.
                }
                setFeedback({ type: 'error', message: detail });
            }
        } catch (error) {
            console.error('Error:', error);
            setFeedback({
                type: 'error',
                message: 'Could not reach the server. Please check your connection and try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDismissFeedback = () => {
        const wasSuccess = feedback && feedback.type === 'success';
        setFeedback(null);
        if (wasSuccess) {
            navigate('/listings');
        }
    };

    return (
        <>
            <NavBar />
            <div className="form-container">
                <h2 className="form-heading">Create a Listing</h2>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <label htmlFor="title">Title</label>
                    <input
                        id="title"
                        type="text"
                        placeholder="e.g. NVIDIA GT 730 GPU"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <label htmlFor="description">Description</label>
                    <input
                        id="description"
                        type="text"
                        placeholder="Describe the item and its condition"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <label htmlFor="price">Price (XNV)</label>
                    <input
                        id="price"
                        type="text"
                        placeholder="1.0"
                        value={price_xnv}
                        onChange={(e) => setPriceXNV(e.target.value)}
                    />
                    <label htmlFor="quantity">Quantity Available</label>
                    <input
                        id="quantity"
                        type="number"
                        placeholder="1"
                        value={quantity_available}
                        onChange={(e) => setQuantityAvailable(e.target.value)}
                        min="1"
                        step="1"
                    />
                    <label htmlFor="file">Listing Image</label>
                    <input
                        type="number"
                        placeholder="Quantity Available"
                        value={quantity_available}
                        onChange={(e) => setQuantityAvailable(e.target.value)}
                        min="1"
                        step="1"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setIMGFile(e.target.files[0])}
                    />
                    <button type="submit" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </form>
            </div>
            {feedback && <div className='overlay'></div>}
            {feedback &&
                <div className='modal' style={{ padding: '20px', maxWidth: '400px' }}>
                    <center>
                        <h3>{feedback.type === 'success' ? 'Success' : 'Error'}</h3>
                        <p>{feedback.message}</p>
                        <button onClick={handleDismissFeedback}>
                            {feedback.type === 'success' ? 'Continue' : 'Try again'}
                        </button>
                    </center>
                </div>}
        </>
    );
};

export default ListingCreateForm;
