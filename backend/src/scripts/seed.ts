/// <reference types="node" />
import 'dotenv/config';
import mongoose from 'mongoose';
import { createUser } from '../services/users.service';
import { createJob } from '../services/jobs.service';

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await mongoose.connection.dropDatabase();
  console.log('Database dropped');

  const client = await createUser({
    email: 'klijent@test.com',
    password: 'lozinka123',
    name: 'Klijent Test',
    role: 'client',
    skills: []
  });
  console.log(`Client created: ${client.email} (${client._id})`);

  const worker = await createUser({
    email: 'majstor@test.com',
    password: 'lozinka123',
    name: 'Majstor Test',
    role: 'worker',
    skills: ['keramika']
  });
  console.log(`Worker created: ${worker.email} (${worker._id})`);

  const job = await createJob({
    type: 'keramika',
    price: 15000,
    location: 'Novi Sad',
    description: 'Postavljanje keramike u kupatilu (~6 m2)',
    status: 'open',
    userId: client._id as any
  });
  console.log(`Job created: ${job.type} (${job._id}), status=${job.status}`);

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
