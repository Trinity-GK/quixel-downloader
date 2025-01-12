import { defineEventHandler, getCookie, readBody } from 'h3'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import axios from 'axios'
import * as fs from "node:fs";
import {integer} from "vscode-languageserver-types";

interface TextureSettings {
    [key: string]: {
        enabled: boolean;
        format: string;
    }
}

interface ModelSettings {
    resolution: string;
    megascansFormat: string;
    downloadPath?: string;
    extraSettings: {
        highpolySource: boolean;
        sourceZTool: boolean;
        brushes: boolean;
    };
    lodSettings: {
        [key: string]: boolean;
    };
}

interface DownloadSettings {
    textureSettings: TextureSettings;
    modelSettings: ModelSettings;
    uniqueMapsPerLOD: boolean;
}

interface ExtendedAssetResponse {
    components: Array<{
        type: string;
        uris: Array<{
            resolutions: Array<{
                resolution: string;
                formats: Array<{
                    mimeType: string;
                }>;
            }>;
        }>;
    }>;
}

interface RequestComponent {
    type: string;
    mimeType: string;
    resolution: string;
}

interface SanitizeInput {
    asset: string;
    components: RequestComponent[];
    config: {
        highpoly: boolean;
        ztool: boolean;
        brushes: boolean;
        lowerlod_normals: boolean;
        albedo_lods: boolean;
        meshMimeType: string;
        lods: number[];
    };
}

const TEXTURE_TYPE_MAP = {
    albedo: 'albedo',
    normal: 'normal',
    displacement: 'displacement',
    roughness: 'roughness',
    ao: 'ao',
    metalness: 'metalness',
    cavity: 'cavity',
    curvature: 'curvature',
    fuzz: 'fuzz',
    translucency: 'translucency',
    opacity: 'opacity',
    brush: 'brush',
    mask: 'mask',
    transmission: 'transmission',
    thickness: 'thickness',
    gloss: 'gloss',
    diffuse: 'diffuse',
    specular: 'specular',
    normalBump: 'normal_bump',
    normalObject: 'normal_object'
} as const;

const LOD_SIZES = [9788, 4894, 2446, 1224, 612, 306];

function createLog(assetId: string, type: string, log: any) {
    const directory = `./logs/${assetId}/`
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(`${directory}${type}.json`, JSON.stringify(log, null, 2));
}

function prepareComponents(settings: DownloadSettings): RequestComponent[] {
    const components: RequestComponent[] = [];

    Object.entries(settings.textureSettings).forEach(([key, setting]) => {
        if (setting.enabled) {
            //@ts-ignore
            const type = TEXTURE_TYPE_MAP[key] || key;

            if (setting.format.includes('JPEG')) {
                components.push({
                    type,
                    mimeType: 'image/jpeg',
                    resolution: settings.modelSettings.resolution
                });
            }

            if (setting.format.includes('EXR')) {
                components.push({
                    type,
                    mimeType: 'image/x-exr',
                    resolution: settings.modelSettings.resolution
                });
            }
        }
    });

    return components;
}

function prepareConfig(settings: DownloadSettings, extendedData: any) {
    const config = {
        highpoly: settings?.modelSettings?.extraSettings?.highpolySource,
        ztool: settings?.modelSettings?.extraSettings?.sourceZTool,
        brushes: settings?.modelSettings?.extraSettings?.brushes,
        lowerlod_normals: settings?.uniqueMapsPerLOD,
        albedo_lods: settings?.uniqueMapsPerLOD,
        meshMimeType: settings?.modelSettings?.megascansFormat === 'FBX'
            ? 'application/x-fbx'
            : 'application/x-abc',
        lods: [] as number[]
    };

    // Get LOD meshes from extended data if available
    const lodMeshes = extendedData?.meshes?.filter((mesh: any ) =>
        mesh.type === 'lod' && typeof mesh.tris === 'number'
    ) ?? [];

    config.lods = Object.entries(settings?.modelSettings?.lodSettings)
        .filter(([_, enabled]) => enabled)
        .map((_, index) => {
            // Try to get tris from extended data first
            const lodMesh = lodMeshes[index];
            if (lodMesh?.tris !== undefined) {
                return lodMesh.tris;
            }
            // Fall back to default LOD sizes if no extended data available
            return LOD_SIZES[index];
        })
        .filter(size => size !== undefined);

    return config;
}

