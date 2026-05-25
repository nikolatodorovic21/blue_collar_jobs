import api from './api';

export const JobsService = {
  async getAllJobs() {
    const response = await api.get('/jobs');
    return response.data;
  },

  startPolling(callback: (jobs: any[]) => void, interval = 5000) {
    const fetchData = async () => {
      const jobs = await this.getAllJobs();
      callback(jobs);
    };

    const pollId = setInterval(fetchData, interval);
    fetchData();

    return () => clearInterval(pollId);
  }
};
