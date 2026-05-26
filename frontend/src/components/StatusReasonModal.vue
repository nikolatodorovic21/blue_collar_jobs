<template>
  <div class="reason-modal-backdrop" @click.self="$emit('cancel')">
    <div class="reason-modal">
      <h5>{{ title }}</h5>
      <p v-if="description" class="text-muted">{{ description }}</p>
      <form @submit.prevent="onSubmit">
        <div class="mb-3">
          <label class="form-label">Razlog</label>
          <textarea
            v-model="reason"
            rows="3"
            class="form-control"
            :placeholder="placeholder"
            :minlength="minLength"
            required
          ></textarea>
        </div>
        <p v-if="error" class="text-danger">{{ error }}</p>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
            Otkaži
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Šaljem...' : confirmLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  placeholder?: string
  confirmLabel?: string
  minLength?: number
  submitting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const reason = ref('')

const onSubmit = () => {
  const trimmed = reason.value.trim()
  if (!trimmed) return
  if (props.minLength && trimmed.length < props.minLength) return
  emit('confirm', trimmed)
}
</script>

<style scoped>
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
