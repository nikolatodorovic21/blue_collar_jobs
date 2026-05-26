<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card">
          <div class="card-header">
            <h3 class="text-center">Postavi posao</h3>
          </div>
          <div class="card-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="type" class="form-label">Vrsta posla</label>
                <select
                  v-model="form.type"
                  class="form-select"
                  id="type"
                  required
                >
                  <option value="" disabled>Izaberite vrstu</option>
                  <option v-for="t in JOB_TYPES" :key="t" :value="t">{{ jobTypeLabel(t) }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="price" class="form-label">Cena (RSD)</label>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  class="form-control"
                  id="price"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="location" class="form-label">Lokacija</label>
                <input
                  v-model="form.location"
                  type="text"
                  class="form-control"
                  id="location"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="description" class="form-label">Opis posla</label>
                <textarea
                  v-model="form.description"
                  class="form-control"
                  id="description"
                  rows="4"
                  required
                ></textarea>
              </div>
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                <span v-if="loading">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Postavljanje...
                </span>
                <span v-else>Postavi</span>
              </button>
              <div v-if="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { addJob } from '@/services/api'
import { authService } from '@/services/auth.service'
import { JOB_TYPES, jobTypeLabel, type JobType } from '@/constants/jobTypes'

const router = useRouter()

const form = ref<{
  type: '' | JobType
  price: number
  location: string
  description: string
}>({
  type: '',
  price: 0,
  location: '',
  description: ''
})

const error = ref('')
const loading = ref(false)

onMounted(() => {
  const user = authService.getCurrentUser()
  if (user?.role !== 'client') {
    router.push('/')
  }
})

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = ''

    if (!form.value.type) {
      error.value = 'Izaberite vrstu posla'
      return
    }
    await addJob({
      type: form.value.type,
      price: form.value.price,
      location: form.value.location,
      description: form.value.description
    })

    router.push('/')

  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Došlo je do greške pri postavljanju'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card {
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
