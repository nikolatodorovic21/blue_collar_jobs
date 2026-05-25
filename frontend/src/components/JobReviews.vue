<template>
  <div v-for="review in reviews" :key="review.id">
    <p>{{ review.comment }} - {{ review.rating }}/5</p>
  </div>
</template>

<script setup>
defineProps({
  reviews: Array
});
</script>