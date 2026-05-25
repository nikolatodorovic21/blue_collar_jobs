<template>
  <div class="jobs-view">
    <h1>Moji Poslovi</h1>
    <p v-if="loading">Učitavanje...</p>
    <JobsTable 
      v-else-if="myJobs.length > 0"
      :jobs="myJobs" 
      :show-take-button="false" 
    />
    <p v-else>Nema preuzetih poslova.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import JobsTable from '@/components/JobsTable.vue'
import { getJobs } from '@/services/api'
import { authService } from '@/services/auth.service'

interface Job {
  id: string
  type: string
  price: number
  location: string
  description: string
  taken: boolean
  userId: string | null
}

const allJobs = ref<Job[]>([])
const currentUser = ref(authService.getCurrentUser())
const loading = ref(true)

const myJobs = computed(() => {
  if (!currentUser.value?.id) return []
  return allJobs.value.filter(job => 
    job.taken && job.userId === currentUser.value?.id
  )
})

onMounted(async () => {
  try {
    const response = await getJobs()
    allJobs.value = response.data
  } catch (error) {
    console.error('Greška pri učitavanju:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.jobs-view {
  padding: 20px;
}
</style>