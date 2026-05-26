<template>
  <div class="review-modal-backdrop" @click.self="$emit('cancel')">
    <div class="review-modal">
      <h5>Ostavi recenziju</h5>
      <p class="text-muted">Posao: {{ jobType }} — ocenjujete: {{ revieweeName }}</p>
      <form @submit.prevent="onSubmit">
        <div class="mb-3">
          <label class="form-label d-block">Ocena</label>
          <div class="rating-picker">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="star-btn"
              :class="{ active: n <= rating }"
              @click="rating = n"
              :aria-label="`${n} ${n === 1 ? 'zvezda' : 'zvezde'}`"
            >★</button>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Komentar (opciono)</label>
          <textarea
            v-model="comment"
            rows="4"
            maxlength="1000"
            class="form-control"
            placeholder="Kratak osvrt na saradnju"
          ></textarea>
        </div>
        <p v-if="error" class="text-danger">{{ error }}</p>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
            Otkaži
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Šaljem...' : 'Pošalji recenziju' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  jobType: string
  revieweeName: string
  submitting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'confirm', payload: { rating: number; comment: string }): void
  (e: 'cancel'): void
}>()

const rating = ref(5)
const comment = ref('')

const onSubmit = () => {
  if (rating.value < 1 || rating.value > 5) return
  emit('confirm', { rating: rating.value, comment: comment.value.trim() })
}
</script>

<style scoped>
.review-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
}
.review-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
}
.rating-picker {
  display: flex;
  gap: 4px;
}
.star-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #ccc;
  padding: 0 4px;
  cursor: pointer;
  line-height: 1;
}
.star-btn.active {
  color: #f5a623;
}
.star-btn:focus {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
}
</style>
