<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3 class="text-center">Prijava</h3>
          </div>
          <div class="card-body">
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Email adresa</label>
                <input 
                  v-model="email"
                  type="email" 
                  class="form-control" 
                  id="email"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Lozinka</label>
                <input 
                  v-model="password"
                  type="password" 
                  class="form-control" 
                  id="password"
                  required
                >
              </div>
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                <span v-if="loading">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Prijavljivanje...
                </span>
                <span v-else>Prijavi se</span>
              </button>
              <div v-if="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
            </form>
            <div class="mt-3 text-center">
              Nemate nalog? <router-link to="/register">Registrujte se</router-link>
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
import { authService } from '@/services/auth.service'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''

    await authService.login(email.value, password.value)
    router.push('/')

  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Došlo je do greške pri prijavi'
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