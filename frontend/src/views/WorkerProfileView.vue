<template>
  <div class="profile-view">
    <p v-if="loading">Učitavanje...</p>

    <template v-else-if="user">
      <div class="d-flex align-items-baseline gap-3 flex-wrap">
        <h1 class="mb-0">{{ user.name }}</h1>
        <span :class="roleBadgeClass">{{ roleLabel }}</span>
        <span class="rating-summary">
          <template v-if="user.rating.count > 0">
            ★ {{ user.rating.average?.toFixed(1) }}
            <span class="text-muted">({{ user.rating.count }})</span>
          </template>
          <span v-else class="text-muted">Bez ocena</span>
        </span>
      </div>

      <section v-if="user.role === 'worker'" class="mt-4">
        <h5>Veštine</h5>
        <div v-if="user.skills.length > 0" class="d-flex flex-wrap gap-2">
          <span v-for="skill in user.skills" :key="skill" class="skill-chip">{{ skill }}</span>
        </div>
        <p v-else class="text-muted">Nema unetih veština.</p>
      </section>

      <section class="mt-4">
        <h5>Recenzije</h5>
        <JobReviews :reviews="reviews" />
      </section>
    </template>

    <p v-else class="text-danger">Korisnik nije pronađen.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicUser, listReviews } from '@/services/api'
import JobReviews from '@/components/JobReviews.vue'
import type { PublicUser, Review } from '@/types'

const route = useRoute()
const user = ref<PublicUser | null>(null)
const reviews = ref<Review[]>([])
const loading = ref(true)

const userId = computed(() => route.params.id as string)

const roleLabel = computed(() => (user.value?.role === 'worker' ? 'Majstor' : 'Klijent'))
const roleBadgeClass = computed(() =>
  user.value?.role === 'worker' ? 'badge bg-primary' : 'badge bg-info text-dark'
)

const load = async () => {
  loading.value = true
  try {
    const [profileRes, reviewsRes] = await Promise.all([
      getPublicUser(userId.value),
      listReviews(userId.value)
    ])
    user.value = profileRes.data
    reviews.value = reviewsRes.data
  } catch (err: any) {
    if (err?.response?.status === 404) {
      user.value = null
    } else {
      console.error(err)
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(userId, load)
</script>

<style scoped>
.profile-view {
  padding: 20px;
}
.skill-chip {
  background: #f1f3f5;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.9rem;
}
.rating-summary {
  color: #f5a623;
  font-weight: 600;
}
.badge {
  padding: 5px 10px;
  border-radius: 4px;
}
</style>
