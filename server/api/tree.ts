import axios from 'axios';

export default defineEventHandler(async (event) => {
    try {
        // Extract Bearer token from headers or body
        const { bearerToken } = await readBody(event);

        if (!bearerToken) {
            return { success: false, error: 'Bearer token is required.' };
        }

        // Make the GET request to the API
        const response = await axios.get('https://quixel.com/v1/assets/acquired/favorite/tree', {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Referer': 'https://quixel.com/',
                'x-api-key': '2Zg8!d2WAHIUW?pCO28cVjfOt9seOWPx@2j'
            },
        });

        // Return the API response
        return {
            success: true,
            data: response.data,
        };
    } catch (error: any) {
        console.error('Error fetching favorite tree:', error.message);
        return {
            success: false,
            error: 'Failed to fetch favorite tree. Please check your token.',
        };
    }
});
