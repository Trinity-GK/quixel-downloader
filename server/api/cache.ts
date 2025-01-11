import axios from 'axios';

export default defineEventHandler(async (event) => {
    try {
        // Read parameters from the request body
        const { objectIDs = [], assetCategories = [] } = await readBody(event);

        // Construct assetCategories filter
        const categoryFilters = assetCategories.join(' | ') + " AND "


        // Construct objectIDs filter
        const objectIDFilters = objectIDs
            .map((id: string) => `objectID:${id}`)
            .join(' OR ');

        // Combine the filters
        let filters = categoryFilters + objectIDFilters;


        // Define headers
        const headers = {
            'x-algolia-application-id': '6UJ1I5A072',
            'x-algolia-api-key': 'e93907f4f65fb1d9f813957bdc344892',
            'Referer': 'https://quixel.com/',
            'Content-Type': 'application/json',
        };

        // Prepare the payload
        const payload = {
            url: 'https://6UJ1I5A072-2.algolianet.com/1/indexes/assets/query?x-algolia-application-id=6UJ1I5A072&x-algolia-api-key=e93907f4f65fb1d9f813957bdc344892',
            params: `page=0&facets=assetCategories,packsPath&maxValuesPerFacet=100&hitsPerPage=50&filters=${filters}&query=&attributesToRetrieve=id,previews.relativeSize,previews.scaleReferences,previews.images.thumb,previews.images.thumbRetina,previews.images.thumbRetinaJpg,previews.images.aspectRatio,previews.images.preview,previews.images.thumbJpg,created,points,subCategory,category,type,name,descriptive,theme,contains,approvedAt,revised&attributesToHighlight=null`,
        };

        // Make the request
        const response = await axios.post('https://proxy-algolia-prod.quixel.com/algolia/cache', payload, { headers });

        // Return the response
        return {
            success: true,
            data: response.data,
        };
    } catch (error: any) {
        console.error('Error fetching cache:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
});
