// server/api/process-downloads.post.ts
import { defineEventHandler, readBody, getCookie } from 'h3'
import axios from 'axios';
import * as fs from "node:fs";

// Types for better code organization
interface Asset {
    id: string
    name: string
    category: string
    objectID: string
    previews: {
        images: {
            thumbJpg: string
            thumbRetina: string
            thumbRetinaJpg: string
            aspectRatio: number
            preview: string
            thumb: string
        }
        relativeSize: string
    }
    [key: string]: any  // for other properties
}

interface ProcessedAsset extends Asset {
    path: string  // Store which categories this asset belongs to
}

function validateSelectedPaths(treeData: any, selectedPaths: any) {
    // Helper function to get object at path
    function getObjectAtPath(obj: any, path: any) {
        return path.reduce((current: any, key: string) => current && current[key], obj);
    }

    // Helper function to check if all children of a path are selected
    function hasAllChildrenSelected(path: any) {
        const nodeAtPath = getObjectAtPath(treeData, path);
        if (!nodeAtPath) return true;

        const childKeys = Object.keys(nodeAtPath);
        if (childKeys.length === 0) return true;

        return childKeys.every(key => {
            const childPath = [...path, key];
            return selectedPaths.some((selectedPath: any) =>
                JSON.stringify(selectedPath) === JSON.stringify(childPath)
            );
        });
    }

    // Return paths that either have all children selected or are leaf nodes
    return selectedPaths.filter((currentPath: any) => {
        const nodeAtPath = getObjectAtPath(treeData, currentPath);
        if (!nodeAtPath) return false;  // Path doesn't exist in tree

        // If it's a leaf node (no children) or all children are selected, keep it
        return Object.keys(nodeAtPath).length === 0 || hasAllChildrenSelected(currentPath);
    });
}

// Create Algolia query for a category path
const createAlgoliaQuery = (categoryPath: string[], objectIds: string[]) => {
    const categoryFilter = `assetCategories:"${categoryPath.join(' | ')}"`
    const objectIdFilters = objectIds.map(id => `objectID:${id}`).join(' OR ')

    const params = {
        page: 0,
        facets: "assetCategories,packsPath",
        maxValuesPerFacet: 100,
        hitsPerPage: 500,
        filters: `${categoryFilter} AND ${objectIdFilters}`,
        query: '',
        attributesToRetrieve: "id,previews.relativeSize,previews.scaleReferences,previews.images.thumb,previews.images.thumbRetina,previews.images.thumbRetinaJpg,previews.images.aspectRatio,previews.images.preview,previews.images.thumbJpg,created,points,subCategory,category,type,name,descriptive,theme,contains,approvedAt,revised",
        attributesToHighlight: null
    }

    const queryString = Object.entries(params)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return value.map(v => `${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`).join('&');
            }
            if (value === null) {
                return `${encodeURIComponent(key)}=`;
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');

    return {
        url: "https://6UJ1I5A072-2.algolianet.com/1/indexes/assets/query?x-algolia-application-id=6UJ1I5A072&x-algolia-api-key=e93907f4f65fb1d9f813957bdc344892",
        params: queryString
    }
}

export default defineEventHandler(async (event) => {
    try {
        // Get data from request body
        const body = await readBody(event);
        const selectedPathsStr = getCookie(event, 'selectedPaths') || '[]';
        const treeDataStr = getCookie(event, 'treeData') || '[]';
        const treeData = JSON.parse(treeDataStr);

        // sort from the biggest array to smallest
        const selectedPaths = JSON.parse(selectedPathsStr)
            .map((top: any) => top
                .filter((sub: any) => sub !== 'Root')
            ).sort((a: any, b: any) => b.length - a.length);

        console.log(selectedPaths)


        const acquiredData = body.acquiredData || [];

        const objectIds = acquiredData.map((item: { assetID: string }) => item.assetID);

        if (!objectIds.length) {
            throw new Error('No acquired data found')
        }

        // Map to store unique assets by ID
        const assetsMap = new Map<string, ProcessedAsset>()

        // Process each category path
        for (const path of selectedPaths) {
            // Define headers
            const headers = {
                'Referer': 'https://quixel.com/',
                'Origin': 'https://quixel.com/',
                'Content-Type': 'application/json',
                'x-api-key': '2Zg8!d2WAHIUW?pCO28cVjfOt9seOWPx@2j'
            };

            // Prepare the payload
            const payload = createAlgoliaQuery(path, objectIds);

            // Make the request
            const response = await axios.post('https://proxy-algolia-prod.quixel.com/algolia/cache', payload, { headers });

            // Process each hit
            response.data.hits.forEach((hit: Asset) => {
                if (!assetsMap.has(hit.id)) {
                    // If it's a new asset, add it with its first category
                    assetsMap.set(hit.id, {
                        ...hit,
                        path: path
                    })
                }
            })
        }

        // Convert map to array for response
        const combinedResults = Array.from(assetsMap.values())

        return {
            success: true,
            totalAssets: combinedResults.length,
            assets: combinedResults
        }
    } catch (error: any) {
        console.error('Error processing downloads:', error)
        return {
            success: false,
            error: error.message
        }
    }
})