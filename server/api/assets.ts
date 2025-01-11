import axios from 'axios';

export default defineEventHandler(async (event) => {
    const body = await readBody(event); // Read the POST request body
    const { bearerToken } = body;

    if (!bearerToken) {
        return { error: 'Bearer token is required.' };
    }

    try {
        const response = await axios.get('https://quixel.com/v1/assets/acquired', {
            headers: { Authorization: `Bearer ${bearerToken}` },
        });

        // Check for a valid response
        if (!response.data.statusCode) {
            return { message: 'Request confirmed!', data: response.data };
        } else {
            return { error: 'Unexpected status code in response.' };
        }
    } catch (error: any) {
        console.error('Error fetching assets:', error.message);
        return { error: 'Failed to fetch assets. Please check your token and try again.' };
    }
});
