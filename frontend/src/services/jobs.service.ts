import api from './api';

export const JobsService = {
  async getAllJobs() {
    const response = await api.get('/jobs');
    return response.data;
  },

  async getAvailableJobs() {
    const response = await api.get('/jobs?taken=false');
    return response.data;
  },

  async getUserJobs(userId: number) {
    const response = await api.get(`/jobs?userId=${userId}&taken=true`);
    return response.data;
  },

  async takeJob(id: number, userId: number) {
    const response = await api.patch(`/jobs/${id}`, { 
      taken: true, 
      userId 
    });
    return response.data;
  },

  startPolling(callback: (jobs: any[]) => void, interval = 5000) {
    const fetchData = async () => {
      const jobs = await this.getAllJobs();
      callback(jobs);
    };
    
    const pollId = setInterval(fetchData, interval);
    fetchData(); // Odmah učitaj podatke
    
    return () => clearInterval(pollId);
  }
};