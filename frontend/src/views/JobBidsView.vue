<template>
  <div class="job-bids-view">
    <p v-if="loading">Učitavanje...</p>

    <template v-else-if="job">
      <h1>Ponude na posao: {{ job.type }}</h1>
      <p class="text-muted">
        {{ job.location }} — orijentaciona cena {{ job.price }} RSD
        <span :class="statusBadge(job.status)" style="margin-left: 8px">
          {{ statusLabel(job.status) }}
        </span>
      </p>
      <p>{{ job.description }}</p>

      <p v-if="!isOwner" class="text-danger">
        Niste vlasnik ovog posla — možete videti ponude ali ne možete ih prihvatiti.
      </p>

      <table v-if="bids.length > 0" class="table">
        <thead>
          <tr>
            <th>Majstor</th>
            <th>Iznos</th>
            <th>Poruka</th>
            <th>Status</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bid in bids" :key="bid.id">
            <td>{{ workerName(bid) }}</td>
            <td>{{ bid.amount }} RSD</td>
            <td>{{ bid.message || '—' }}</td>
            <td>
              <span :class="bidBadge(bid.status)">{{ bidStatusLabel(bid.status) }}</span>
            </td>
            <td>
              <button
                v-if="canAccept(bid)"
                class="btn btn-sm btn-success"
                :disabled="accepting === bid.id"
                @click="accept(bid)"
              >
                {{ accepting === bid.id ? 'Prihvatam...' : 'Prihvati' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-muted">Još uvek nema ponuda na ovaj posao.</p>
    </template>

    <p v-else class="text-danger">Posao nije pronađen.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getJobById, getBidsForJob, acceptBid } from '@/services/api'
import { authService } from '@/services/auth.service'
import type { Job, Bid, JobStatus, BidStatus } from '@/types'

const route = useRoute()
const currentUser = ref(authService.getCurrentUser())
const job = ref<Job | null>(null)
const bids = ref<Bid[]>([])
const loading = ref(true)
const accepting = ref<string | null>(null)

const jobId = computed(() => route.params.id as string)
const isOwner = computed(() => !!job.value && job.value.userId === currentUser.value?.id)

const workerName = (bid: Bid) =>
  typeof bid.workerId === 'object' ? bid.workerId.name : bid.workerId

const statusLabel = (s: JobStatus) =>
  ({ open: 'Otvoren', assigned: 'Dodeljen', completed: 'Završen', closed: 'Zatvoren' }[s])

const statusBadge = (s: JobStatus) => {
  const base = 'badge '
  if (s === 'open') return base + 'bg-warning text-dark'
  if (s === 'assigned') return base + 'bg-success'
  if (s === 'completed') return base + 'bg-secondary'
  return base + 'bg-dark'
}

const bidStatusLabel = (s: BidStatus) =>
  ({ pending: 'Na čekanju', accepted: 'Prihvaćena', rejected: 'Odbijena' }[s])

const bidBadge = (s: BidStatus) => {
  const base = 'badge '
  if (s === 'accepted') return base + 'bg-success'
  if (s === 'rejected') return base + 'bg-danger'
  return base + 'bg-warning text-dark'
}

const canAccept = (bid: Bid) =>
  isOwner.value && bid.status === 'pending' && job.value?.status === 'open'

const load = async () => {
  const [jobResp, bidsResp] = await Promise.all([
    getJobById(jobId.value),
    getBidsForJob(jobId.value)
  ])
  job.value = jobResp.data
  bids.value = bidsResp.data
}

const accept = async (bid: Bid) => {
  if (!currentUser.value) return
  if (!confirm(`Prihvatiti ponudu od ${bid.amount} RSD?`)) return
  accepting.value = bid.id
  try {
    await acceptBid(bid.id)
    await load()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Greška pri prihvatanju ponude.')
  } finally {
    accepting.value = null
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.job-bids-view {
  padding: 20px;
}
.badge {
  padding: 5px 10px;
  border-radius: 4px;
}
</style>
