import * as request from '../lib/request';

const baseUrl = 'http://localhost:3030/users';

export const login = async (email, password) => {
    try {
        const result = await request.post(`${baseUrl}/login`, {
            email,
            password
        });

        return result;
    } catch (error) {
        throw new Error(error.message || 'Login failed');
    }

};

export const register = async (email, password, rePass) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format. Please use a valid email address (e.g., user@example.com).');
    }

    if (password !== rePass) {
        throw new Error('Passwords do not match.');
    }

    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
    }

    try {
        const result = await request.post(`${baseUrl}/register`, {
            email,
            password
        });

        return result;
    } catch (error) {
        throw new Error(error.message || 'Registration failed');
    }
};

export const logout = async () => {
    await request.get(`${baseUrl}/logout`);
};