<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
      <router-link to="/" class="navbar-brand">Poslovi</router-link>
      <button 
        class="navbar-toggler" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarNav"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <router-link to="/" class="nav-link" active-class="active">Početna</router-link>
          </li>
          <li v-if="user" class="nav-item">
            <router-link to="/jobs" class="nav-link" active-class="active">
              {{ user.role === 'worker' ? 'Moje ponude' : 'Moji poslovi i ponude' }}
            </router-link>
          </li>
          <li v-if="user?.role === 'client'" class="nav-item">
            <router-link to="/post-job" class="nav-link" active-class="active">Postavi posao</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/about" class="nav-link" active-class="active">O nama</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/contact" class="nav-link" active-class="active">Kontakt</router-link>
          </li>
        </ul>
        
        <!-- Login/Register ili User info -->
        <div class="d-flex" v-if="!user">
          <router-link to="/login" class="btn btn-outline-light me-2">Login</router-link>
          <router-link to="/register" class="btn btn-primary">Register</router-link>
        </div>
        <div v-else class="d-flex align-items-center">
          <span class="text-light me-3">{{ user.name }}</span>
          <button @click="logout" class="btn btn-outline-light">Logout</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '@/services/auth.service';

interface User {
  id: string;
  name: string;
  role: 'worker' | 'client';
}

export default defineComponent({
  name: 'NavBar',
  setup() {
    const router = useRouter();
    const user = ref<User | null>(null);

    // Funkcija za čitanje korisnika iz localStorage
    const readUserFromStorage = (): User | null => {
      return authService.getCurrentUser() as User | null;
    };

    // Osvežava korisničke podatke
    const updateUser = () => {
      user.value = readUserFromStorage();
    };

    // Pratimo promene rute
    watch(() => router.currentRoute.value, updateUser);

    // Pratimo promene u localStorage iz drugih tabova/prozora
    const storageEventListener = (event: StorageEvent) => {
      if (event.key === 'user') {
        updateUser();
      }
    };

    onMounted(() => {
      // Inicijalno učitavanje korisnika
      updateUser();
      
      // Dodajemo listener za promene u localStorage
      window.addEventListener('storage', storageEventListener);
    });

    onUnmounted(() => {
      // Uklanjamo listener kada se komponenta unmountuje
      window.removeEventListener('storage', storageEventListener);
    });

    const logout = async () => {
      await authService.logout();
      user.value = null;
      router.push('/login');
    };

    return { 
      user,
      logout 
    };
  }
});
</script>

<style scoped>
.navbar {
  padding: 0.8rem 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-outline-light:hover {
  color: #333;
  background-color: #f8f9fa;
}

.navbar-brand {
  font-weight: 600;
  font-size: 1.2rem;
}

/* Dodatni stil za aktivne linkove */
.router-link-active {
  font-weight: 500;
}
</style>