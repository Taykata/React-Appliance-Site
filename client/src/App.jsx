import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

import * as authService from './services/authService';
import AuthContext from './contexts/authContext';

import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import AllAppliances from './components/MainAppliances/AllAppliances/AllAppliances';
import AddAppliance from './components/MainAppliances/AddAppliance/AddAppliance';
import MyProfile from './components/MyProfile/MyProfile';
import Logout from './components/auth/Logout/Logout';
import Login from './components/auth/Login/Login';
import Register from './components/auth/Register/Register';
import Footer from './components/Footer/Footer';
import ApplianceDetails from './components/MainAppliances/ApplianceDetails/ApplianceDetails';
import NotFound from './components/NotFound/NotFound';

export default function App() {
    const navigate = useNavigate();
    const [auth, setAuth] = useState({});

    const loginSubmitHandler = async (values) => {
        const result = await authService.login(values.email, values.password);

        setAuth(result);

        navigate('/');
    }

    const registerSubmitHandler = async (values) => {
        console.log(values);
    }

    const values = {
        loginSubmitHandler,
        registerSubmitHandler,
        username: auth.username,
        email: auth.email,
        isAuthenticated: !!auth.username
    }

    return (
        <AuthContext.Provider value={values}>
            <Navigation />

            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/all-appliances' element={<AllAppliances />} />
                <Route path='/add-appliance' element={<AddAppliance />} />
                <Route path='/my-profile' element={<MyProfile />} />
                <Route path='/logout' element={<Logout />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route path='/details' element={<ApplianceDetails />} />
                <Route path='*' element={<NotFound />} />
            </Routes>

            <Footer />
        </AuthContext.Provider>
    )
}