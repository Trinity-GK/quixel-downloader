<script setup>
import { ref } from 'vue';
import { useToast } from '#imports';

const toast = useToast();
const selectedPaths = ref(import.meta.client ? JSON.parse(localStorage.getItem('selectedPaths') || '[]') : []);
const isProcessingSelection = ref(false);
const isProcessing = ref(false);
const processedResults = ref(null);
const downloadStarted = ref(false);
const eventData = ref({})

const sleep = async (time) => {
  return new Promise( resolve => setTimeout(resolve, time) );
}

const processDownloads = async () => {
  if (!selectedPaths.value.length) {
    toast.add({
      title: 'Error',
      description: 'Please select at least one category',
      color: 'red'
    });
    return;
  }

  try {
    isProcessingSelection.value = true;
    processedResults.value = null;
    downloadStarted.value = false;

    // Get acquiredData from localStorage
    let acquiredData = [];
    if (import.meta.client) {
      try {
        const storedData = localStorage.getItem('acquiredData');
        if (storedData) {
          acquiredData = JSON.parse(storedData);
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        throw new Error('Failed to read acquired data');
      }
    }

    const response = await $fetch('/api/process-downloads', {
      method: 'POST',
      body: {
        acquiredData,
        treeData: JSON.parse(localStorage.getItem('treeData') || {}),
        selectedPaths: selectedPaths.value
      }
    });

    if (response.success) {
      processedResults.value = response;
      toast.add({
        title: 'Success',
        description: `Found ${response.totalAssets} assets to download`
      });

    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'red'
    });
  } finally {
    isProcessingSelection.value = false;
  }
};

const startDownloads = () => {
  if(import.meta.client) {
    if (!processedResults.value || !processedResults.value.assets?.length) {
      toast.add({
        title: 'Error',
        description: 'Please fetch items first',
        color: 'red'
      });
      return;
    }

    isProcessing.value = true;
    downloadStarted.value = true;
    let lastPercent = 0;  // Track last percentage

    fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assets: processedResults.value.assets
      })
    }).then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      reader.read().then(function processText({done, value}) {
        if (done) {
          isProcessing.value = false;
          return;
        }

        const chunk = decoder.decode(value);
        const messages = chunk.split('\n\n');

        messages.forEach(message => {
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(5));

              // Only update if percent change is > 3% or it's a non-progress event
              if (data.type !== 'download_progress' ||
                  Math.abs(data.progress?.percent - lastPercent) > 3) {
                eventData.value = data;
                if (data.progress?.percent !== undefined) {
                  lastPercent = data.progress.percent;
                }
              }

              if (data.type === 'all_complete' || data.type === 'error') {
                isProcessing.value = false;
              }
            } catch (error) {}
          }
        });

        return reader.read().then(processText);
      });
    }).catch(error => {
      console.error(error);
      toast.add({
        title: 'Error',
        description: error.message,
        color: 'red'
      });
      isProcessing.value = false;
      downloadStarted.value = false;
    });
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 space-y-6">
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Download Assets</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div v-if="selectedPaths.length === 0" class="text-amber-600">
          No categories selected. Please select categories in the tree view.
        </div>

        <div v-else>
          <div class="mb-4">
            <h3 class="font-medium mb-2">Selected Categories:</h3>
            <ul class="list-disc list-inside">
              <li v-for="path in selectedPaths" :key="path.join('-')" class="text-sm">
                {{ path.join(' > ') }}
              </li>
            </ul>
          </div>

          <div v-if="processedResults" class="mb-4 p-4 rounded-lg">
            <p class="font-medium text-lg">
              Ready to download {{ processedResults.totalAssets }} assets
            </p>
            <p class="text-sm mt-1">
              Found across {{ selectedPaths.length }} selected categories
            </p>
          </div>

          <div class="flex gap-4">
            <UButton
                @click="processDownloads"
                :loading="isProcessingSelection"
                :disabled="isProcessingSelection"
                color="primary"
                block
            >
              {{ isProcessing ? 'Processing...' : processedResults ? 'Fetch Download Info' : 'Process Selection' }}
            </UButton>
          </div>
          <div class="flex gap-4">
            <UButton
                @click="startDownloads"
                :loading="isProcessing"
                :disabled="isProcessing || !processedResults"
                color="primary"
                variant="soft"
                block
            >
              Start Download
            </UButton>
          </div>

          <!-- Download Progress Component -->
          <DownloadProgress
              v-if="processedResults"
              :assets="processedResults.assets"
              :eventData="eventData"
              class="mt-6"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>