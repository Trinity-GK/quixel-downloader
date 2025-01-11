// components/TreeNode.vue
<script setup>
import { ref, computed, watch } from 'vue'
import { useTreeSelection } from '~/composables/useTreeSelection'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  path: {
    type: Array,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

const { selectedPaths } = useTreeSelection()
const checkboxRef = ref(null)
const isExpanded = ref(false) // Start collapsed

const currentPath = computed(() => {
  return [...props.path, props.data.title]
})

const isChecked = computed({
  get: () => {
    const isSelected = selectedPaths.value.some(path =>
        path.length === currentPath.value.length &&
        path.every((item, index) => item === currentPath.value[index])
    )
    return isSelected
  },
  set: (value) => {
    const paths = getAllChildPaths(props.data, props.path)
    if (value) {
      // Add all paths and expand
      isExpanded.value = true // Expand this node
      paths.forEach(path => {
        if (!selectedPaths.value.some(existing =>
            existing.length === path.length &&
            existing.every((item, index) => item === path[index])
        )) {
          selectedPaths.value = [...selectedPaths.value, path]
        }
      })
    } else {
      // Remove all paths
      selectedPaths.value = selectedPaths.value.filter(existing =>
          !paths.some(path =>
              path.length === existing.length &&
              path.every((item, index) => item === existing[index])
          )
      )
    }
  }
})

const hasChildren = computed(() => {
  return props.data.children && props.data.children.length > 0
})

const getAllChildPaths = (node, basePath = []) => {
  const paths = []
  const currentNodePath = [...basePath, node.title]

  paths.push(currentNodePath) // Always include current path

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      paths.push(...getAllChildPaths(child, currentNodePath))
    })
  }

  return paths
}

const someChildrenSelected = computed(() => {
  if (!hasChildren.value) return false

  const childPaths = getAllChildPaths(props.data, props.path)
  return childPaths.some(childPath =>
      selectedPaths.value.some(selectedPath =>
          selectedPath.length === childPath.length &&
          selectedPath.every((item, index) => item === childPath[index])
      )
  )
})

const allChildrenSelected = computed(() => {
  if (!hasChildren.value) return false

  const childPaths = getAllChildPaths(props.data, props.path)
  return childPaths.every(childPath =>
      selectedPaths.value.some(selectedPath =>
          selectedPath.length === childPath.length &&
          selectedPath.every((item, index) => item === childPath[index])
      )
  )
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Watch for indeterminate state and auto-expand if children are selected
watch([isChecked, someChildrenSelected, allChildrenSelected], ([checked, some, all]) => {
  if (checkboxRef.value && hasChildren.value) {
    checkboxRef.value.indeterminate = !all && some
  }

  // Auto-expand if this node or any children are selected
  if (checked || some) {
    isExpanded.value = true
  }
}, { immediate: true })

onMounted(() => {
  if(props.level === 0 && isExpanded.value === false) toggleExpand()
})
</script>

<template>
  <div :class="{ 'ml-4': level > 0 }">
    <div class="flex items-center py-1">
      <!-- Toggle button -->
      <button
          v-if="hasChildren"
          @click="toggleExpand"
          class="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-100 rounded"
          type="button"
      >
        <span
            class="transform transition-transform inline-block"
            :class="{ 'rotate-90': isExpanded }"
            style="font-size: 26px; margin-bottom: 8px"
        >
          ›
        </span>
      </button>
      <span v-else class="w-4 mr-1"></span>

      <input
          type="checkbox"
          v-model="isChecked"
          ref="checkboxRef"
          class="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span
          :class="{ 'font-semibold': hasChildren }"
          class="select-none cursor-pointer"
          @click="toggleExpand"
      >
        {{ data.title }}
      </span>
    </div>

    <div
        v-if="hasChildren"
        class="border-l ml-2 pl-2 overflow-hidden transition-all duration-200"
        v-show="isExpanded"
    >
      <TreeNode
          v-for="child in data.children"
          :key="child.title"
          :data="child"
          :path="currentPath"
          :level="level + 1"
      />
    </div>
  </div>
</template>

<style scoped>
input[type="checkbox"] {
  cursor: pointer;
}

input[type="checkbox"]:indeterminate {
  background-color: #4f46e5;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10h8'/%3e%3c/svg%3e");
}
</style>