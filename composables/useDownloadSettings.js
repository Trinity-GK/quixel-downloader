// composables/useDownloadSettings.js
import { ref, watch } from 'vue';
import { useCookie, useToast } from '#imports';

export function useDownloadSettings() {
    const defaultSettings = {
        megascansFormat: 'FBX',
        metahumansFormat: 'UAsset',
        resolution: '8192x8192',  // Default to 8K
        downloadPath: '',         // Default empty download path
        lodSettings: {
            lod0: true,
            lod1: true,
            lod2: true,
            lod3: true,
            lod4: true,
            lod5: true,
            lod6: true,
            lod7: true,
            lod8: true,
        },
        downloadAllLODsFor3DPlants: true,
        extraSettings: {
            highpolySource: false,
            sourceZTool: false,
            brushes: false,
        }
    };

    const defaultTextureSettings = {
        albedo: { enabled: true, format: 'JPEG' },
        cavity: { enabled: false, format: 'JPEG' },
        curvature: { enabled: false, format: 'JPEG' },
        gloss: { enabled: false, format: 'JPEG' },
        normal: { enabled: true, format: 'JPEG' },
        normalBump: { enabled: false, format: 'JPEG' },
        normalObject: { enabled: false, format: 'JPEG' },
        displacement: { enabled: true, format: 'JPEG+EXR' },
        bump: { enabled: false, format: 'JPEG' },
        ao: { enabled: true, format: 'JPEG' },
        metalness: { enabled: true, format: 'JPEG' },
        diffuse: { enabled: false, format: 'JPEG' },
        roughness: { enabled: true, format: 'JPEG' },
        specular: { enabled: false, format: 'JPEG' },
        fuzz: { enabled: true, format: 'JPEG' },
        translucency: { enabled: true, format: 'JPEG' },
        thickness: { enabled: false, format: 'JPEG' },
        opacity: { enabled: true, format: 'JPEG' },
        brush: { enabled: true, format: 'JPEG' },
        mask: { enabled: false, format: 'JPEG' },
        transmission: { enabled: true, format: 'JPEG' },
    };

    const modelSettingsCookie = useCookie('modelSettings', {
        default: () => defaultSettings,
        watch: true
    });

    const textureSettingsCookie = useCookie('textureSettings', {
        default: () => defaultTextureSettings,
        watch: true
    });

    const uniqueMapsPerLODCookie = useCookie('uniqueMapsPerLOD', {
        default: () => true,
        watch: true
    });

    // Initialize reactive refs
    const modelSettings = ref(modelSettingsCookie.value);
    const textureSettings = ref(textureSettingsCookie.value);
    const uniqueMapsPerLOD = ref(uniqueMapsPerLODCookie.value);

    const toast = useToast();

    // Watch for changes and update cookies
    watch(modelSettings, (newValue) => {
        modelSettingsCookie.value = newValue;
        toast.add({
            title: 'Settings saved',
            description: 'Model settings have been updated',
            timeout: 2000
        });
    }, { deep: true });

    watch(textureSettings, (newValue) => {
        textureSettingsCookie.value = newValue;
        toast.add({
            title: 'Settings saved',
            description: 'Texture settings have been updated',
            timeout: 2000
        });
    }, { deep: true });

    watch(uniqueMapsPerLOD, (newValue) => {
        uniqueMapsPerLODCookie.value = newValue;
        toast.add({
            title: 'Settings saved',
            description: 'LOD map settings have been updated',
            timeout: 2000
        });
    });

    // Select options
    const formatItems = [
        'JPEG',
        'EXR',
        'JPEG+EXR'
    ];

    const megascansItems = [
        'FBX',
        'ABC'
    ];

    const metahumansItems = [
        'UAsset',
        'Source Asset',
        'UAsset + Source Asset'
    ];

    const resolutionItems = [
        '2048x2048',
        '4096x4096',
        '8192x8192'
    ];

    // Reset functions
    const resetModelSettings = () => {
        modelSettings.value = { ...defaultSettings };
    };

    const resetTextureSettings = () => {
        textureSettings.value = { ...defaultTextureSettings };
        uniqueMapsPerLOD.value = true;
    };

    return {
        modelSettings,
        textureSettings,
        uniqueMapsPerLOD,
        formatItems,
        megascansItems,
        metahumansItems,
        resolutionItems,
        resetModelSettings,
        resetTextureSettings
    };
}