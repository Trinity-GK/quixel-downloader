<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  assets: {
    type: Array,
    required: true
  },
  eventData: {
    type: Object,
    default: null
  }
});

const progress = ref({});
const currentAsset = ref(null);
const completedAssets = ref([]);
const status = ref('Waiting to Start Download...');
const error = ref(null);
const isComplete = ref(false);

// No need for setupEventSource as the parent handles it

// Handle incoming events from parent


// Watch for event data changes
watch(() => props.eventData, (data) => {
  if (!data) return;

  switch (data.type) {
    case 'asset_start':
      currentAsset.value = data.asset;
      status.value = `Processing ${data.asset} (${data.progress.current}/${data.progress.total})`;
      progress.value = {
        [data.asset]: 0
      };
      break;

    case 'download_progress':
      progress.value = {
        [data.asset]: data.progress.percent
      };

      break;

    case 'asset_complete':
      completedAssets.value.push({
        id: data.asset,
        percent: 100
      });
      currentAsset.value = null;
      progress.value = {};
      break;

    case 'all_complete':
      isComplete.value = true;
      currentAsset.value = null;
      status.value = 'All downloads completed';
      break;

    case 'error':
      error.value = data.error;
      break;
  }
}, { immediate: true });
</script>

<template>
  <div class="space-y-4">
    <UAlert v-if="error" color="red" variant="solid">
      <div class="font-bold">Error</div>
      <div>{{ error }}</div>
    </UAlert>

    <UCard v-else>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">{{ status }}</h3>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Current download -->
        <template v-if="currentAsset && progress[currentAsset]">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span>{{ currentAsset }}</span>
              <span>{{ Math.round(progress[currentAsset]) }}%</span>
            </div>
            <UProgress
                :value="progress[currentAsset]"
                :color="progress[currentAsset] === 100 ? 'green' : 'primary'"
            />
          </div>
        </template>

        <!-- Completed downloads -->
        <template v-if="completedAssets.length > 0">
          <div class="mt-4 pt-4 border-t">
            <h4 class="text-sm font-medium mb-3">Completed</h4>
            <div class="space-y-2">
              <div
                  v-for="asset in completedAssets"
                  :key="asset.id"
                  class="flex justify-between text-sm text-green-600"
              >
                <span>{{ asset.id }}</span>
                <span>✓ Complete</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </UCard>
  </div>
</template>