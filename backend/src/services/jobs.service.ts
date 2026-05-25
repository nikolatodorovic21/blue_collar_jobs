import { Job, IJob } from '../models/job.model';

export const getAllJobs = async () => {
  return await Job.find();
};

export const getJobById = async (id: string) => {
  return await Job.findById(id);
};

export const createJob = async (jobData: IJob) => {
  const job = new Job(jobData);
  return await job.save();
};
