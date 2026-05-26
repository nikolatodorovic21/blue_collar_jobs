<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3 class="text-center">Registracija</h3>
          </div>
          <div class="card-body">
            <form @submit.prevent="handleRegister">
              <div class="mb-3">
                <label for="name" class="form-label">Ime i prezime</label>
                <input 
                  v-model="form.name"
                  type="text" 
                  class="form-control" 
                  id="name"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="email" class="form-label">Email adresa</label>
                <input 
                  v-model="form.email"
                  type="email" 
                  class="form-control" 
                  id="email"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Lozinka</label>
                <input 
                  v-model="form.password"
                  type="password" 
                  class="form-control" 
                  id="password"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="role" class="form-label">Tip naloga</label>
                <select 
                  v-model="form.role"
                  class="form-select" 
                  id="role"
                  required
                >
                  <option value="client">Klijent</option>
                  <option value="worker">Majstor</option>
                </select>
              </div>
              <div v-if="form.role === 'worker'" class="mb-3">
                <label class="form-label">Vrste usluga (Ctrl+klik za više izbora)</label>
                <select
                  v-model="form.skills"
                  class="form-select"
                  multiple
                >
                  <option v-for="t in JOB_TYPES" :key="t" :value="t">{{ jobTypeLabel(t) }}</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                <span v-if="loading">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Registracija...
                </span>
                <span v-else>Registruj se</span>
              </button>
              <div v-if="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
            </form>
            <div class="mt-3 text-center">
              Već imate nalog? <router-link to="/login">Prijavite se</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService, type RegisterData } from '@/services/auth.service'
import { JOB_TYPES, jobTypeLabel } from '@/constants/jobTypes'

const router = useRouter()

const form = ref<RegisterData>({
  name: '',
  email: '',
  password: '',
  role: 'client',
  skills: []
})

const error = ref('')
const loading = ref(false)

const handleRegister = async () => {
  try {
    loading.value = true
    error.value = ''

    await authService.register(form.value)
    router.push('/')

  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Došlo je do greške pri registraciji'
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