<template>
  <div class="jobs-table">
    <table class="table">
      <thead>
        <tr>
          <th>Vrsta posla</th>
          <th>Cena</th>
          <th>Lokacija</th>
          <th>Status</th>
          <th>Akcija</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="job in jobs" :key="job.id">
          <td>{{ job.type }}</td>
          <td>{{ job.price }} RSD</td>
          <td>{{ job.location }}</td>
          <td>
            <span :class="statusBadgeClass(job.status)">{{ statusLabel(job.status) }}</span>
          </td>
          <td>
            <button
              v-if="canBid(job)"
              @click="openBidModal(job)"
              class="btn btn-sm btn-primary"
            >
              Postavi ponudu
            </button>
            <button
              v-else-if="showBidsLink && job.userId === currentUserId"
              @click="$emit('view-bids', job.id)"
              class="btn btn-sm btn-outline-primary"
            >
              Vidi ponude
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="activeJob" class="bid-modal-backdrop" @click.self="closeBidModal">
      <div class="bid-modal">
        <h5>Postavi ponudu na: {{ activeJob.type }}</h5>
        <p class="text-muted">{{ activeJob.location }} — orijentaciona cena {{ activeJob.price }} RSD</p>
        <form @submit.prevent="submitBidForm">
          <div class="mb-3">
            <label class="form-label">Vaš predlog cene (RSD)</label>
            <input
              v-model.number="bidAmount"
              type="number"
              min="0"
              required
              class="form-control"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Poruka (opciono)</label>
            <textarea v-model="bidMessage" rows="3" class="form-control"></textarea>
          </div>
          <p v-if="bidError" class="text-danger">{{ bidError }}</p>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="closeBidModal">Otkaži</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Šaljem...' : 'Pošalji ponudu' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue'
import type { Job, JobStatus } from '@/types'

export default defineComponent({
  name: 'JobsTable',
  props: {
    jobs: {
      type: Array as PropType<Job[]>,
      required: true
    },
    currentUserRole: {
      type: String,
      default: ''
    },
    currentUserId: {
      type: String,
      default: ''
    },
    showBidsLink: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit-bid', 'view-bids'],
  setup(props, { emit }) {
    const activeJob = ref<Job | null>(null)
    const bidAmount = ref<number | null>(null)
    const bidMessage = ref('')
    const bidError = ref('')
    const submitting = ref(false)

    const canBid = (job: Job) =>
      props.currentUserRole === 'worker' &&
      job.userId !== props.currentUserId &&
      job.status === 'open'

    const statusLabel = (s: JobStatus) =>
      ({ open: 'Otvoren', assigned: 'Dodeljen', completed: 'Završen', closed: 'Zatvoren' }[s])

    const statusBadgeClass = (s: JobStatus) => {
      const base = 'badge '
      if (s === 'open') return base + 'bg-warning text-dark'
      if (s === 'assigned') return base + 'bg-success'
      if (s === 'completed') return base + 'bg-secondary'
      return base + 'bg-dark'
    }

    const openBidModal = (job: Job) => {
      activeJob.value = job
      bidAmount.value = job.price
      bidMessage.value = ''
      bidError.value = ''
    }

    const closeBidModal = () => {
      activeJob.value = null
      submitting.value = false
    }

    const submitBidForm = async () => {
      if (!activeJob.value || bidAmount.value === null || bidAmount.value < 0) {
        bidError.value = 'Unesite ispravan iznos.'
        return
      }
      submitting.value = true
      bidError.value = ''
      try {
        await new Promise<void>((resolve, reject) => {
          emit('submit-bid', {
            jobId: activeJob.value!.id,
            amount: bidAmount.value!,
            message: bidMessage.value,
            resolve,
            reject
          })
        })
        closeBidModal()
      } catch (err: any) {
        bidError.value = err?.response?.data?.message || 'Greška pri slanju ponude.'
        submitting.value = false
      }
    }

    return {
      activeJob,
      bidAmount,
      bidMessage,
      bidError,
      submitting,
      canBid,
      statusLabel,
      statusBadgeClass,
      openBidModal,
      closeBidModal,
      submitBidForm
    }
  }
})
</script>

<style scoped>
.jobs-table {
  margin-top: 20px;
}
.badge {
  padding: 5px 10px;
  border-radius: 4px;
}
.bid-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.bid-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
}
</style>
