import React, { useState } from 'react';
import styles from './AddAppliance.module.css';

export default function AddAppliance() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Добави логика за изпращане на данните на сървър или API
        console.log('Form submitted');
    };

    return (
        <div className={styles.container}>
            <div className={styles.form}>
                <div className={styles.title}>Add Appliance</div>
                <form onSubmit={handleSubmit}>
                    <div className={`${styles.inputContainer} ${styles.ic1}`}>
                        <label htmlFor="imgUpload" className={styles.placeholder}>
                            Upload Image
                        </label>
                        <input id="imgUpload" className={styles.inputFile} type="file" accept="image/*" onChange={handleFileChange} />
                        <div className={styles.cut} />
                    </div>
                    <div className={styles.previewContainer}>
                        {preview && <img src={preview} alt="Preview" className={styles.preview} />}
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="title" className={styles.placeholder}>
                            Title
                        </label>
                        <input id="title" className={styles.input} type="text" placeholder=" " />
                        <div className={styles.cut} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="brand" className={styles.placeholder}>
                            Brand
                        </label>
                        <input id="brand" className={styles.input} type="text" placeholder=" " />
                        <div className={`${styles.cut} ${styles.cutShort}`} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="price" className={styles.placeholder}>
                            Price
                        </label>
                        <input id="price" className={styles.input} type="text" placeholder=" " />
                        <div className={`${styles.cut} ${styles.cutShort}`} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="description" className={styles.placeholder}>
                            Description
                        </label>
                        <input id="description" className={styles.input} type="text" placeholder=" " />
                        <div className={`${styles.cut} ${styles.cutShort}`} />
                    </div>
                    <button type="submit" className={styles.submit}>
                        Create
                    </button>
                </form>
            </div>
        </div>
    );
}
