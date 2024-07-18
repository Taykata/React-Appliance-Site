import * as request from "../lib/request";

const baseUrl = 'http://localhost:3030/data/appliances';

export const getAllAppliances = async () => {
    const result = await request.get(baseUrl);

    return result;
}

export const createAppliance = async (applianceData) => {
    const result = await request.post(baseUrl, applianceData);

    return result;
}