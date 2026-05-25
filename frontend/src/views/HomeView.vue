<template>
  <div class="home">
    <h1>Svi Poslovi</h1>
    <p v-if="loading">Učitavanje...</p>
    <JobsTable
      v-else
      :jobs="availableJobs"
      :current-user-role="currentUser?.role"
      :current-user-id="currentUser?.id"
      @submit-bid="handleSubmitBid"
    />
    <p v-if="!loading && availableJobs.length === 0" class="text-muted">
      Trenutno nema otvorenih poslova.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import JobsTable from '@/components/JobsTable.vue'
import { getJobs, submitBid } from '@/services/api'
import { authService } from '@/services/auth.service'
import type { Job } from '@/types'

const allJobs = ref<Job[]>([])
const currentUser = ref(authService.getCurrentUser())
const loading = ref(true)

const availableJobs = computed(() =>
  allJobs.value.filter(
    job => job.status === 'open' && job.userId !== currentUser.value?.id
  )
)

const loadJobs = async () => {
  const response = await getJobs()
  allJobs.value = response.data
}

onMounted(async () => {
  try {
    await loadJobs()
  } finally {
    loading.value = false
  }
})

const handleSubmitBid = async (payload: {
  jobId: string
  amount: number
  message: string
  resolve: () => void
  reject: (e: unknown) => void
}) => {
  try {
    await submitBid(payload.jobId, {
      amount: payload.amount,
      message: payload.message
    })
    payload.resolve()
    alert('Ponuda je uspešno poslata.')
    await loadJobs()
  } catch (err) {
    payload.reject(err)
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
}
</style>