function sanitizeComponents(input: any, extendedData: any) {
    // Create a map of available components
    const availableComponents = new Map();

    // Process extended data to build component availability map
    if(extendedData.components) {
        extendedData.components.forEach((component: any) => {
            const componentData = {
                type: component.type,
                resolutions: new Set<string>(),
                mimeTypes: new Set<string>()
            };

            component.uris.forEach((uri: any) => {
                uri.resolutions.forEach((res: any) => {
                    componentData.resolutions.add(res.resolution);
                    res.formats.forEach((format: any) => {
                        componentData.mimeTypes.add(format.mimeType);
                    });
                });
            });

            availableComponents.set(component.type, componentData);
        });
    }

    // Convert maps to component format and add to availability map
    if(extendedData.maps) {
        extendedData.maps.forEach((map: any) => {
            if (!availableComponents.has(map.type)) {
                availableComponents.set(map.type, {
                    type: map.type,
                    resolutions: new Set<string>(),
                    mimeTypes: new Set<string>()
                });
            }

            const componentData = availableComponents.get(map.type);
            componentData.resolutions.add(map.resolution);
            componentData.mimeTypes.add(map.mimeType);
        });
    }

    // Helper function to find best matching resolution
    const findBestResolution = (requested: string, available: Set<string>): string => {
        const requestedSize = parseInt(requested.split('x')[0]);
        const availableSizes = Array.from(available)
            .map(res => parseInt(res.split('x')[0]))
            .sort((a, b) => b - a); // Sort descending

        const bestSize = availableSizes.find(size => size <= requestedSize) || availableSizes[0];
        return `${bestSize}x${bestSize}`;
    };

    // Process components from input, including both original components and maps
    let allComponents = [...(input.components || [])];

    // Add requested maps as components if they exist in input.maps
    if (input.maps) {
        const mapComponents = input.maps.map((map: any) => ({
            type: map.type,
            mimeType: map.mimeType,
            resolution: map.resolution
        }));
        allComponents = [...allComponents, ...mapComponents];
    }

    // Filter and adjust components
    const sanitizedComponents = allComponents
        .filter(comp => {
            const available = availableComponents.get(comp.type);
            if (!available) {
                // console.log(`Skipping ${comp.type} - not available in asset`);
                return false;
            }
            if (!available.mimeTypes.has(comp.mimeType)) {
                // console.log(`Skipping ${comp.type} - mime type ${comp.mimeType} not supported`);
                return false;
            }
            return true;
        })
        .map(comp => {
            const available = availableComponents.get(comp.type);
            return {
                type: comp.type,
                mimeType: comp.mimeType,
                resolution: findBestResolution(comp.resolution, available.resolutions)
            };
        });

    return {
        ...input,
        components: sanitizedComponents
    };
}

// Previous interfaces remain the same...

const sleep = async (time: integer) => {
    return new Promise( resolve => setTimeout(resolve, time) );
}

function sendProgressUpdate(event: any, data: any) {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildDownloadPath(baseDir: any, assetPath: string[]): string {
    // If no base directory specified, use default
    if (!baseDir) {
        return join(process.cwd(), 'downloads', ...assetPath);
    }

    // Construct path with base directory and asset path
    return join(baseDir, ...assetPath);
}

// /api/download.ts
export default defineEventHandler(async (event) => {
    try {
        // Set headers for SSE
        setHeader(event, 'Content-Type', 'text/event-stream');
        setHeader(event, 'Cache-Control', 'no-cache');
        setHeader(event, 'Connection', 'keep-alive');

        const body = await readBody(event);
        const { assets } = body;
        const totalAssets = assets.length;

        // Parse cookies
        const bearerToken = getCookie(event, 'bearerToken') || '';
        if (!bearerToken) {
            throw new Error('Authentication token is missing');
        }

        const settings = {
            modelSettings: JSON.parse(getCookie(event, 'modelSettings') || '{}'),
            textureSettings: JSON.parse(getCookie(event, 'textureSettings') || '{}'),
            uniqueMapsPerLOD: JSON.parse(getCookie(event, 'uniqueMapsPerLOD') || 'true')
        };

        // Create axios instance with default headers
        const api = axios.create({
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=UTF-8',
                'Authorization': `Bearer ${bearerToken}`,
                'referer': 'https://quixel.com/megascans/purchased',
                'origin': 'https://quixel.com/',
            }
        });

        // Start the download process in the background
        processDownloads(event, assets, api, settings).catch(error => {
            console.error('Download error:', error);
            sendProgressUpdate(event, {
                type: 'error',
                error: error.message,
                status: 'Error occurred'
            });
        });

        // Send initial connection message
        sendProgressUpdate(event, {
            type: 'connected',
            status: 'Starting downloads...',
            total: totalAssets
        });

        return 'ok';
    } catch (error: any) {
        console.error('Setup error:', error);
        sendProgressUpdate(event, {
            type: 'error',
            error: error.message,
            status: 'Error occurred'
        });
        return 'error';
    }
});

