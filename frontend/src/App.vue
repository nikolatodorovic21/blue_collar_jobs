<template>
  <div id="app">
    <NavBar />
    <main class="container mt-3">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { authService } from '@/services/auth.service'

export default defineComponent({
  name: 'App',
  components: {
    NavBar
  },
  setup() {
    onMounted(async () => {
      if (authService.getCurrentUser()) {
        await authService.me()
      }
    })
  }
})
</script>
