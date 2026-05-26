<template>
  <div class="job-reviews">
    <p v-if="reviews.length === 0" class="text-muted">Još uvek nema recenzija.</p>
    <div v-else class="d-flex flex-column gap-3">
      <div v-for="r in reviews" :key="r.id" class="review-card">
        <div class="d-flex justify-content-between align-items-baseline">
          <div>
            <router-link
              v-if="reviewerId(r)"
              :to="`/users/${reviewerId(r)}`"
              class="fw-semibold"
            >
              {{ reviewerName(r) }}
            </router-link>
            <span v-else class="fw-semibold">{{ reviewerName(r) }}</span>
            <span class="text-muted ms-2">— {{ jobType(r) }}</span>
          </div>
          <span class="text-muted small">{{ formatDate(r.createdAt) }}</span>
        </div>
        <div class="rating mt-1">{{ stars(r.rating) }}</div>
        <p v-if="r.comment" class="mb-0 mt-1">{{ r.comment }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Review } from '@/types'
import { formatDate } from '@/utils/format'
import { jobTypeLabel } from '@/constants/jobTypes'

defineProps({
  reviews: {
    type: Array as PropType<Review[]>,
    required: true
  }
})

const reviewerName = (r: Review) =>
  typeof r.reviewerId === 'object' ? r.reviewerId.name : 'Korisnik'

const reviewerId = (r: Review): string | null =>
  typeof r.reviewerId === 'object' ? r.reviewerId.id : r.reviewerId || null

const jobType = (r: Review) =>
  typeof r.jobId === 'object' ? jobTypeLabel(r.jobId.type) : '—'

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))
</script>

<style scoped>
.review-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 16px;
}
.rating {
  color: #f5a623;
  font-size: 1.1rem;
  letter-spacing: 2px;
}
</style>
