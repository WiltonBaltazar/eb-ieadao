<?php

namespace Database\Factories;

use App\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudySessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'classroom_id' => Classroom::factory(),
            'title' => 'Lição ' . $this->faker->numberBetween(1, 50) . ' — ' . $this->faker->sentence(3),
            'session_date' => $this->faker->dateTimeBetween('-30 days', '+30 days')->format('Y-m-d'),
            'status' => 'draft',
            'lesson_type' => $this->faker->randomElement(['Bíblica', 'Prática', 'Mista']),
            'notes' => null,
            'attendance_opened_at' => null,
            'attendance_closed_at' => null,
            'check_in_code' => null,
            'check_in_code_generated_at' => null,
            'check_in_code_expires_at' => null,
        ];
    }
}