// Separate function to handle downloads
async function processDownloads(event: any, assets: any, api: any, settings: any) {
    for (let i = 0; i < assets.length; i++) {
        console.log('ASSET', assets[i].id);


        const asset = assets[i];
        createLog(asset.id, '0-settings', settings);

        createLog(asset.id, '1-asset', asset);
        try {
            // Send asset start progress
            sendProgressUpdate(event, {
                type: 'asset_start',
                asset: asset.id,
                progress: {
                    current: i + 1,
                    total: assets.length
                },
                status: 'Fetching asset metadata'
            });

            // Get the extended asset data
            const { data: extendedData } = await api.get(
                `https://quixel.com/v1/assets/${asset.id}/extended`
            );

            createLog(asset.id, '2-extendedData', asset);


            // Send metadata progress
            sendProgressUpdate(event, {
                type: 'metadata_complete',
                asset: asset.id,
                status: 'Preparing download request'
            });

            // Create and sanitize the download payload
            const downloadPayload = {
                asset: asset.id,
                components: prepareComponents(settings),
                config: prepareConfig(settings, extendedData)
            };

            createLog(asset.id, '3-downloadPayload', downloadPayload);


            const sanitizedPayload = sanitizeComponents(downloadPayload, extendedData);

            createLog(asset.id, '4-sanitizedPayload', sanitizedPayload);

            // Request the download
            const { data: downloadInfo } = await api.post(
                "https://quixel.com/v1/downloads",
                sanitizedPayload
            );

            createLog(asset.id, '5-downloadInfo', downloadInfo);

            const downloadId = downloadInfo.id;
            const finalDownloadUrl = `https://assetdownloads.quixel.com/download/${downloadId}?preserveStructure=true&url=https%3A%2F%2Fquixel.com%2Fv1%2Fdownloads`;

            // Create download directory
            const downloadDir = buildDownloadPath(
                settings.modelSettings.downloadPath,
                asset.path || []
            );

            await mkdir(downloadDir, { recursive: true });

            createLog(asset.id, '6-finalDownloadInfo', {
                finalDownloadUrl,
                responseType: 'stream',
                    maxRedirects: 5,
                    timeout: 30000,
                    headers: {
                ...api.defaults.headers,
                        'Accept': '*/*'
                }
            });

            // Download with progress tracking
            const { data: fileStream, headers } = await api.get(finalDownloadUrl, {
                responseType: 'stream',
                maxRedirects: 5,
                validateStatus: (status: any) => status < 400,
                timeout: 30000,
                headers: {
                    ...api.defaults.headers,
                    'Accept': '*/*'
                }
            });

            const totalSize = parseInt(headers['content-length'] || '0');
            let downloadedBytes = 0;

            fileStream.on('data', (chunk: any) => {
                downloadedBytes += chunk.length;
                const progress = (downloadedBytes / totalSize) * 100;

                sendProgressUpdate(event, {
                    type: 'download_progress',
                    asset: asset.id,
                    progress: {
                        percent: Math.round(progress),
                        bytes: downloadedBytes,
                        total: totalSize
                    },
                    status: 'Downloading'
                });
            });

            const filename = headers['content-disposition']
                ? headers['content-disposition'].split('filename=')[1].replace(/"/g, '')
                : `${asset.id}.zip`;

            const filePath = join(downloadDir, filename);

            // Stream to disk
            await pipeline(fileStream, createWriteStream(filePath));

            // Send completion for this asset
            sendProgressUpdate(event, {
                type: 'asset_complete',
                asset: asset.id,
                path: filePath,
                status: 'Download complete'
            });

            await sleep(1000)
        } catch (error: any) {
            createLog(asset.id, '00-error', error);

            console.error(`Error downloading asset ${asset.id}:`, error);
            sendProgressUpdate(event, {
                type: 'error',
                error: `Failed to download ${asset.id}: ${error.message}`,
                status: 'Error occurred'
            });
        }
    }

    // Send final completion
    sendProgressUpdate(event, {
        type: 'all_complete',
        status: 'All downloads completed'
    });
}