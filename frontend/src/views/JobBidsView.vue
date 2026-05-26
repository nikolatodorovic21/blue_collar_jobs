<template>
  <div class="job-bids-view">
    <p v-if="loading">Učitavanje...</p>

    <template v-else-if="job">
      <h1>Ponude na posao: {{ jobTypeLabel(job.type) }}</h1>
      <p class="text-muted">
        {{ job.location }} — orijentaciona cena {{ job.price }} RSD
        <span :class="jobStatusBadge(job.status)" style="margin-left: 8px">
          {{ jobStatusLabel(job.status) }}
        </span>
      </p>
      <p>{{ job.description }}</p>

      <p v-if="job.cancelledAt" class="text-danger">
        Posao je otkazan{{ job.cancelReason ? `: ${job.cancelReason}` : '' }}.
      </p>

      <div class="d-flex flex-wrap gap-2 mb-3">
        <button
          v-if="canMarkStarted"
          class="btn btn-sm btn-primary"
          :disabled="busy"
          @click="markStarted"
        >
          Označi kao započet
        </button>
        <button
          v-if="canMarkCompleted"
          class="btn btn-sm btn-success"
          :disabled="busy"
          @click="markCompleted"
        >
          Označi kao završen
        </button>
        <button
          v-if="canCancelAssigned"
          class="btn btn-sm btn-outline-danger"
          @click="openCancel"
        >
          Otkaži posao
        </button>
        <button
          v-if="canDispute"
          class="btn btn-sm btn-outline-warning"
          @click="openDispute"
        >
          Prijavi spor
        </button>
        <button
          v-if="canLeaveReview"
          class="btn btn-sm btn-primary"
          @click="openReview"
        >
          Ostavi recenziju
        </button>
      </div>

      <p v-if="!isOwner && !isAssignedWorker" class="text-danger">
        Niste vlasnik posla niti dodeljeni majstor — možete videti svoju ponudu ali ne i radnje vlasnika.
      </p>

      <table v-if="bids.length > 0" class="table">
        <thead>
          <tr>
            <th>Majstor</th>
            <th>Iznos</th>
            <th>Datum dolaska</th>
            <th>Trajanje</th>
            <th>Poruka</th>
            <th>Status</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bid in bids" :key="bid.id">
            <td>
              <router-link
                v-if="workerIdOf(bid)"
                :to="`/users/${workerIdOf(bid)}`"
              >
                {{ workerName(bid) }}
              </router-link>
              <span v-else>{{ workerName(bid) }}</span>
              <span v-if="isEdited(bid.createdAt, bid.updatedAt)" class="text-muted ms-1">(uređeno)</span>
            </td>
            <td>{{ bid.amount }} RSD</td>
            <td>{{ formatDate(bid.proposedDate) }}</td>
            <td>{{ formatDuration(bid.estimatedDuration) }}</td>
            <td>{{ bid.message || '—' }}</td>
            <td>
              <span :class="bidStatusBadge(bid.status)">{{ bidStatusLabel(bid.status) }}</span>
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

      <StatusReasonModal
        v-if="reasonModal"
        :title="reasonModal.title"
        :placeholder="reasonModal.placeholder"
        :confirm-label="reasonModal.confirmLabel"
        :min-length="1"
        :submitting="busy"
        :error="reasonError"
        @confirm="submitReason"
        @cancel="closeReasonModal"
      />

      <ReviewModal
        v-if="reviewModalOpen"
        :job-type="jobTypeLabel(job.type)"
        :reviewee-name="otherPartyName"
        :submitting="reviewSubmitting"
        :error="reviewError"
        @confirm="submitReview"
        @cancel="closeReviewModal"
      />
    </template>

    <p v-else class="text-danger">Posao nije pronađen.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getJobById,
  getBidsForJob,
  acceptBid,
  updateJobStatus,
  createReview,
  listReviews
} from '@/services/api'
import { authService } from '@/services/auth.service'
import type { Bid, Job, JobStatus, Review } from '@/types'
import { formatDate, formatDuration, isEdited } from '@/utils/format'
import {
  bidStatusBadge,
  bidStatusLabel,
  jobStatusBadge,
  jobStatusLabel
} from '@/utils/statusLabels'
import StatusReasonModal from '@/components/StatusReasonModal.vue'
import ReviewModal from '@/components/ReviewModal.vue'
import { jobTypeLabel } from '@/constants/jobTypes'

const route = useRoute()
const currentUser = ref(authService.getCurrentUser())
const job = ref<Job | null>(null)
const bids = ref<Bid[]>([])
const loading = ref(true)
const accepting = ref<string | null>(null)
const busy = ref(false)

const jobId = computed(() => route.params.id as string)
const isOwner = computed(() => !!job.value && job.value.userId === currentUser.value?.id)
const isAssignedWorker = computed(
  () =>
    !!job.value &&
    !!job.value.assignedWorkerId &&
    job.value.assignedWorkerId === currentUser.value?.id
)

