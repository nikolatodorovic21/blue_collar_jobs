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
            <span :class="jobStatusBadge(job.status)">{{ jobStatusLabel(job.status) }}</span>
          </td>
          <td>
            <div class="d-flex flex-wrap gap-2">
              <button
                v-if="canBid(job)"
                @click="openBidModal(job)"
                class="btn btn-sm btn-primary"
              >
                Postavi ponudu
              </button>
              <button
                v-if="showBidsLink && job.userId === currentUserId"
                @click="$emit('view-bids', job.id)"
                class="btn btn-sm btn-outline-primary"
              >
                Vidi ponude
              </button>
              <button
                v-if="canCancelOpen(job)"
                @click="$emit('cancel-job', job)"
                class="btn btn-sm btn-outline-danger"
              >
                Otkaži posao
              </button>
            </div>
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
            <label class="form-label">Datum dolaska (opciono)</label>
            <input
              v-model="bidProposedDate"
              type="date"
              :min="todayIso"
              class="form-control"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Procenjeno trajanje (opciono)</label>
            <div class="d-flex gap-2">
              <input
                v-model.number="bidDurationValue"
                type="number"
                min="0"
                class="form-control"
                placeholder="npr. 4"
              />
              <select v-model="bidDurationUnit" class="form-select" style="max-width: 140px">
                <option value="hours">sati</option>
                <option value="days">dana</option>
              </select>
            </div>
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
import { computed, defineComponent, PropType, ref } from 'vue'
import type { DurationUnit, Job } from '@/types'
import { jobStatusBadge, jobStatusLabel } from '@/utils/statusLabels'

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
  emits: ['submit-bid', 'view-bids', 'cancel-job'],
  setup(props, { emit }) {
    const activeJob = ref<Job | null>(null)
    const bidAmount = ref<number | null>(null)
    const bidMessage = ref('')
    const bidProposedDate = ref('')
    const bidDurationValue = ref<number | null>(null)
    const bidDurationUnit = ref<DurationUnit>('hours')
    const bidError = ref('')
    const submitting = ref(false)

    const todayIso = computed(() => new Date().toISOString().slice(0, 10))

    const isExpired = (job: Job) =>
      !!job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now()

    const canBid = (job: Job) =>
      props.currentUserRole === 'worker' &&
      job.userId !== props.currentUserId &&
      job.status === 'open' &&
      !isExpired(job)

    const canCancelOpen = (job: Job) =>
      props.currentUserRole === 'client' &&
      job.userId === props.currentUserId &&
      job.status === 'open'

    const openBidModal = (job: Job) => {
      activeJob.value = job
      bidAmount.value = job.price
      bidMessage.value = ''
      bidProposedDate.value = ''
      bidDurationValue.value = null
      bidDurationUnit.value = 'hours'
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
          const base: Record<string, unknown> = {
            jobId: activeJob.value!.id,
            amount: bidAmount.value!,
            message: bidMessage.value,
            resolve,
            reject
          }
          if (bidProposedDate.value) {
            base.proposedDate = new Date(bidProposedDate.value).toISOString()
          }
          if (bidDurationValue.value !== null && bidDurationValue.value >= 0) {
            base.estimatedDuration = {
              value: bidDurationValue.value,
              unit: bidDurationUnit.value
            }
          }
          emit('submit-bid', base)
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
      bidProposedDate,
      bidDurationValue,
      bidDurationUnit,
      bidError,
      submitting,
      todayIso,
      canBid,
      canCancelOpen,
      jobStatusLabel,
      jobStatusBadge,
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
