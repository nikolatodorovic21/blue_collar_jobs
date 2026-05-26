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
            <th>Datum dolaska</th>
            <th>Trajanje</th>
            <th>Poruka</th>
            <th>Status ponude</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bid in myBids" :key="bid.id">
            <td>
              <router-link
                v-if="bidJob(bid)"
                :to="`/jobs/${typeof bid.jobId === 'object' ? bid.jobId.id : ''}/bids`"
              >
                {{ bidJob(bid)?.type }}
              </router-link>
              <span v-else>—</span>
            </td>
            <td>{{ bidJob(bid)?.location || '—' }}</td>
            <td>{{ bid.amount }} RSD</td>
            <td>{{ formatDate(bid.proposedDate) }}</td>
            <td>{{ formatDuration(bid.estimatedDuration) }}</td>
            <td>{{ bid.message || '—' }}</td>
            <td>
              <span :class="bidStatusBadge(bid.status)">{{ bidStatusLabel(bid.status) }}</span>
              <span v-if="isEdited(bid.createdAt, bid.updatedAt)" class="text-muted ms-1">(uređeno)</span>
            </td>
            <td>
              <div class="d-flex flex-wrap gap-1">
                <button
                  v-if="bid.status === 'pending'"
                  class="btn btn-sm btn-outline-secondary"
                  @click="openEdit(bid)"
                >
                  Izmeni
                </button>
                <button
                  v-if="bid.status === 'pending'"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="busyBidId === bid.id"
                  @click="onWithdraw(bid)"
                >
                  {{ busyBidId === bid.id ? '…' : 'Povuci' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="editingBid" class="reason-modal-backdrop" @click.self="closeEdit">
        <div class="reason-modal">
          <h5>Izmeni ponudu</h5>
          <form @submit.prevent="onSubmitEdit">
            <div class="mb-3">
              <label class="form-label">Iznos (RSD)</label>
              <input v-model.number="editAmount" type="number" min="0" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Datum dolaska (opciono)</label>
              <input v-model="editProposedDate" type="date" :min="todayIso" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Procenjeno trajanje (opciono)</label>
              <div class="d-flex gap-2">
                <input v-model.number="editDurationValue" type="number" min="0" class="form-control" />
                <select v-model="editDurationUnit" class="form-select" style="max-width: 140px">
                  <option value="hours">sati</option>
                  <option value="days">dana</option>
                </select>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Poruka (opciono)</label>
              <textarea v-model="editMessage" rows="3" class="form-control"></textarea>
            </div>
            <p v-if="editError" class="text-danger">{{ editError }}</p>
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" @click="closeEdit">Otkaži</button>
              <button type="submit" class="btn btn-primary" :disabled="editSubmitting">
                {{ editSubmitting ? 'Šaljem...' : 'Sačuvaj' }}
              </button>
            </div>
          </form>
        </div>
      </div>
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
        @cancel-job="onCancelJob"
      />

      <StatusReasonModal
        v-if="cancelTarget"
        title="Otkaži posao"
        :description="`Posao: ${cancelTarget.type}`"
        placeholder="Zašto otkazujete posao?"
        confirm-label="Otkaži posao"
        :min-length="1"
        :submitting="cancelSubmitting"
        :error="cancelError"
        @confirm="submitCancel"
        @cancel="cancelTarget = null"
      />
    </template>

    <p v-else class="text-muted">Niste prijavljeni.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import JobsTable from '@/components/JobsTable.vue'
import StatusReasonModal from '@/components/StatusReasonModal.vue'
import {
  editBid as apiEditBid,
  getJobs,
  getMyBids,
  updateJobStatus,
  withdrawBid
} from '@/services/api'
import { authService } from '@/services/auth.service'
import type { Bid, DurationUnit, Job } from '@/types'
import { formatDate, formatDuration, isEdited } from '@/utils/format'
import { bidStatusBadge, bidStatusLabel } from '@/utils/statusLabels'

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

const openBids = (jobId: string) => {
  router.push(`/jobs/${jobId}/bids`)
}

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const reloadBids = async () => {
  const response = await getMyBids()
  myBids.value = response.data
}

const reloadJobs = async () => {
  const response = await getJobs()
  allJobs.value = response.data
}

// --- Withdraw ---
const busyBidId = ref<string | null>(null)
const onWithdraw = async (bid: Bid) => {
  if (!confirm('Sigurno povlačite ovu ponudu?')) return
  busyBidId.value = bid.id
  try {
    await withdrawBid(bid.id)
    await reloadBids()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Greška pri povlačenju ponude.')
  } finally {
    busyBidId.value = null
  }
}

// --- Edit ---
const editingBid = ref<Bid | null>(null)
const editAmount = ref<number | null>(null)
const editMessage = ref('')
const editProposedDate = ref('')
const editDurationValue = ref<number | null>(null)
const editDurationUnit = ref<DurationUnit>('hours')
const editError = ref('')
const editSubmitting = ref(false)

const openEdit = (bid: Bid) => {
  editingBid.value = bid
  editAmount.value = bid.amount
  editMessage.value = bid.message || ''
  editProposedDate.value = bid.proposedDate
    ? new Date(bid.proposedDate).toISOString().slice(0, 10)
    : ''
  editDurationValue.value = bid.estimatedDuration?.value ?? null
  editDurationUnit.value = bid.estimatedDuration?.unit ?? 'hours'
  editError.value = ''
}

const closeEdit = () => {
  editingBid.value = null
  editSubmitting.value = false
}

const onSubmitEdit = async () => {
  if (!editingBid.value || editAmount.value === null || editAmount.value < 0) {
    editError.value = 'Unesite ispravan iznos.'
    return
  }
  editSubmitting.value = true
  editError.value = ''
  const patch: Record<string, unknown> = {
    amount: editAmount.value,
    message: editMessage.value
  }
  if (editProposedDate.value) {
    patch.proposedDate = new Date(editProposedDate.value).toISOString()
  }
  if (editDurationValue.value !== null && editDurationValue.value >= 0) {
    patch.estimatedDuration = {
      value: editDurationValue.value,
      unit: editDurationUnit.value
    }
  }
  try {
    await apiEditBid(editingBid.value.id, patch as any)
    await reloadBids()
    closeEdit()
  } catch (err: any) {
    editError.value = err?.response?.data?.message || 'Greška pri čuvanju.'
    editSubmitting.value = false
  }
}

// --- Cancel job (client side) ---
const cancelTarget = ref<Job | null>(null)
const cancelSubmitting = ref(false)
const cancelError = ref('')

const onCancelJob = (job: Job) => {
  cancelTarget.value = job
  cancelError.value = ''
}

const submitCancel = async (reason: string) => {
  if (!cancelTarget.value) return
  cancelSubmitting.value = true
  try {
    await updateJobStatus(cancelTarget.value.id, { status: 'cancelled', reason })
    cancelTarget.value = null
    await reloadJobs()
  } catch (err: any) {
    cancelError.value = err?.response?.data?.message || 'Greška pri otkazivanju.'
  } finally {
    cancelSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    if (currentUser.value?.role === 'worker' && currentUser.value.id) {
      await reloadBids()
    } else if (currentUser.value?.role === 'client') {
      await reloadJobs()
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
.reason-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
}
.reason-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
}
</style>