const workerName = (bid: Bid) =>
  typeof bid.workerId === 'object' ? bid.workerId.name : bid.workerId

const workerIdOf = (bid: Bid): string | null =>
  typeof bid.workerId === 'object' ? bid.workerId.id : bid.workerId || null

const canAccept = (bid: Bid) =>
  isOwner.value && bid.status === 'pending' && job.value?.status === 'open'

const canMarkStarted = computed(
  () => isAssignedWorker.value && job.value?.status === 'assigned'
)
const canMarkCompleted = computed(
  () => isOwner.value && job.value?.status === 'in_progress'
)
const canCancelAssigned = computed(
  () =>
    (isOwner.value || isAssignedWorker.value) &&
    job.value?.status === 'assigned'
)
const canDispute = computed(
  () =>
    (isOwner.value || isAssignedWorker.value) &&
    job.value?.status === 'in_progress'
)

const otherPartyId = computed<string | null>(() => {
  if (!job.value || !currentUser.value) return null
  if (isOwner.value) return job.value.assignedWorkerId ?? null
  if (isAssignedWorker.value) return job.value.userId ?? null
  return null
})

const otherPartyName = computed(() => {
  if (!job.value) return ''
  if (isOwner.value) {
    const winning = bids.value.find((b) => b.status === 'accepted')
    return winning ? workerName(winning) : 'Majstor'
  }
  return 'Klijent'
})

const reviewsAboutOtherParty = ref<Review[]>([])
const reviewedByMe = computed(() => {
  if (!currentUser.value || !job.value) return false
  return reviewsAboutOtherParty.value.some((r) => {
    const reviewerId = typeof r.reviewerId === 'object' ? r.reviewerId.id : r.reviewerId
    const reviewJobId = typeof r.jobId === 'object' ? r.jobId.id : r.jobId
    return reviewerId === currentUser.value!.id && reviewJobId === job.value!.id
  })
})

const canLeaveReview = computed(
  () =>
    !!currentUser.value &&
    (isOwner.value || isAssignedWorker.value) &&
    job.value?.status === 'completed' &&
    !reviewedByMe.value
)

const load = async () => {
  const [jobResp, bidsResp] = await Promise.all([
    getJobById(jobId.value),
    getBidsForJob(jobId.value)
  ])
  job.value = jobResp.data
  bids.value = bidsResp.data

  reviewsAboutOtherParty.value = []
  if (job.value?.status === 'completed' && otherPartyId.value) {
    try {
      const res = await listReviews(otherPartyId.value)
      reviewsAboutOtherParty.value = res.data
    } catch (err) {
      console.error('Greška pri učitavanju recenzija:', err)
    }
  }
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

const transition = async (status: JobStatus, reason?: string) => {
  if (!job.value) return
  busy.value = true
  try {
    await updateJobStatus(job.value.id, { status, reason })
    await load()
    closeReasonModal()
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Greška pri promeni statusa.'
    if (reasonModal.value) {
      reasonError.value = msg
    } else {
      alert(msg)
    }
  } finally {
    busy.value = false
  }
}

const markStarted = () => {
  if (!confirm('Označiti posao kao započet?')) return
  transition('in_progress')
}

const markCompleted = () => {
  if (!confirm('Označiti posao kao završen?')) return
  transition('completed')
}

// Reason modal state
interface ReasonConfig {
  title: string
  placeholder: string
  confirmLabel: string
  targetStatus: JobStatus
}
const reasonModal = ref<ReasonConfig | null>(null)
const reasonError = ref('')

const openCancel = () => {
  reasonModal.value = {
    title: 'Otkaži posao',
    placeholder: 'Zašto otkazujete posao?',
    confirmLabel: 'Otkaži posao',
    targetStatus: 'cancelled'
  }
  reasonError.value = ''
}

const openDispute = () => {
  reasonModal.value = {
    title: 'Prijavi spor',
    placeholder: 'Opišite spor — admin će ga pregledati',
    confirmLabel: 'Prijavi spor',
    targetStatus: 'disputed'
  }
  reasonError.value = ''
}

const closeReasonModal = () => {
  reasonModal.value = null
  reasonError.value = ''
}

const submitReason = (reason: string) => {
  if (!reasonModal.value) return
  transition(reasonModal.value.targetStatus, reason)
}

// Review modal
const reviewModalOpen = ref(false)
const reviewSubmitting = ref(false)
const reviewError = ref('')

const openReview = () => {
  reviewError.value = ''
  reviewModalOpen.value = true
}

const closeReviewModal = () => {
  reviewModalOpen.value = false
  reviewSubmitting.value = false
}

const submitReview = async (payload: { rating: number; comment: string }) => {
  if (!job.value) return
  reviewSubmitting.value = true
  reviewError.value = ''
  try {
    await createReview({
      jobId: job.value.id,
      rating: payload.rating,
      comment: payload.comment || undefined
    })
    await load()
    closeReviewModal()
  } catch (err: any) {
    reviewError.value = err?.response?.data?.message || 'Greška pri slanju recenzije.'
    reviewSubmitting.value = false
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
