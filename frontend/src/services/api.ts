import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Job endpoints
export const getJobs = () => api.get('/jobs');
export const getJobById = (id: string) => api.get(`/jobs/${id}`);
export const addJob = (jobData: any) => api.post('/jobs', jobData);
export const takeJob = (id: string, userId: string, role: string) => {
  return api.patch(`/jobs/${id}`, {
    taken: true,
    userId,
    role
  });
};
export const getTakenJobs = () => api.get('/jobs?taken=true');

// Error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export default api;
