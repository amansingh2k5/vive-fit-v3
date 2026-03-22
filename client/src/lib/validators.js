import { z } from 'zod';

export const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(60),
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export const resetSchema = z.object({
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match", path: ['confirmPassword'],
});

export const statsSchema = z.object({
  age:      z.coerce.number().min(13, 'Must be at least 13').max(100),
  heightCm: z.coerce.number().min(100, 'Enter height in cm').max(250),
  weightKg: z.coerce.number().min(30, 'Enter weight in kg').max(400),
});

export const prSchema = z.object({
  bench:       z.coerce.number().min(0, 'Cannot be negative').max(1000),
  squat:       z.coerce.number().min(0).max(1500),
  deadlift:    z.coerce.number().min(0).max(1500),
  ohp:         z.coerce.number().min(0).max(500),
  latPulldown: z.coerce.number().min(0).max(600),
});

export const goalSchema = z.object({
  goal: z.enum(['bulk', 'cut', 'recomp'], { required_error: 'Please select a goal' }),
});

// RPE: optional, must be 1-10 if provided, empty string OK
const rpeField = z.union([
  z.string().max(0),                              // empty string
  z.coerce.number().min(1, 'RPE 1-10').max(10),   // 1-10
  z.null(),
  z.undefined(),
]).optional();

export const setSchema = z.object({
  reps:   z.coerce.number().min(1, 'Min 1 rep').max(200),
  weight: z.coerce.number().min(0, 'Weight cannot be negative').max(2000),
  rpe:    rpeField,
});

export const exerciseSchema = z.object({
  name:        z.string().min(1, 'Exercise name required'),
  muscleGroup: z.enum(['chest','back','legs','shoulders','arms','core','cardio','other']),
  sets:        z.array(setSchema).min(1, 'Add at least one set'),
});

export const workoutSchema = z.object({
  date:      z.string(),
  exercises: z.array(exerciseSchema).min(1, 'Add at least one exercise'),
  notes:     z.string().max(1000).optional().or(z.literal('')),
});

export const weightLogSchema = z.object({
  weightKg: z.coerce.number().min(20, 'Min 20 kg').max(500, 'Max 500 kg'),
});
