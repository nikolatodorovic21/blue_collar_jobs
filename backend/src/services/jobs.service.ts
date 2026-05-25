import { Job, IJob } from '../models/job.model';

export const getAllJobs = async () => {
  return await Job.find();
};

export const createJob = async (jobData: IJob) => {
  const job = new Job(jobData);
  return await job.save();
};

export const takeJob = async (id: string, userId: string) => {
  return await Job.findByIdAndUpdate(
    id,
    { taken: true, userId },
    { new: true }
  );
};