<template>
  <UApp :toaster="appConfig.toaster">
    <UNavigationMenu :items="items" class="w-full justify-center" />

    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
const items = ref([
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/'
  },
  {
    label: 'Settings',
    icon: 'i-lucide-cog',
    to: '/settings'
  },
  {
    label: 'Selection',
    icon: 'i-lucide-list-tree',
    to: '/selection'
  },
  {
    label: 'Download',
    icon: 'i-lucide-file-down',
    to: '/download'
  }
])
const appConfig = useAppConfig()
</script>
