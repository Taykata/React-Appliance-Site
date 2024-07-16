const baseUrl = 'http://localhost:3030/jsonstore'

export const create = async (applianceData) => {
    const response = await fetch(`${baseUrl}/appliances`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(applianceData)
    })

    const result = await response.json();

    return result;
}