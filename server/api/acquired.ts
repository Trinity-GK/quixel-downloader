import axios from 'axios';
import {setCookie} from "h3";

export default defineEventHandler(async (event) => {
    try {
        // Extract Bearer token from headers or body
        const { bearerToken } = await readBody(event);

        if (!bearerToken) {
            return { success: false, error: 'Bearer token is required.' };
        }

        // Make the GET request to the API
        const response = await axios.get('https://quixel.com/v1/assets/acquired', {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Referer': 'https://quixel.com/',
            },
        });

        // Return the API response
        return {
            success: true,
            data: response.data,
        };
    } catch (error: any) {
        console.error('Error fetching acquired:', error.message);
        return {
            success: false,
            error: 'Failed to fetch acquired. Please check your token.',
        };
    }
});
