# pages/DownloadSettings.vue
<script setup>
import { useDownloadSettings } from '~/composables/useDownloadSettings';
import {useRouter} from "#vue-router";

const router = useRouter();

const downloadSettings = useDownloadSettings();

// Destructure values for easier template access
const {
  modelSettings,
  textureSettings,
  uniqueMapsPerLOD,
  formatItems,
  megascansItems,
  metahumansItems,
  resolutionItems,
  resetModelSettings,
  resetTextureSettings
} = downloadSettings;
</script>

<template>
  <div>
    <div class="max-w-4xl mx-auto p-4 space-y-6">
      <!-- Model Settings Section -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Model settings</h2>
            <UButton
                variant="outline"
                @click="resetModelSettings"
            >
              Reset to Default
            </UButton>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Megascans & MetaHumans Format -->
          <UFormField label="Megascans">
            <USelect
                v-model="modelSettings.megascansFormat"
                :items="megascansItems"
                class="w-48"
            />
          </UFormField>

          <UFormField label="MetaHumans">
            <USelect
                v-model="modelSettings.metahumansFormat"
                :items="metahumansItems"
                class="w-48"
            />
          </UFormField>

          <!-- Resolution & Download Path -->
          <UFormField label="Resolution">
            <USelect
                v-model="modelSettings.resolution"
                :items="resolutionItems"
                class="w-48"
            />
          </UFormField>

          <UFormField label="Download Folder">
            <UInput
                v-model="modelSettings.downloadPath"
                placeholder="Enter path to download folder"
                class="w-full"
            />
          </UFormField>

          <USeparator class="my-4" />

          <!-- LOD Settings -->
          <div class="space-y-4">
            <h3 class="font-medium">LODs</h3>
            <div class="space-y-2">
              <div v-for="(value, key) in modelSettings.lodSettings" :key="key">
                <UCheckbox
                    v-model="modelSettings.lodSettings[key]"
                    :label="'LOD ' + key.replace('lod', '')"
                />
              </div>
            </div>

            <UCheckbox
                v-model="modelSettings.downloadAllLODsFor3DPlants"
                label="Download all LODs for 3D Plants"
            />
          </div>

          <USeparator class="my-4" />

          <!-- Extra Settings -->
          <div class="space-y-4">
            <h3 class="font-medium">Extras</h3>
            <div class="space-y-2">
              <div v-for="(value, key) in modelSettings.extraSettings" :key="key">
                <UCheckbox
                    v-model="modelSettings.extraSettings[key]"
                    :label="key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())"
                />
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <p class="text-sm text-gray-500">
            All settings are preferred options and will be downloaded when available.
          </p>
        </template>
      </UCard>

      <!-- Texture Settings Section -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Texture settings</h2>
            <UButton
                variant="outline"
                @click="resetTextureSettings"
            >
              Reset to Default
            </UButton>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="(settings, texture) in textureSettings" :key="texture">
            <div class="flex justify-between items-center gap-4">
              <UCheckbox
                  v-model="textureSettings[texture].enabled"
                  :label="texture.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())"
              />

              <USelect
                  v-model="textureSettings[texture].format"
                  :items="formatItems"
                  :disabled="!settings.enabled"
                  class="w-32"
              />
            </div>
          </div>

          <USeparator class="my-4" />

          <UCheckbox
              v-model="uniqueMapsPerLOD"
              label="Unique maps per LOD when available"
          />
        </div>

        <template #footer>
          <p class="text-sm text-gray-500">
            All settings are preferred options and will be downloaded when available.
          </p>
        </template>
      </UCard>
    </div>
    <div class="max-w-4xl mx-auto p-4 space-y-6">
      <UButton block @click="() => router.push('/selection')">Go to Selection</UButton>

    </div>
  </div>
</template>