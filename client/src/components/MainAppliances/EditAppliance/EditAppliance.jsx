import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import * as applianceService from '../../../services/applianceService';
import style from './EditAppliance.module.css';

const formInitialState = {
    image: '',
    title: '',
    brand: '',
    price: '',
    description: ''
}

export default function EditAppliance() {
    const navigate = useNavigate();
    const { applianceId } = useParams();
    const [formValues, setFormValues] = useState(formInitialState);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAppliance = async () => {
            try {
                const appliance = await applianceService.getOneAppliance(applianceId);
                setFormValues(appliance);
                setPreview(appliance.image);
            } catch (error) {
                console.error('Failed to fetch appliance:', error);
            }
        };

        fetchAppliance();
    }, [applianceId]);

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

    const validateForm = () => {
        const { image, title, brand, price, description } = formValues;
        if (!image || !title || !brand || !price || !description) {
            setError('Please fill in all fields and select a file before submitting.');
            return false;
        }
        setError('');
        return true;
    }

    const submitHandler = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await applianceService.editAppliance(applianceId, formValues);

            navigate('/all-appliances');
        } catch (err) {
            // Error Notification
            console.log(err);
        }
    };

    return (
        <div className={style.container}>
            <div className={style.form}>
                <div className={style.title}>Edit Appliance</div>
                <form onSubmit={submitHandler}>
                    <div className={`${style.inputContainer} ${style.ic1}`}>
                        <label htmlFor="image" className={style.placeholder}></label>
                        <input
                            type="file"
                            id="image"
                            name="image"
                            className={style.inputFile}
                            accept="image/*"
                            onChange={changeHandler}
                        />
                        <div className={style.cut} />
                    </div>
                    <div className={style.previewContainer}>
                        {preview && <img src={preview} alt="Product's image" className={style.preview} />}
                    </div>
                    <div className={`${style.inputContainer} ${style.ic2}`}>
                        <label htmlFor="title" className={style.placeholder}>
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            className={style.input}
                            value={formValues.title}
                            onChange={changeHandler}
                        />
                        <div className={style.cut} />
                    </div>
                    <div className={`${style.inputContainer} ${style.ic2}`}>
                        <label htmlFor="brand" className={style.placeholder}>
                            Brand
                        </label>
                        <input
                            type="text"
                            id="brand"
                            name="brand"
                            className={style.input}
                            value={formValues.brand}
                            onChange={changeHandler}
                        />
                        <div className={`${style.cut} ${style.cutShort}`} />
                    </div>
                    <div className={`${style.inputContainer} ${style.ic2}`}>
                        <label htmlFor="price" className={style.placeholder}>
                            Price
                        </label>
                        <input
                            type="text"
                            id="price"
                            name="price"
                            className={style.input}
                            value={formValues.price}
                            onChange={changeHandler}
                        />
                        <div className={`${style.cut} ${style.cutShort}`} />
                    </div>
                    <div className={`${style.inputContainer} ${style.ic2}`}>
                        <label htmlFor="description" className={style.placeholder}>
                            Description
                        </label>
                        <textarea
                            type="text"
                            id="description"
                            name="description"
                            className={`${style.input} ${style.description}`}
                            value={formValues.description}
                            onChange={changeHandler}
                        />
                        <div className={`${style.cut} ${style.cutShort}`} />
                    </div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <button type="submit" className={style.submit}>
                        Edit
                    </button>
                </form>
            </div>
        </div>
    );
}