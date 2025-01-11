import { ref, computed } from 'vue';

export function useBearerToken() {
    // Create `useCookie` instances inside composable scope
    const bearerTokenCookie = useCookie('bearerToken');
    const bearerToken = computed({
        get: () => bearerTokenCookie.value || '',
        set: (value) => {
            bearerTokenCookie.value = value;
        },
    });

    const validateToken = async () => {
        if (!bearerToken.value) {
            return { success: false, message: 'Bearer token is required.' };
        }

        try {
            const response = await $fetch('/api/acquired', {
                method: 'POST',
                body: { bearerToken: bearerToken.value },
            });

            console.log(response);

            if (response.success) {
                return { success: true, message: 'Token validated successfully.' };
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            return { success: false, message: error.message || 'Token validation failed.' };
        }
    };

    return { bearerToken, validateToken };
}
