<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClassroomFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true) . ' Turma',
            'description' => $this->faker->sentence(),
            'meeting_day' => $this->faker->randomElement(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']),
            'meeting_time' => $this->faker->time('H:i'),
            'is_active' => false,
        ];
    }
}
