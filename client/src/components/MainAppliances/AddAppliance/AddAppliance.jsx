import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import styles from './AddAppliance.module.css';
import * as applianceService from '../../../services/applianceService';

const formInitialState = {
    image: '',
    title: '',
    brand: '',
    price: '',
    description: ''
}

export default function AddAppliance() {
    const navigate = useNavigate();
    const [formValues, setFormValues] = useState(formInitialState);
    const [preview, setPreview] = useState(null);

    const changeHandler = (e) => {
        const { name, value, files } = e.target;

        if (name === 'image' && files.length) {
            const file = files[0];
            const previewURL = URL.createObjectURL(file)
            setPreview(previewURL);

            const fr = new FileReader();
            fr.onload = () => {
                const url = fr.result;
                setFormValues(state => ({
                    ...state,
                    [name]: url
                }))
            }
            fr.readAsDataURL(file);

            
        } else {
            setFormValues(state => ({
                ...state,
                [name]: value
            }));
        }

    }

    const submitHandler = async (event) => {
        event.preventDefault();
        
        try {
            await applianceService.create(formValues);
    
            navigate('/all-appliances');
        } catch (err) {
            // Error Notification
            console.log(err);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.form}>
                <div className={styles.title}>Add Appliance</div>
                <form onSubmit={submitHandler}>
                    <div className={`${styles.inputContainer} ${styles.ic1}`}>
                        <label htmlFor="image" className={styles.placeholder}></label>
                        <input
                            type="file"
                            id="image"
                            name="image"
                            className={styles.inputFile}
                            accept="image/*"
                            onChange={changeHandler}
                        />
                        <div className={styles.cut} />
                    </div>
                    <div className={styles.previewContainer}>
                        {preview && <img src={preview} alt="Product's image" className={styles.preview} />}
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="title" className={styles.placeholder}>
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            className={styles.input}
                            value={formValues.title}
                            onChange={changeHandler}
                        />
                        <div className={styles.cut} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="brand" className={styles.placeholder}>
                            Brand
                        </label>
                        <input
                            type="text"
                            id="brand"
                            name="brand"
                            className={styles.input}
                            value={formValues.brand}
                            onChange={changeHandler}
                        />
                        <div className={`${styles.cut} ${styles.cutShort}`} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="price" className={styles.placeholder}>
                            Price
                        </label>
                        <input
                            type="text"
                            id="price"
                            name="price"
                            className={styles.input}
                            value={formValues.price}
                            onChange={changeHandler}
                        />
                        <div className={`${styles.cut} ${styles.cutShort}`} />
                    </div>
                    <div className={`${styles.inputContainer} ${styles.ic2}`}>
                        <label htmlFor="description" className={styles.placeholder}>
                            Description
                        </label>
                        <input
                            type="text"
                            id="description"
                            name="description"
                            className={styles.input}
                            value={formValues.description}
                            onChange={changeHandler}
                        />
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