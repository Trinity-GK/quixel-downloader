<script setup>
import { ref } from 'vue';
import { useBearerToken } from '~/composables/useBearerToken';
import { useRouter } from 'vue-router';
import {useAcquiredData} from "~/composables/useAcquiredData.js";

const router = useRouter();
const { bearerToken, validateToken } = useBearerToken();
const { fetchAcquiredData } = useAcquiredData();
const message = ref('');
const messageType = ref('info');

const handleValidate = async () => {
  const result = await validateToken();
  const acquiredData = await fetchAcquiredData()

  console.log('validateToken', result)
  console.log('acquiredData', acquiredData)

  message.value = result.message;
  messageType.value = !result.success ? 'error' : 'success';

  if (result.success) {
    router.push('/settings');
  } else {
    message.value = result.message;
  }
};
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6 p-4">
    <h1 class="text-3xl font-bold">Quixel Asset Downloader</h1>

    <div class="flex items-center gap-4">
      <UTextarea
          v-model="bearerToken"
          placeholder="Enter your Bearer Token"
          class="flex-grow"
      />
    </div>
    <div class="flex items-center gap-4">
      <UButton block @click="handleValidate">Validate</UButton>
    </div>
    <div class="flex items-center gap-4">
      <p>
        Please enter a valid Bearer token, login to qyxel.com and press F12.
        Then click on Account Settings and check the Network Tab > Fetch/XHR.
        Click on eligible on the left side menu.
        Under Authorization: select the string starting from "ey" all the way down and paste it in the box above
      </p>
    </div>


    <UAlert
        v-if="message"
        :color="messageType"
        :description="message"
    >
    </UAlert>
  </div>
</template>
