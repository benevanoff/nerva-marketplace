import React, { useState } from 'react';
import './listings.css'

const ListingCreateForm = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price_xnv, setPriceXNV] = useState('');
    const [img_file, setIMGFile] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price_xnv', price_xnv);
        if (img_file) {
            formData.append('file', img_file);
        }

        try {
            const response = await fetch(process.env.REACT_APP_MARKET_MICROSERVICES+'/market/listing/create', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const result = await response.json();
            console.log(result);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="form-container">
        <form onSubmit={handleSubmit} encType="multipart/form-data">
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            <input
                type="text"
                placeholder="Price XNV"
                value={price_xnv}
                onChange={(e) => setPriceXNV(e.target.value)}
            />
            <input
                type="file"
                onChange={(e) => setIMGFile(e.target.files[0])}
            />
            <button type="submit">Submit</button>
        </form>
        </div>
    );
};

export default ListingCreateForm;
