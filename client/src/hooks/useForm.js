import { useState } from "react";

export default function useForm(submitHandler, initialValues) {
    const [values, setValues] = useState(initialValues);
    const [error, setError] = useState('');

    const onChange = (e) => {
        setValues(state => ({
            ...state,
            [e.target.name]: e.target.value
        }));
    }

    const onSubmit = async (e) => {
        e.preventDefault();

        const hasEmptyFields = Object.values(values).some(value => !value.trim());
        if (hasEmptyFields) {
            setError('All fields are required.');
            return;
        }

        try {
            await submitHandler(values);
            setError('');
        } catch (err) {
            setError(err.message || 'An error occurred');
        }
    }

    return {
        values,
        onChange,
        onSubmit,
        error
    }
}