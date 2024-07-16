import * as request from "../lib/request";

const baseUrl = 'http://localhost:3030/jsonstore/appliances';

export const getAll = async () => {
    const result = await request.get(baseUrl);

    return Object.values(result);
}

export const create = async (applianceData) => {
    const result = await request.post(baseUrl, applianceData);

    return result;
}