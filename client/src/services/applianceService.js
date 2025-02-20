import * as request from "../lib/request";

const baseUrl = 'http://localhost:3030/data/appliances';

export const getAllAppliances = async () => {
    const result = await request.get(baseUrl);

    return result;
}

export const getOneAppliance = async (applianceId) => {
    const result = await request.get(`${baseUrl}/${applianceId}`);

    return result;
}

export const getAppliancesForUser = async (userId) => {
    const query = new URLSearchParams({ where: `_ownerId="${userId}"` });
    const result = await request.get(`${baseUrl}?${query}`);

    return result;
}

export const createAppliance = async (applianceData) => {
    const result = await request.post(baseUrl, applianceData);

    return result;
}

export const editAppliance = async (applianceId, applianceData) => {
    const result = await request.put(`${baseUrl}/${applianceId}`, applianceData);

    return result;
}

export const deleteAppliance = async (applianceId) => {
    await request.remove(`${baseUrl}/${applianceId}`);
}