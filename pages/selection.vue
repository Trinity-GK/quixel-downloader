<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createTreeSelection } from '~/composables/useTreeSelection';
import TreeNode from '~/components/TreeNode.vue';

const router = useRouter();
const { treeData, fetchTreeData, selectedPaths, savePath } = createTreeSelection();

onMounted(async () => {
  await fetchTreeData();
  console.log(selectedPaths.value)
});

const saveTreeData = async () => {
  console.log(selectedPaths.value)
  if (selectedPaths.value.length) {
    savePath(selectedPaths);
    router.push('/download')
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto space-y-8 p-4">
    <h1 class="text-2xl font-bold">Select the assets you want to download</h1>

    <div v-if="treeData.length" class="border rounded p-4">
      <TreeNode
          :data="{ title: 'Root', children: treeData }"
          :path="[]"
          :level="0"
      />
    </div>

    <div v-if="selectedPaths.length" class="flex items-center gap-4">
        <UButton block @click="saveTreeData">Save & Continue</UButton>
    </div>

  </div>
</template>