<template>
  <div class="jobs-table">
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Vrsta posla</th>
          <th>Cena</th>
          <th>Lokacija</th>
          <th>Status</th>
          <th>Akcija</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="job in jobs" :key="job.id">
          <td>{{ job.id }}</td>
          <td>{{ job.type }}</td>
          <td>{{ job.price }} RSD</td>
          <td>{{ job.location }}</td>
          <td>
            <span v-if="job.taken" class="badge bg-success">Preuzeto</span>
            <span v-else class="badge bg-warning text-dark">Slobodno</span>
          </td>
          <td>
            <button
              v-if="canTake(job)"
              @click="takeJob(job.id)"
              class="btn btn-sm btn-primary"
            >
              Preuzmi
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'JobsTable',
  props: {
    jobs: {
      type: Array as () => Array<{
        id: string
        type: string
        price: number
        location: string
        taken: boolean
        userId: string | null
      }>,
      required: true
    },
    showTakeButton: {
      type: Boolean,
      default: true
    },
    currentUserRole: {
      type: String,
      default: ''
    },
    currentUserId: {
      type: String,
      default: ''
    }
  },
  emits: ['take-job'], // Eksplicitno definišemo emitovane događaje
  methods: {
    canTake(job: { taken: boolean; userId: string | null }) {
      return (
        this.showTakeButton &&
        !job.taken &&
        this.currentUserRole === 'worker' &&
        job.userId !== this.currentUserId
      )
    },
    takeJob(jobId: string) {
      console.log('Emitting take-job event with id:', jobId)
      this.$emit('take-job', jobId)
    }
  }
})
</script>

<style scoped>
.jobs-table {
  margin-top: 20px;
}
.badge {
  padding: 5px 10px;
  border-radius: 4px;
}
</style>