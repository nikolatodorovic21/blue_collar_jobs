<template>
  <div class="jobs-view">
    <p v-if="loading">Učitavanje...</p>

    <template v-else-if="currentUser?.role === 'worker'">
      <h1>Moje ponude</h1>
      <p v-if="myBids.length === 0" class="text-muted">Još uvek niste poslali nijednu ponudu.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Posao</th>
            <th>Lokacija</th>
            <th>Iznos</th>
            <th>Poruka</th>
            <th>Status ponude</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bid in myBids" :key="bid.id">
            <td>{{ bidJob(bid)?.type || '—' }}</td>
            <td>{{ bidJob(bid)?.location || '—' }}</td>
            <td>{{ bid.amount }} RSD</td>
            <td>{{ bid.message || '—' }}</td>
            <td>
              <span :class="bidBadge(bid.status)">{{ bidStatusLabel(bid.status) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else-if="currentUser?.role === 'client'">
      <h1>Moji poslovi i ponude</h1>
      <p v-if="myJobs.length === 0" class="text-muted">Niste još postavili nijedan posao.</p>
      <JobsTable
        v-else
        :jobs="myJobs"
        :current-user-role="currentUser.role"
        :current-user-id="currentUser.id"
        :show-bids-link="true"
        @view-bids="openBids"
      />
    </template>

    <p v-else class="text-muted">Niste prijavljeni.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JobsTable from '@/components/JobsTable.vue'
import { getJobs, getMyBids } from '@/services/api'
import { authService } from '@/services/auth.service'
import type { Job, Bid, BidStatus } from '@/types'

const router = useRouter()
const currentUser = ref(authService.getCurrentUser())
const allJobs = ref<Job[]>([])
const myBids = ref<Bid[]>([])
const loading = ref(true)

const myJobs = computed(() =>
  allJobs.value.filter(job => job.userId === currentUser.value?.id)
)

const bidJob = (bid: Bid) =>
  typeof bid.jobId === 'object' ? bid.jobId : null

const bidStatusLabel = (s: BidStatus) =>
  ({ pending: 'Na čekanju', accepted: 'Prihvaćena', rejected: 'Odbijena' }[s])

const bidBadge = (s: BidStatus) => {
  const base = 'badge '
  if (s === 'accepted') return base + 'bg-success'
  if (s === 'rejected') return base + 'bg-danger'
  return base + 'bg-warning text-dark'
}

const openBids = (jobId: string) => {
  router.push(`/jobs/${jobId}/bids`)
}

onMounted(async () => {
  try {
    if (currentUser.value?.role === 'worker' && currentUser.value.id) {
      const response = await getMyBids()
      myBids.value = response.data
    } else if (currentUser.value?.role === 'client') {
      const response = await getJobs()
      allJobs.value = response.data
    }
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
.badge {
  padding: 5px 10px;
  border-radius: 4px;
}
</style>
