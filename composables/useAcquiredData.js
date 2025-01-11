import { ref } from 'vue';
import { useBearerToken } from './useBearerToken';

export function useAcquiredData() {
    const acquiredData = ref(null);
    const { bearerToken } = useBearerToken();

    // Use onMounted to interact with localStorage only on client-side
    const initializeFromStorage = () => {
        if (import.meta.client) {
            try {
                const storedData = localStorage.getItem('acquiredData');
                if (storedData) {
                    acquiredData.value = JSON.parse(storedData);
                }
            } catch (error) {
                console.error('Error reading from localStorage:', error);
            }
        }
    };

    const fetchAcquiredData = async () => {
        if (!bearerToken.value) {
            console.error('Bearer token is missing.');
            return;
        }

        if (!acquiredData.value) {
            try {
                const response = await $fetch('/api/acquired', {
                    method: 'POST',
                    body: { bearerToken: bearerToken.value },
                });

                if (response.success) {
                    acquiredData.value = response.data;

                    // Only attempt localStorage on client-side
                    if (import.meta.client) {
                        try {
                            console.log('Trying to save acquiredData')
                            localStorage.setItem('acquiredData', JSON.stringify(response.data));
                        } catch (storageError) {
                            if (storageError.name === 'QuotaExceededError') {
                                console.error('Storage quota exceeded. Clearing localStorage and trying again...');
                                localStorage.clear();
                                localStorage.setItem('acquiredData', JSON.stringify(response.data));
                            } else {
                                console.error('Error saving to localStorage:', storageError);
                            }
                        }
                    }
                } else {
                    throw new Error(response.error);
                }
            } catch (error) {
                console.error('Error fetching acquired data:', error.message);
            }
        }
    };

    const clearAcquiredData = () => {
        acquiredData.value = null;
        if (import.meta.client) {
            localStorage.removeItem('acquiredData');
        }
    };

    // Use a lifecycle hook to initialize storage
    if (import.meta.client) {
        onMounted(() => {
            initializeFromStorage();
        });
    }

    return {
        acquiredData,
        fetchAcquiredData,
        clearAcquiredData
    };
}