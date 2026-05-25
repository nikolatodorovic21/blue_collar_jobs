<template>
  <div class="home">
    <h1>Svi Poslovi</h1>
    <JobsTable
      :jobs="availableJobs"
      :current-user-role="currentUser?.role"
      :current-user-id="currentUser?.id"
      @take-job="handleTakeJob"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import JobsTable from '@/components/JobsTable.vue'
import { getJobs, takeJob } from '@/services/api'
import { authService } from '@/services/auth.service'

const allJobs = ref<any[]>([])
const currentUser = ref(authService.getCurrentUser())

const availableJobs = computed(() => {
  return allJobs.value.filter(job =>
    !job.taken && job.userId !== currentUser.value?.id
  )
})

onMounted(async () => {
  const response = await getJobs()
  allJobs.value = response.data
})

const handleTakeJob = async (jobId: string) => {
  try {
    if (!currentUser.value?.id) throw new Error('Niste prijavljeni')

    await takeJob(jobId, currentUser.value.id, currentUser.value.role)
    allJobs.value = allJobs.value.map(job =>
      job.id === jobId
        ? { ...job, taken: true, userId: currentUser.value?.id }
        : job
    )
  } catch (error) {
    console.error('Greška pri preuzimanju:', error)
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
}
</style>