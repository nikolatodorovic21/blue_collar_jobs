<template>
  <div class="home">
    <h1>Svi Poslovi</h1>

    <form class="filter-bar mb-3" @submit.prevent="applyFilters">
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label small">Kategorija</label>
          <select v-model="draft.type" class="form-select">
            <option value="">Sve kategorije</option>
            <option v-for="t in JOB_TYPES" :key="t" :value="t">
              {{ jobTypeLabel(t) }}
            </option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label small">Lokacija</label>
          <input v-model="draft.location" type="text" class="form-control" placeholder="npr. Novi Sad" />
        </div>
        <div class="col-md-2">
          <label class="form-label small">Cena od</label>
          <input v-model.number="draft.priceMin" type="number" min="0" class="form-control" />
        </div>
        <div class="col-md-2">
          <label class="form-label small">Cena do</label>
          <input v-model.number="draft.priceMax" type="number" min="0" class="form-control" />
        </div>
        <div class="col-md-2 d-flex align-items-end gap-2">
          <button type="submit" class="btn btn-primary flex-fill">Primeni</button>
          <button type="button" class="btn btn-outline-secondary" @click="resetFilters">
            Resetuj
          </button>
        </div>
      </div>
    </form>

    <p v-if="loading">Učitavanje...</p>
    <p v-else-if="filterError" class="text-danger">{{ filterError }}</p>
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

    <div v-if="nextCursor" class="text-center mt-3">
      <button class="btn btn-outline-primary" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Učitavam...' : 'Učitaj još' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JobsTable from '@/components/JobsTable.vue'
import { getJobs, submitBid, type GetJobsQuery } from '@/services/api'
import { authService } from '@/services/auth.service'
import type { EstimatedDuration, Job, JobType } from '@/types'
import { JOB_TYPES, jobTypeLabel } from '@/constants/jobTypes'

interface DraftFilters {
  type: '' | JobType
  location: string
  priceMin: number | null
  priceMax: number | null
}

const route = useRoute()
const router = useRouter()
const currentUser = ref(authService.getCurrentUser())

const items = ref<Job[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)
const filterError = ref('')

const hydrateFromQuery = (): DraftFilters => ({
  type: (route.query.type as JobType) || '',
  location: (route.query.location as string) || '',
  priceMin: route.query.priceMin ? Number(route.query.priceMin) : null,
  priceMax: route.query.priceMax ? Number(route.query.priceMax) : null
})

const draft = reactive<DraftFilters>(hydrateFromQuery())

const buildParams = (cursor?: string): GetJobsQuery => {
  const params: GetJobsQuery = { status: 'open' }
  if (draft.type) params.type = draft.type
  if (draft.location.trim()) params.location = draft.location.trim()
  if (draft.priceMin != null && !Number.isNaN(draft.priceMin)) params.priceMin = draft.priceMin
  if (draft.priceMax != null && !Number.isNaN(draft.priceMax)) params.priceMax = draft.priceMax
  if (cursor) params.cursor = cursor
  return params
}

const availableJobs = computed(() =>
  items.value.filter((job) => job.userId !== currentUser.value?.id)
)

const fetchPage = async (cursor?: string) => {
  filterError.value = ''
  try {
    const res = await getJobs(buildParams(cursor))
    if (cursor) {
      items.value = [...items.value, ...res.data.items]
    } else {
      items.value = res.data.items
    }
    nextCursor.value = res.data.nextCursor
  } catch (err: any) {
    filterError.value = err?.response?.data?.message || 'Greška pri učitavanju poslova.'
    if (!cursor) items.value = []
    nextCursor.value = null
  }
}

const loadFirstPage = async () => {
  loading.value = true
  try {
    await fetchPage()
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!nextCursor.value) return
  loadingMore.value = true
  try {
    await fetchPage(nextCursor.value)
  } finally {
    loadingMore.value = false
  }
}

const syncQueryString = () => {
  const query: Record<string, string> = {}
  if (draft.type) query.type = draft.type
  if (draft.location.trim()) query.location = draft.location.trim()
  if (draft.priceMin != null && !Number.isNaN(draft.priceMin)) query.priceMin = String(draft.priceMin)
  if (draft.priceMax != null && !Number.isNaN(draft.priceMax)) query.priceMax = String(draft.priceMax)
  router.replace({ query })
}

const applyFilters = async () => {
  syncQueryString()
  await loadFirstPage()
}

const resetFilters = async () => {
  draft.type = ''
  draft.location = ''
  draft.priceMin = null
  draft.priceMax = null
  syncQueryString()
  await loadFirstPage()
}

// Hydrate again if the user navigates with new query params (e.g. via back/forward).
watch(
  () => route.query,
  (q, prev) => {
    if (JSON.stringify(q) === JSON.stringify(prev)) return
    Object.assign(draft, hydrateFromQuery())
    loadFirstPage()
  }
)

onMounted(loadFirstPage)

const handleSubmitBid = async (payload: {
  jobId: string
  amount: number
  message: string
  proposedDate?: string
  estimatedDuration?: EstimatedDuration
  resolve: () => void
  reject: (e: unknown) => void
}) => {
  try {
    await submitBid(payload.jobId, {
      amount: payload.amount,
      message: payload.message,
      proposedDate: payload.proposedDate,
      estimatedDuration: payload.estimatedDuration
    })
    payload.resolve()
    alert('Ponuda je uspešno poslata.')
    await loadFirstPage()
  } catch (err) {
    payload.reject(err)
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
}
.filter-bar .form-label.small {
  margin-bottom: 2px;
}
</style>
