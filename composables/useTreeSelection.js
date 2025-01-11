// composables/useTreeSelection.js
import { ref, provide, inject } from 'vue';
import { useCookie } from '#app';
import { useBearerToken } from '~/composables/useBearerToken.js';

const TREE_SELECTION_KEY = Symbol('tree-selection');

function validateSelectedPaths(treeData, selectedPaths) {
    // Helper function to get object at path
    function getObjectAtPath(obj, path) {
        return path.reduce((current, key) => current && current[key], obj);
    }

    // Helper function to check if all children of a path are selected
    function hasAllChildrenSelected(path) {
        const nodeAtPath = getObjectAtPath(treeData, path);
        if (!nodeAtPath) return true;

        const childKeys = Object.keys(nodeAtPath);
        if (childKeys.length === 0) return true;

        return childKeys.every(key => {
            const childPath = [...path, key];
            return selectedPaths.some((selectedPath) =>
                JSON.stringify(selectedPath) === JSON.stringify(childPath)
            );
        });
    }

    // Return paths that either have all children selected or are leaf nodes
    return selectedPaths.filter((currentPath) => {
        const nodeAtPath = getObjectAtPath(treeData, currentPath);
        if (!nodeAtPath) return false;  // Path doesn't exist in tree

        // If it's a leaf node (no children) or all children are selected, keep it
        return Object.keys(nodeAtPath).length === 0 || hasAllChildrenSelected(currentPath);
    });
}


export function createTreeSelection() {
    const treeDataCookie = useCookie('treeData');
    const selectedPathsCookie = useCookie('selectedPaths');
    const { bearerToken } = useBearerToken();

    // Safely parse cookies, fallback to default values
    const treeData = ref(
        safeParseCookie(treeDataCookie.value, [])
    );
    const selectedPaths = ref(
        safeParseCookie(selectedPathsCookie.value, [])
    );

    console.log('selectedPaths', selectedPaths)

    const fetchTreeData = async () => {
        if (!treeData.value.length) {
            try {
                const response = await $fetch('/api/tree', {
                    method: 'POST',
                    body: { bearerToken: bearerToken.value },
                });

                if (response.success) {
                    treeData.value = Array.isArray(response.data.acquiredTree)
                        ? transformArrayToTree(response.data.acquiredTree)
                        : transformToTreeFormat(response.data.acquiredTree);

                    treeDataCookie.value = JSON.stringify(treeData.value);
                } else {
                    throw new Error(response.error);
                }
            } catch (error) {
                console.error('Failed to fetch tree data:', error.message);
            }
        }
    };

    const transformToTreeFormat = (data) =>
        Object.entries(data).map(([key, value]) => ({
            title: key,
            children: value && typeof value === 'object' ? transformToTreeFormat(value) : [],
        }));

    const transformArrayToTree = (data) =>
        data.map((item) => ({
            ...item,
            children: item.children || [],
        }));

    const selectPath = (path) => {
        if (!selectedPaths.value.some((item) =>
            item.length === path.length &&
            item.every((p, i) => p === path[i])
        )) {
            selectedPaths.value = [...selectedPaths.value, path];
            selectedPathsCookie.value = JSON.stringify(selectedPaths.value);
        }
    };

    const savePath = (path) => {

        const filteredPath = validateSelectedPaths(treeDataCookie.value, path.value)
        selectedPathsCookie.value = JSON.stringify(path.value);
    }

    const deselectPath = (path) => {
        selectedPaths.value = selectedPaths.value.filter((item) =>
            !(item.length === path.length && item.every((p, i) => p === path[i]))
        );
        selectedPathsCookie.value = JSON.stringify(selectedPaths.value);
    };

    const state = {
        treeData,
        selectedPaths,
        fetchTreeData,
        selectPath,
        deselectPath,
        savePath
    };

    provide(TREE_SELECTION_KEY, state);
    return state;
}

export function useTreeSelection() {
    const state = inject(TREE_SELECTION_KEY);
    if (!state) {
        throw new Error('useTreeSelection must be used within a component that has called createTreeSelection');
    }
    return state;
}

// Utility function to safely parse cookies
const safeParseCookie = (cookieValue, fallback) => {
    try {
        return cookieValue ? cookieValue : fallback;
    } catch (error) {
        return fallback;
    }
};